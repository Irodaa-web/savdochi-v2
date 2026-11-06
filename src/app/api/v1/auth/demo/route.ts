import { clientIp, fail, ok, readJson } from "@/lib/api";
import { startSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { hit } from "@/lib/rateLimit";
import { demoEnabled, ensureDemo } from "@/server/demo";

/** Demo hisobga kirish: { role: "buyer" | "seller" }. Faqat DEMO_MODE=1 da. */
export async function POST(request: Request) {
  if (!demoEnabled()) return fail("DEMO_DISABLED");
  const body = (await readJson(request)) as { role?: string } | null;
  const role = body?.role === "seller" ? "seller" : "buyer";
  try {
    await connectDb();
    if (!(await hit(`demo:${clientIp(request)}`, 30, 60 * 60 * 1000))) return fail("TOO_MANY_ATTEMPTS");
    const user = await ensureDemo(role);
    const token = await startSession({ id: String(user._id), role: user.role, authVersion: user.authVersion });
    return ok({ token, user: { id: String(user._id), role: user.role, name: user.name } });
  } catch (error) {
    console.error("demo login failed", error);
    return fail("SERVER_ERROR");
  }
}
