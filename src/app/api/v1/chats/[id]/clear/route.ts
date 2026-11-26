import { ok } from "@/lib/api";
import { clearHistory } from "@/server/chat";
import { withUser, type IdCtx } from "@/server/handler";

/** Chat tarixini faqat o'zi uchun tozalash (suhbatdoshda saqlanib qoladi). */
export const POST = withUser<IdCtx>(null, async (user, _request, { params }) => {
  await clearHistory(user, (await params).id);
  return ok(null);
});
