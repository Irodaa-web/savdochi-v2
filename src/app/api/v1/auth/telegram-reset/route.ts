import { clientIp, fail, ok, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { forgetSessionUser, startSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { hit, reset } from "@/lib/rateLimit";
import { fieldErrors, telegramResetSchema } from "@/lib/validation";
import { User } from "@/models/User";
import { verifyCode } from "@/server/sms";

/**
 * Telegram orqali parolni tiklash: bot telefon egaligini tasdiqlab bergan bir martalik kalit
 * (15 daqiqa) + yangi parol. Eski sessiyalar yopiladi, nofaol hisob ham qayta faollashadi
 * (telefon egaligi tasdiqlandi), so'ng shu qurilmada kirish ochiladi.
 */
export async function POST(request: Request) {
  const parsed = telegramResetSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail("INVALID_INPUT", fieldErrors(parsed.error));
  const { phone, key, password } = parsed.data;
  try {
    await connectDb();
    if (!(await hit(`tgreset:ip:${clientIp(request)}`, 20, 60 * 60 * 1000))) return fail("TOO_MANY_ATTEMPTS");
    if (!(await verifyCode(phone, "tgreset", key))) return fail("CODE_INVALID");
    const user = await User.findOneAndUpdate(
      { phone, blocked: false },
      {
        $set: { passwordHash: await hashPassword(password), inactive: false, inactiveAt: null, lastActiveAt: new Date(), "inactivity.warned12At": null, "inactivity.warned14At": null },
        $inc: { authVersion: 1 },
      },
      { new: true },
    ).lean();
    if (!user) return fail("CODE_INVALID");
    forgetSessionUser(String(user._id));
    await reset(`login:phone:${phone}`);
    const token = await startSession({ id: String(user._id), role: user.role, authVersion: user.authVersion });
    return ok({ token, user: { id: String(user._id), role: user.role, name: user.name } });
  } catch (error) {
    console.error("telegram reset failed", error);
    return fail("SERVER_ERROR");
  }
}
