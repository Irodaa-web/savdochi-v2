import { ok } from "@/lib/api";
import { setTyping } from "@/server/chat";
import { withUser, type IdCtx } from "@/server/handler";

/** "Yozmoqda…" — mijoz yozayotganda bir necha soniyada bir yuboradi. */
export const POST = withUser<IdCtx>(null, async (user, _request, { params }) => {
  await setTyping(user, (await params).id);
  return ok(null);
});
