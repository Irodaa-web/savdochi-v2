import { ok } from "@/lib/api";
import { stockSchema } from "@/lib/validation";
import { parseBody, withUser } from "@/server/handler";
import { listMyStock, setStock } from "@/server/stock";

/** Do'kon ombori. */
export const GET = withUser("buyer", async (user) => ok(await listMyStock(user.id)));

/** { productId, quantity, minLevel } */
export const PUT = withUser("buyer", async (user, request) => {
  const { productId, quantity, minLevel } = await parseBody(request, stockSchema);
  await setStock(user, productId, quantity, minLevel);
  return ok(null);
});
