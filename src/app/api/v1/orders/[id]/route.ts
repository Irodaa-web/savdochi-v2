import { fail, ok } from "@/lib/api";
import { orderUpdateSchema } from "@/lib/validation";
import { parseBody, withUser, type IdCtx } from "@/server/handler";
import { getOrder, updateOrder } from "@/server/orders";

export const GET = withUser<IdCtx>(null, async (user, _request, { params }) => {
  const order = await getOrder(user, (await params).id);
  return order ? ok(order) : fail("NOT_FOUND");
});

/** { status?, paymentStatus?, paidAmount?, deliveryDate? } */
export const PATCH = withUser<IdCtx>(null, async (user, request, { params }) => ok(await updateOrder(user, (await params).id, await parseBody(request, orderUpdateSchema))));
