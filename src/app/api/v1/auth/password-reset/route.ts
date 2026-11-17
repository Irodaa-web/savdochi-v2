import { clientIp, fail, ok, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { forgetSessionUser } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { hit, reset } from "@/lib/rateLimit";
import { fieldErrors, passwordResetSchema } from "@/lib/validation";
import { User } from "@/models/User";
import { smsEnabled, verifyCode } from "@/server/sms";

/** Unutilgan parolni SMS kod bilan almashtirish: `{ phone, code, password }`. Barcha eski sessiyalar yopiladi. */
export async function POST(request: Request) {
  if (!smsEnabled()) return fail("SMS_DISABLED");
  const parsed = passwordResetSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail("INVALID_INPUT", fieldErrors(parsed.error));
  const { phone, code, password } = parsed.data;
  try {
    await connectDb();
    if (!(await hit(`reset:ip:${clientIp(request)}`, 20, 60 * 60 * 1000))) return fail("TOO_MANY_ATTEMPTS");
    if (!(await verifyCode(phone, "reset", code))) return fail("CODE_INVALID", { code: "CODE_INVALID" });
    const user = await User.findOneAndUpdate({ phone, blocked: false }, { $set: { passwordHash: await hashPassword(password) }, $inc: { authVersion: 1 } }).lean();
    if (!user) return fail("CODE_INVALID", { code: "CODE_INVALID" });
    forgetSessionUser(String(user._id));
    await reset(`login:phone:${phone}`);
    return ok({ reset: true });
  } catch (error) {
    console.error("password reset failed", error);
    return fail("SERVER_ERROR");
  }
}
