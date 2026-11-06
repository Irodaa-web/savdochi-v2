import { ok } from "@/lib/api";
import { adminUserSchema } from "@/lib/validation";
import { adminUpdateUser } from "@/server/admin";
import { clientIp, parseBody, withUser, type IdCtx } from "@/server/handler";

/** { verification?, blocked?, extendMonths? } */
export const PATCH = withUser<IdCtx>("admin", async (user, request, { params }) => {
  await adminUpdateUser(user.id, (await params).id, await parseBody(request, adminUserSchema), clientIp(request));
  return ok(null);
});
