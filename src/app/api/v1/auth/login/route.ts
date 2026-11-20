import { getLocale } from "@/i18n/server";
import { AppError, clientIp, fail, ok, readJson } from "@/lib/api";
import { burnTime, verifyPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { hit, reset } from "@/lib/rateLimit";
import { fieldErrors, loginSchema } from "@/lib/validation";
import { Staff } from "@/models/Staff";
import { User } from "@/models/User";
import { demoPasswordLogin } from "@/server/demo";
import { reactivateAccount, touchActivity } from "@/server/inactivity";
import { sendCode, smsEnabled, verifyCode } from "@/server/sms";

const WINDOW = 15 * 60 * 1000;

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail("INVALID_INPUT", fieldErrors(parsed.error));
  const { phone, password, code } = parsed.data;

  try {
    await connectDb();
    const phoneKey = `login:phone:${phone}`;
    const ipKey = `login:ip:${clientIp(request)}`;
    const [phoneOk, ipOk] = await Promise.all([hit(phoneKey, 8, WINDOW), hit(ipKey, 40, WINDOW)]);
    if (!phoneOk || !ipOk) return fail("TOO_MANY_ATTEMPTS");

    // Demo hisoblar: DEMO_PASSWORD sozlangan bo'lsa, shu parol bilan ham kiriladi.
    const demo = await demoPasswordLogin(phone, password);
    if (demo) {
      await reset(phoneKey);
      const token = await startSession({ id: String(demo._id), role: demo.role, authVersion: demo.authVersion });
      return ok({ token, user: { id: String(demo._id), role: demo.role, name: demo.name } });
    }

    const user = await User.findOne({ phone }).select("+passwordHash");
    if (!user) {
      // Kompaniya xodimi: o'z paroli bilan, kompaniya hisobi nomidan.
      const staff = await Staff.findOne({ phone }).select("+passwordHash");
      if (!staff) {
        await burnTime(password);
        return fail("INVALID_CREDENTIALS");
      }
      const company = await User.findById(staff.company, { role: 1, name: 1, blocked: 1, inactive: 1 }).lean();
      if (staff.blocked || !company || company.blocked || !(await verifyPassword(password, staff.passwordHash))) return fail("INVALID_CREDENTIALS");
      // Kompaniya hisobi nofaol (egasi 15 kun kirmagan) bo'lsa — ega SMS bilan qayta faollashtirishi kerak.
      if (company.inactive) return fail("COMPANY_INACTIVE");
      await reset(phoneKey);
      await Staff.updateOne({ _id: staff._id }, { $set: { lastActiveAt: new Date() } });
      const token = await startSession({ id: String(company._id), role: "seller", authVersion: staff.authVersion, staff: { id: String(staff._id), role: staff.role } });
      return ok({ token, user: { id: String(company._id), role: "seller", name: company.name, staff: { name: staff.name, role: staff.role } } });
    }
    // Admin bloklagan hisob kirmaydi va nofaollik mexanizmi orqali ham ochilmaydi.
    if (user.blocked || !(await verifyPassword(password, user.passwordHash))) return fail("INVALID_CREDENTIALS");

    if (user.inactive) {
      // 15 kun kirilmagan hisob: parol to'g'ri, endi shaxsni SMS kod bilan qayta tasdiqlash kerak.
      if (!smsEnabled()) return fail("SMS_DISABLED");
      if (!code) {
        if (!(await hit(`sms:phone:${phone}`, 3, WINDOW))) return fail("TOO_MANY_ATTEMPTS");
        await sendCode(phone, "reactivate", await getLocale());
        return fail("ACCOUNT_INACTIVE");
      }
      if (!(await verifyCode(phone, "reactivate", code))) return fail("CODE_INVALID", { code: "CODE_INVALID" });
      if (!(await reactivateAccount(user._id))) return fail("INVALID_CREDENTIALS");
    } else {
      await touchActivity(user._id);
    }

    await reset(phoneKey);
    const token = await startSession({ id: String(user._id), role: user.role, authVersion: user.authVersion });
    return ok({ token, user: { id: String(user._id), role: user.role, name: user.name } });
  } catch (error) {
    if (error instanceof AppError) return fail(error.code);
    console.error("login failed", error);
    return fail("SERVER_ERROR");
  }
}
