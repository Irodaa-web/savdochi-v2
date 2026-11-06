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
  await connectDb();
  const user = await User.findById(payload.sub).lean();
  if (!user || user.blocked || user.authVersion !== payload.v) return null;
  return {
    id: String(user._id),
    role: user.role,
    name: user.name,
    phone: user.phone,
    region: user.region,
    verification: user.verification,
    isAdmin: adminPhones().has(user.phone),
  };
});

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
