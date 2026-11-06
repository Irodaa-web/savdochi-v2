import { clientIp, fail, ok, readJson } from "@/lib/api";
import { burnTime, verifyPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { hit, reset } from "@/lib/rateLimit";
import { fieldErrors, loginSchema } from "@/lib/validation";
import { User } from "@/models/User";

const WINDOW = 15 * 60 * 1000;

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail("INVALID_INPUT", fieldErrors(parsed.error));
  const { phone, password } = parsed.data;

  try {
    await connectDb();
    const phoneKey = `login:phone:${phone}`;
    const ipKey = `login:ip:${clientIp(request)}`;
    const [phoneOk, ipOk] = await Promise.all([hit(phoneKey, 8, WINDOW), hit(ipKey, 40, WINDOW)]);
    if (!phoneOk || !ipOk) return fail("TOO_MANY_ATTEMPTS");

    const user = await User.findOne({ phone }).select("+passwordHash");
    if (!user) {
      await burnTime(password);
      return fail("INVALID_CREDENTIALS");
    }
    if (user.blocked || !(await verifyPassword(password, user.passwordHash))) return fail("INVALID_CREDENTIALS");

    await reset(phoneKey);
    const token = await startSession({ id: String(user._id), role: user.role, authVersion: user.authVersion });
    return ok({ token, user: { id: String(user._id), role: user.role, name: user.name } });
  } catch (error) {
    console.error("login failed", error);
    return fail("SERVER_ERROR");
  }
}
