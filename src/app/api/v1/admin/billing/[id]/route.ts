import { ok } from "@/lib/api";
import { planDecisionSchema } from "@/lib/validation";
import { decidePlanRequest } from "@/server/billing";
import { clientIp, parseBody, withUser, type IdCtx } from "@/server/handler";

/** Administrator: tarif so'rovini tasdiqlash (to'lov qabul qilindi) yoki rad etish. */
export const PATCH = withUser<IdCtx>("admin", async (user, request, { params }) => {
  await decidePlanRequest(user.id, (await params).id, await parseBody(request, planDecisionSchema), clientIp(request));
  return ok(null);
});
