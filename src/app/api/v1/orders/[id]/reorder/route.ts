import { ok } from "@/lib/api";
import { withUser, type IdCtx } from "@/server/handler";
import { reorder } from "@/server/orders";

/** Buyurtmadagi mahsulotlarni qayta savatga qo'shadi. */
export const POST = withUser<IdCtx>("buyer", async (user, _request, { params }) => ok(await reorder(user, (await params).id)));
