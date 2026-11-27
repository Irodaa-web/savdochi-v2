import { clientIp, fail, ok, readJson } from "@/lib/api";
import { rememberAdminSession, startSession } from "@/lib/auth/session";
import { hit } from "@/lib/rateLimit";
import { audit } from "@/server/notify";
import { ensureDemo } from "@/server/demo";
import { withUser } from "@/server/handler";

/**
 * Administrator sinov (demo) hisobiga kiradi: { role: "buyer" | "seller" }.
 * Parol bilan kirish demo hisoblar uchun yopiq — faqat shu yo'l. Admin sessiyasi "Adminga qaytish" uchun saqlanadi.
 */
export const POST = withUser("admin", async (user, request) => {
  const body = (await readJson(request)) as { role?: string } | null;
  const role = body?.role === "seller" ? "seller" : body?.role === "buyer" ? "buyer" : null;
  if (!role) return fail("INVALID_INPUT");
  if (!(await hit(`demo-login:${user.id}`, 30, 60 * 60 * 1000))) return fail("TOO_MANY_ATTEMPTS");
  const demo = await ensureDemo(role);
  await audit(user.id, "admin.demo.login", `user:${demo._id}`, { role }, clientIp(request));
  await rememberAdminSession();
  await startSession({ id: String(demo._id), role: demo.role, authVersion: demo.authVersion });
  return ok({ role: demo.role, name: demo.name });
});
