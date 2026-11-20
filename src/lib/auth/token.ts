import { jwtVerify, SignJWT } from "jose";
import { STAFF_ROLES, type StaffRole } from "@/lib/staff";

/**
 * Sessiya tokeni. Edge (middleware) va Node'da ishlaydi — faqat `jose`.
 * Veb: httpOnly cookie. Mobil ilova: `Authorization: Bearer <token>`.
 */
export const SESSION_COOKIE = "sv_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type Role = "buyer" | "seller";
/**
 * sub — hisob (kompaniya yoki do'kon) id'si. Xodim kirsa: st — xodim id'si, sr — roli
 * (v — xodimning authVersion'i; rol o'zgarsa u oshadi, shuning uchun sr eskirib qolmaydi).
 */
export type TokenPayload = { sub: string; role: Role; v: number; st?: string; sr?: StaffRole };

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET kamida 32 belgi bo'lishi kerak");
  return new TextEncoder().encode(value);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role, v: payload.v, ...(payload.st ? { st: payload.st, sr: payload.sr } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyToken(token: string | undefined | null): Promise<TokenPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    if (payload.role !== "buyer" && payload.role !== "seller") return null;
    const staff = typeof payload.st === "string" && (STAFF_ROLES as readonly unknown[]).includes(payload.sr) ? { st: payload.st, sr: payload.sr as StaffRole } : {};
    if (staff.st && payload.role !== "seller") return null;
    return { sub: payload.sub, role: payload.role, v: Number(payload.v ?? 0), ...staff };
  } catch {
    return null;
  }
}
