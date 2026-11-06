import "server-only";
import type { z } from "zod";
import { AppError, clientIp, fail, readJson } from "@/lib/api";
import { fieldErrors } from "@/lib/validation";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/token";

export { clientIp };

/**
 * API marshrutlari uchun umumiy o'rama: sessiyani tekshiradi, rolni cheklaydi,
 * kutilmagan xatoni SERVER_ERROR ga aylantiradi.
 */
export function withUser<Ctx>(role: Role | "admin" | null, handler: (user: SessionUser, request: Request, ctx: Ctx) => Promise<Response>) {
  return async (request: Request, ctx: Ctx): Promise<Response> => {
    try {
      const user = await getSessionUser();
      if (!user) return fail("UNAUTHORIZED");
      if (role === "admin" ? !user.isAdmin : role && user.role !== role) return fail("FORBIDDEN");
      return await handler(user, request, ctx);
    } catch (error) {
      if (error instanceof AppError) return fail(error.code, error.fields);
      console.error(new URL(request.url).pathname, error);
      return fail("SERVER_ERROR");
    }
  };
}

/** So'rov tanasini sxema bo'yicha tekshiradi; xato bo'lsa INVALID_INPUT tashlaydi. */
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) throw new AppError("INVALID_INPUT", fieldErrors(parsed.error));
  return parsed.data;
}

export type IdCtx = { params: Promise<{ id: string }> };
