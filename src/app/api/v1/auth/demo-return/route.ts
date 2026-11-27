import { fail, ok } from "@/lib/api";
import { endSession, restoreAdminSession } from "@/lib/auth/session";

/** Demo hisobdan administrator hisobiga qaytish. Saqlangan admin sessiyasi bo'lmasa — oddiy chiqish. */
export async function POST() {
  if (await restoreAdminSession()) return ok({ admin: true });
  await endSession();
  return fail("UNAUTHORIZED");
}
