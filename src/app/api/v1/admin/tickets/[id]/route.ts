import { ok } from "@/lib/api";
import { ticketReplySchema } from "@/lib/validation";
import { clientIp, parseBody, withUser, type IdCtx } from "@/server/handler";
import { audit } from "@/server/notify";
import { answerTicket } from "@/server/tickets";

export const PATCH = withUser<IdCtx>("admin", async (user, request, { params }) => {
  const id = (await params).id;
  const { status, reply } = await parseBody(request, ticketReplySchema);
  await answerTicket(id, status, reply);
  await audit(user.id, "admin.ticket.answer", `ticket:${id}`, { status }, clientIp(request));
  return ok(null);
});
