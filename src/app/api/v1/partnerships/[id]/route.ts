import { ok } from "@/lib/api";
import { partnershipUpdateSchema } from "@/lib/validation";
import { parseBody, withUser, type IdCtx } from "@/server/handler";
import { updatePartnership } from "@/server/partners";

/** { action: "accept" | "reject" | "update", discount?, terms?, shareStock? } */
export const PATCH = withUser<IdCtx>(null, async (user, request, { params }) => {
  await updatePartnership(user, (await params).id, await parseBody(request, partnershipUpdateSchema));
  return ok(null);
});
