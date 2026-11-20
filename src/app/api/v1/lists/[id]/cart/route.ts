import { ok } from "@/lib/api";
import { withUser, type IdCtx } from "@/server/handler";
import { orderListToCart } from "@/server/lists";

/** Ro'yxatdagi mahsulotlarni savatga solish. */
export const POST = withUser<IdCtx>("buyer", async (user, _request, { params }) => ok(await orderListToCart(user, (await params).id)));
