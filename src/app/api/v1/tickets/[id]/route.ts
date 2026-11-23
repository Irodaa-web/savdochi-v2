import { ok } from "@/lib/api";
import { ticketMessageSchema } from "@/lib/validation";
import { parseBody, withUser, type IdCtx } from "@/server/handler";
import { addUserMessage } from "@/server/tickets";

/** Foydalanuvchi o'z murojaatiga yana yozadi: { text }. Murojaat qayta ochiladi. */
export const POST = withUser<IdCtx>(null, async (user, request, { params }) => {
  await addUserMessage(user.id, (await params).id, (await parseBody(request, ticketMessageSchema)).text);
  return ok(null);
});
