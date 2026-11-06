import { ok } from "@/lib/api";
import { withUser, type IdCtx } from "@/server/handler";
import { removeStock } from "@/server/stock";

export const DELETE = withUser<IdCtx>("buyer", async (user, _request, { params }) => {
  await removeStock(user.id, (await params).id);
  return ok(null);
});
