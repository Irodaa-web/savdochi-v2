import { z } from "zod";
import { ok } from "@/lib/api";
import { parseBody, withUser } from "@/server/handler";
import { listFavorites, toggleFavorite } from "@/server/products";

export const GET = withUser("buyer", async (user) => ok(await listFavorites(user.id)));

/** Saqlash / olib tashlash: { productId } → { saved } */
export const POST = withUser("buyer", async (user, request) => {
  const { productId } = await parseBody(request, z.object({ productId: z.string().min(1) }));
  return ok({ saved: await toggleFavorite(user.id, productId) });
});
