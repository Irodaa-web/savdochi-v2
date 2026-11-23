import { ok } from "@/lib/api";
import { adminProductSchema } from "@/lib/validation";
import { moderateProduct } from "@/server/admin";
import { clientIp, parseBody, withUser, type IdCtx } from "@/server/handler";

/** Administrator: { hidden: true, note } — katalogdan yashirish (sabab majburiy); { hidden: false } — qaytarish. */
export const PATCH = withUser<IdCtx>("admin", async (user, request, { params }) => {
  await moderateProduct(user.id, (await params).id, await parseBody(request, adminProductSchema), clientIp(request));
  return ok(null);
});
