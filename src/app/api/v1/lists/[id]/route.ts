import { ok } from "@/lib/api";
import { orderListUpdateSchema } from "@/lib/validation";
import { parseBody, withUser, type IdCtx } from "@/server/handler";
import { deleteOrderList, updateOrderList } from "@/server/lists";

/** { name?, items?: [{ productId, quantity }] } — 0 miqdor mahsulotni olib tashlaydi. */
export const PATCH = withUser<IdCtx>("buyer", async (user, request, { params }) => ok(await updateOrderList(user, (await params).id, await parseBody(request, orderListUpdateSchema))));

export const DELETE = withUser<IdCtx>("buyer", async (user, _request, { params }) => {
  await deleteOrderList(user, (await params).id);
  return ok(null);
});
