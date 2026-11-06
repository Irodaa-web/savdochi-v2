import { ok } from "@/lib/api";
import { passwordChangeSchema } from "@/lib/validation";
import { clientIp, parseBody, withUser } from "@/server/handler";
import { audit } from "@/server/notify";
import { changePassword } from "@/server/profile";

/** Parolni almashtirish — boshqa qurilmalardagi sessiyalar bekor bo'ladi. */
export const POST = withUser(null, async (user, request) => {
  const { current, next } = await parseBody(request, passwordChangeSchema);
  await changePassword(user.id, current, next);
  await audit(user.id, "auth.password.change", `user:${user.id}`, {}, clientIp(request));
  return ok(null);
});
