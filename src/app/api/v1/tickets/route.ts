import { ok } from "@/lib/api";
import { ticketSchema } from "@/lib/validation";
import { parseBody, withUser } from "@/server/handler";
import { createTicket, listMyTickets } from "@/server/tickets";

export const GET = withUser(null, async (user) => ok(await listMyTickets(user.id)));

export const POST = withUser(null, async (user, request) => {
  const { subject, message } = await parseBody(request, ticketSchema);
  await createTicket(user.id, subject, message);
  return ok(null, { status: 201 });
});
