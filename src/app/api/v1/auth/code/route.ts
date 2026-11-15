import { AppError, clientIp, fail, ok, readJson } from "@/lib/api";
import { connectDb } from "@/lib/db";
import { getLocale } from "@/i18n/server";
import { hit } from "@/lib/rateLimit";
import { fieldErrors, smsRequestSchema } from "@/lib/validation";
import { User } from "@/models/User";
import { sendCode, smsEnabled } from "@/server/sms";

/**
 * SMS kod so'rash: `{ phone, purpose: "register" | "reset" }`.
 * Cheklov: bitta raqamga 15 daqiqada 3 ta, bitta IP dan soatiga 15 ta.
 * "reset" da raqam ro'yxatda bo'lmasa ham javob bir xil — raqam mavjudligi oshkor bo'lmaydi.
 */
export async function POST(request: Request) {
  if (!smsEnabled()) return fail("SMS_DISABLED");
  const parsed = smsRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail("INVALID_INPUT", fieldErrors(parsed.error));
  const { phone, purpose } = parsed.data;
  try {
    await connectDb();
    const [phoneOk, ipOk] = await Promise.all([hit(`sms:phone:${phone}`, 3, 15 * 60 * 1000), hit(`sms:ip:${clientIp(request)}`, 15, 60 * 60 * 1000)]);
    if (!phoneOk || !ipOk) return fail("TOO_MANY_ATTEMPTS");
    const exists = Boolean(await User.exists({ phone }));
    if (purpose === "register" && exists) return fail("PHONE_TAKEN", { phone: "PHONE_TAKEN" });
    if (purpose === "reset" && !exists) return ok({ sent: true });
    await sendCode(phone, purpose, await getLocale());
    return ok({ sent: true });
  } catch (error) {
    if (error instanceof AppError) return fail(error.code);
    console.error("sms code failed", error);
    return fail("SERVER_ERROR");
  }
}
