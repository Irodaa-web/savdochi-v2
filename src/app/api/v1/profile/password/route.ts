import { ok } from "@/lib/api";
import { passwordChangeSchema } from "@/lib/validation";
import { clientIp, parseBody, withUser } from "@/server/handler";
import { audit } from "@/server/notify";
import { changePassword } from "@/server/profile";
import { changeStaffPassword } from "@/server/staff";

/** Parolni almashtirish — boshqa qurilmalardagi sessiyalar bekor bo'ladi. */
export const POST = withUser(null, async (user, request) => {
  const { current, next } = await parseBody(request, passwordChangeSchema);
  // Xodim — o'z parolini (kompaniyanikini emas).
  if (user.staff) await changeStaffPassword(user, current, next);
  else await changePassword(user.id, current, next);
  await audit(user.id, "auth.password.change", `user:${user.id}`, {}, clientIp(request));
  return ok(null);
});
