import { ok } from "@/lib/api";
import { messageSchema } from "@/lib/validation";
import { listMessages, sendMessage } from "@/server/chat";
import { parseBody, withUser, type IdCtx } from "@/server/handler";

/** Xabarlar. ?after=ISO — faqat yangilari (har necha soniyada so'raladi). */
export const GET = withUser<IdCtx>(null, async (user, request, { params }) => {
  const after = new URL(request.url).searchParams.get("after") ?? undefined;
  return ok(await listMessages(user, (await params).id, after));
});

export const POST = withUser<IdCtx>(null, async (user, request, { params }) => {
  await sendMessage(user, (await params).id, await parseBody(request, messageSchema));
  return ok(null, { status: 201 });
});
