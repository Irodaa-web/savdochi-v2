import { ok } from "@/lib/api";
import { reviewSchema } from "@/lib/validation";
import { parseBody, withUser, type IdCtx } from "@/server/handler";
import { rateOrder } from "@/server/reviews";

/** Do'kon: yetkazilgan buyurtma bo'yicha kompaniyaga baho. { rating: 1–5, text } */
export const POST = withUser<IdCtx>("buyer", async (user, request, { params }) => ok(await rateOrder(user, (await params).id, await parseBody(request, reviewSchema))));
