import "server-only";
import { redirect } from "next/navigation";
import { homePath } from "@/lib/navigation";
import { getSessionUser, type SessionUser } from "./session";
import type { Role } from "./token";

/** Sahifalar uchun: kirmagan bo'lsa — kirishga, boshqa rol bo'lsa — o'z bosh sahifasiga. */
export async function requireUser(role?: Role): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/api/v1/auth/reset");
  if (role && user.role !== role) redirect(homePath[user.role]);
  return user;
}

/** Faqat administrator (ADMIN_PHONES ro'yxatidagi telefonlar). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) redirect(homePath[user.role]);
  return user;
}
