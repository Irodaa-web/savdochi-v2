import { ok } from "@/lib/api";
import { orderListCreateSchema } from "@/lib/validation";
import { parseBody, withUser } from "@/server/handler";
import { listOrderLists, saveOrderAsList } from "@/server/lists";

/** Do'konning doimiy buyurtma ro'yxatlari. */
export const GET = withUser("buyer", async (user) => ok(await listOrderLists(user.id)));

/** Buyurtmadan ro'yxat: { orderId, name } — yangi; { orderId, listId } — mavjudiga qo'shish. */
export const POST = withUser("buyer", async (user, request) => {
  const { orderId, ...rest } = await parseBody(request, orderListCreateSchema);
  return ok(await saveOrderAsList(user, orderId, rest));
});
