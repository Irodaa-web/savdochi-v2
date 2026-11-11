import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { connectDb } from "@/lib/db";
import type { RegionCode } from "@/lib/regions";
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
  /** Kompaniya obunasi: null — cheklovsiz. */
  subscriptionUntil: string | null;
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
 * Bloklangan yoki paroli o'zgargan hisob tokeni rad etiladi.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const payload = await verifyToken(await readToken());
  if (!payload) return null;
  // Har sahifa bazaga alohida bormasligi uchun: qisqa muddatli xotira (bloklash/parol almashtirish ≤20 s da kuchga kiradi).
  const key = `${payload.sub}:${payload.v}`;
  const hit = sessionCache.get(key);
  if (hit && hit.until > Date.now()) return hit.user;
  await connectDb();
  const user = await User.findById(payload.sub).lean();
  if (!user || user.blocked || user.authVersion !== payload.v) {
    sessionCache.delete(key);
    return null;
  }
  const view = toSessionUser(user);
  if (sessionCache.size > 1000) sessionCache.clear();
  sessionCache.set(key, { user: view, until: Date.now() + SESSION_CACHE_MS });
  return view;
});

const SESSION_CACHE_MS = 20_000;
const sessionCache = new Map<string, { user: SessionUser; until: number }>();

/** Profil yoki obuna o'zgarganda keshdagi eski ma'lumotni o'chirish. */
export function forgetSessionUser(userId: string): void {
  for (const key of sessionCache.keys()) if (key.startsWith(`${userId}:`)) sessionCache.delete(key);
}

function toSessionUser(user: { _id: unknown; role: Role; name: string; phone: string; region: RegionCode; verification: Verification; demo?: boolean; subscriptionUntil?: Date | null }): SessionUser {
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
  };
}

export async function startSession(user: { id: string; role: Role; authVersion: number }): Promise<string> {
  const token = await signToken({ sub: user.id, role: user.role, v: user.authVersion });
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
  (await cookies()).delete(SESSION_COOKIE);
}
