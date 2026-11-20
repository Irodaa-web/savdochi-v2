import { ok } from "@/lib/api";
import { bulkCartSchema } from "@/lib/validation";
import { addManyToCart } from "@/server/cart";
import { parseBody, withUser } from "@/server/handler";

/** Bir nechta mahsulotni savatga qo'shish (kam qolganlarni to'ldirish, doimiy ro'yxat). { items: [{ productId, quantity }] } */
export const POST = withUser("buyer", async (user, request) => ok(await addManyToCart(user.id, (await parseBody(request, bulkCartSchema)).items)));
