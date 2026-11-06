import { ok } from "@/lib/api";
import { withUser } from "@/server/handler";
import { listSellerProducts } from "@/server/products";

/** Sotuvchining o'z mahsulotlari (arxivlanganlardan tashqari). */
export const GET = withUser("seller", async (user) => ok(await listSellerProducts(user.id)));
