import { ok } from "@/lib/api";
import { orderEditSchema } from "@/lib/validation";
import { parseBody, withUser, type IdCtx } from "@/server/handler";
import { editOrder } from "@/server/orders";

/** Kompaniya: yangi buyurtmada miqdorni kamaytirish yoki qatorni olib tashlash. { items: [{ productId, quantity }], reason } */
export const POST = withUser<IdCtx>("seller", async (user, request, { params }) => ok(await editOrder(user, (await params).id, await parseBody(request, orderEditSchema))));
