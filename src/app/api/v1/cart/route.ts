import { ok } from "@/lib/api";
import { cartSetSchema } from "@/lib/validation";
import { getCart, setCartItem } from "@/server/cart";
import { parseBody, withUser } from "@/server/handler";

export const GET = withUser("buyer", async (user) => ok(await getCart(user.id)));

/** { productId, quantity, add? } — quantity 0 bo'lsa olib tashlanadi. */
export const PUT = withUser("buyer", async (user, request) => {
  const { productId, quantity, add } = await parseBody(request, cartSetSchema);
  return ok({ count: await setCartItem(user.id, productId, quantity, add) });
});
