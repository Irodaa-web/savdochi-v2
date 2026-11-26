import { ok } from "@/lib/api";
import { cancelPlanRequest } from "@/server/billing";
import { withUser, type IdCtx } from "@/server/handler";

/** Kompaniya egasi o'z ochiq so'rovini bekor qiladi. */
export const DELETE = withUser<IdCtx>("seller", async (user, _request, { params }) => {
  await cancelPlanRequest(user, (await params).id);
  return ok(null);
});
