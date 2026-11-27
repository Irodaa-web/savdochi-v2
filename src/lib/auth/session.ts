import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { connectDb } from "@/lib/db";
import { effectivePlan, PLANS, type PlanCode } from "@/lib/plans";
import type { RegionCode } from "@/lib/regions";
import type { StaffRole } from "@/lib/staff";
import { Staff } from "@/models/Staff";
import { User, type Verification } from "@/models/User";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signToken, verifyToken, type Role } from "./token";

export type SessionUser = {
  id: string;
  role: Role;
  name: string;
  phone: string;
  region: RegionCode;
  verification: Verification;
  isAdmin: boolean;
  demo: boolean;
  /** Pullik tarif tugash sanasi: null — muddatsiz yoki bepul. */
  subscriptionUntil: string | null;
  /** Kompaniyaning amaldagi tarifi (muddati tugagan pullik tarif — "free"). Do'konlar uchun ahamiyatsiz. */
  plan: PlanCode;
  /** Amaldagi tarif — ro'yxatdan o'tgandagi bepul sinov. */
  planTrial: boolean;
  /** Hisob rasmi (kompaniya logotipi / do'kon rasmi). "" — yo'q. */
  logo: string;
  /** Kompaniya xodimi kirgan bo'lsa: kim va qanday rolda. null — hisob egasi. */
  staff: { id: string; name: string; role: StaffRole } | null;
};

function adminPhones(): Set<string> {
  return new Set(
    (process.env.ADMIN_PHONES ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
  );
}

async function readToken(): Promise<string | undefined> {
  const auth = (await headers()).get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/**
 * Joriy foydalanuvchi. Bir so'rov ichida bir marta bazaga murojaat qiladi.
 * Bloklangan, nofaol (15 kun kirilmagan) yoki paroli o'zgargan hisob tokeni rad etiladi.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const payload = await verifyToken(await readToken());
  if (!payload) return null;
  // Har sahifa bazaga alohida bormasligi uchun: qisqa muddatli xotira (bloklash/parol almashtirish ≤20 s da kuchga kiradi).
  const key = payload.st ? `${payload.sub}:staff:${payload.st}:${payload.v}` : `${payload.sub}:${payload.v}`;
  const hit = sessionCache.get(key);
  if (hit && hit.until > Date.now()) return hit.user;
  await connectDb();
  const [user, staff] = await Promise.all([
    User.findById(payload.sub).lean(),
    payload.st ? Staff.findOne({ _id: payload.st, company: payload.sub }).lean() : null,
  ]);
  // Xodim: kompaniya hisobi faol bo'lishi, xodim bloklanmagan va sessiyasi eskirmagan bo'lishi kerak.
  const valid = payload.st
    ? user && user.role === "seller" && !user.blocked && !user.inactive && !user.demo && staff && !staff.blocked && staff.authVersion === payload.v
    : user && !user.blocked && !user.inactive && user.authVersion === payload.v;
  if (!user || !valid || (staff && !(await staffSeatOk(user, staff)))) {
    sessionCache.delete(key);
    return null;
  }
  // Faollik: sessiya ishlatilsa ham hisob faol hisoblanadi (15 kunlik nofaollik — lib/inactivity).
  // Bazaga yozish ko'pi bilan har ACTIVITY_REFRESH_MS da bir marta; o'qish allaqachon yuklangan hujjatdan.
  const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
  // Xodim ishlasa — kompaniya ham faol hisoblanadi (ega kirmasa ham hisob nofaol bo'lib qolmaydi).
  if (Date.now() - lastActive > ACTIVITY_REFRESH_MS) touchLater(user._id);
  if (staff && Date.now() - (staff.lastActiveAt ? new Date(staff.lastActiveAt).getTime() : 0) > ACTIVITY_REFRESH_MS) {
    void Staff.updateOne({ _id: staff._id }, { $set: { lastActiveAt: new Date() } }).catch(() => undefined);
  }
  const view = { ...toSessionUser(user), ...(staff ? { staff: { id: String(staff._id), name: staff.name, role: staff.role }, isAdmin: false } : {}) };
  if (sessionCache.size > 1000) sessionCache.clear();
  sessionCache.set(key, { user: view, until: Date.now() + SESSION_CACHE_MS });
  return view;
});

const SESSION_CACHE_MS = 20_000;
const ACTIVITY_REFRESH_MS = 6 * 3_600_000;

/** Javobni kutdirmasdan faollik vaqtini yangilaydi (ogohlantirishlar ham qaytadan hisoblanadi). */
function touchLater(userId: unknown): void {
  const run = () =>
    User.updateOne({ _id: userId }, { $set: { lastActiveAt: new Date(), "inactivity.warned12At": null, "inactivity.warned14At": null } }).then(
      () => undefined,
      (error) => console.error("activity update failed", error),
    );
  try {
    after(run);
  } catch {
    void run();
  }
}
const sessionCache = new Map<string, { user: SessionUser; until: number }>();

/**
 * Xodim kompaniya tarifidagi o'rinlarga sig'adimi: eng avval qo'shilgan faol xodimlar ishlaydi,
 * tarif chegarasidan ortiqlari (masalan, Premium tugab Bepulga o'tganda) kira olmaydi.
 */
export async function staffSeatOk(company: { _id: unknown; plan?: string; subscriptionUntil?: Date | null; role?: string }, staff: { createdAt?: Date }): Promise<boolean> {
  const limit = PLANS[effectivePlan(company)].staff;
  if (limit === null) return true;
  if (limit === 0) return false;
  const before = await Staff.countDocuments({ company: company._id, blocked: { $ne: true }, createdAt: { $lt: staff.createdAt ?? new Date() } });
  return before < limit;
}

/** Profil yoki obuna o'zgarganda keshdagi eski ma'lumotni o'chirish. */
export function forgetSessionUser(userId: string): void {
  for (const key of sessionCache.keys()) if (key.startsWith(`${userId}:`)) sessionCache.delete(key);
}

function toSessionUser(user: { _id: unknown; role: Role; name: string; phone: string; region: RegionCode; verification: Verification; demo?: boolean; plan?: string; planTrial?: boolean; subscriptionUntil?: Date | null; logo?: string }): SessionUser {
  return {
    id: String(user._id),
    role: user.role,
    name: user.name,
    phone: user.phone,
    region: user.region,
    verification: user.verification,
    isAdmin: adminPhones().has(user.phone),
    demo: Boolean(user.demo),
    subscriptionUntil: user.subscriptionUntil ? new Date(user.subscriptionUntil).toISOString() : null,
    plan: effectivePlan(user),
    planTrial: Boolean(user.planTrial) && effectivePlan(user) !== "free",
    logo: user.logo ?? "",
    staff: null,
  };
}

export async function startSession(user: { id: string; role: Role; authVersion: number; staff?: { id: string; role: StaffRole } }): Promise<string> {
  const token = await signToken({ sub: user.id, role: user.role, v: user.authVersion, ...(user.staff ? { st: user.staff.id, sr: user.staff.role } : {}) });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return token;
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(ADMIN_RETURN_COOKIE);
}

/** Administrator demo hisobga kirganda o'z sessiyasini shu yerda saqlaydi — "Adminga qaytish" uchun. */
const ADMIN_RETURN_COOKIE = "sv_admin_return";
const ADMIN_RETURN_TTL_SECONDS = 60 * 60 * 24;

/** Joriy (administrator) sessiyasini eslab qoladi. Demo hisobga o'tishdan oldin chaqiriladi. */
export async function rememberAdminSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return;
  jar.set(ADMIN_RETURN_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ADMIN_RETURN_TTL_SECONDS });
}

/**
 * Saqlangan administrator sessiyasini qaytaradi. Token imzosi, hisob holati va admin ro'yxati qayta tekshiriladi:
 * bloklangan, paroli o'zgargan yoki adminlikdan olingan hisobga qaytib bo'lmaydi.
 */
export async function restoreAdminSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_RETURN_COOKIE)?.value;
  jar.delete(ADMIN_RETURN_COOKIE);
  const payload = await verifyToken(token);
  if (!token || !payload || payload.st) return false;
  await connectDb();
  const user = await User.findById(payload.sub, { phone: 1, blocked: 1, authVersion: 1, demo: 1 }).lean();
  if (!user || user.blocked || user.demo || user.authVersion !== payload.v || !adminPhones().has(user.phone)) return false;
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_TTL_SECONDS });
  return true;
}
