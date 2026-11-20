import { ok } from "@/lib/api";
import { reviewReplySchema } from "@/lib/validation";
import { parseBody, withUser, type IdCtx } from "@/server/handler";
import { replyReview } from "@/server/reviews";

/** Kompaniya: sharhga javob. { text } (bo'sh — javobni olib tashlash) */
export const POST = withUser<IdCtx>("seller", async (user, request, { params }) => ok(await replyReview(user, (await params).id, (await parseBody(request, reviewReplySchema)).text)));
