import "server-only";
import { fail } from "@/lib/api";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/token";

/**
 * API marshrutlari uchun umumiy o'rama: sessiyani tekshiradi, rolni cheklaydi,
 * kutilmagan xatoni SERVER_ERROR ga aylantiradi.
 */
export function withUser<Ctx>(role: Role | null, handler: (user: SessionUser, request: Request, ctx: Ctx) => Promise<Response>) {
  return async (request: Request, ctx: Ctx): Promise<Response> => {
    try {
      const user = await getSessionUser();
      if (!user) return fail("UNAUTHORIZED");
      if (role && user.role !== role) return fail("FORBIDDEN");
      return await handler(user, request, ctx);
    } catch (error) {
      console.error(new URL(request.url).pathname, error);
      return fail("SERVER_ERROR");
    }
  };
}
