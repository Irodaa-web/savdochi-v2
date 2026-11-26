import { clientIp, fail, ok, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { hit } from "@/lib/rateLimit";
import { fieldErrors, registerSchema } from "@/lib/validation";
import { Staff } from "@/models/Staff";
import { User } from "@/models/User";
import { smsEnabled, verifyCode } from "@/server/sms";
import { TRIAL_DAYS } from "@/lib/plans";


export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail("INVALID_INPUT", fieldErrors(parsed.error));
  const input = parsed.data;

  try {
    await connectDb();
    if (!(await hit(`register:${clientIp(request)}`, 10, 60 * 60 * 1000))) return fail("TOO_MANY_ATTEMPTS");

    // SMS yoqilgan bo'lsa — telefon egasi ekanini kod bilan tasdiqlash shart.
    if (smsEnabled()) {
      if (!input.code) return fail("INVALID_INPUT", { code: "codeRequired" });
      if ((await User.exists({ phone: input.phone })) || (await Staff.exists({ phone: input.phone }))) return fail("PHONE_TAKEN", { phone: "PHONE_TAKEN" });
      if (!(await verifyCode(input.phone, "register", input.code))) return fail("CODE_INVALID", { code: "CODE_INVALID" });
    }

    // Taklif: faqat kompaniya kompaniyani taklif qiladi; sovg'a administrator tasdiqlaganda beriladi.
    const referrer = input.role === "seller" && input.ref ? await User.findOne({ referralCode: input.ref.toUpperCase(), role: "seller" }, { _id: 1 }).lean() : null;
    const user = await User.create({
      ...(referrer ? { referredBy: referrer._id } : {}),
      role: input.role,
      name: input.name,
      phone: input.phone,
      region: input.region,
      passwordHash: await hashPassword(input.password),
      // Kompaniyalarga 14 kunlik bepul Premium sinov; keyin o'zi Bepul tarifga o'tadi (lib/plans).
      ...(input.role === "seller" ? { plan: "premium" as const, planTrial: true, subscriptionUntil: new Date(Date.now() + TRIAL_DAYS * 86_400_000) } : { subscriptionUntil: null }),
    });

    const token = await startSession({ id: String(user._id), role: user.role, authVersion: user.authVersion });
    return ok({ token, user: { id: String(user._id), role: user.role, name: user.name } }, { status: 201 });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return fail("PHONE_TAKEN", { phone: "PHONE_TAKEN" });
    console.error("register failed", error);
    return fail("SERVER_ERROR");
  }
}
