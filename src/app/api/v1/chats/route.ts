import { z } from "zod";
import { ok } from "@/lib/api";
import { listConversations, openConversation } from "@/server/chat";
import { parseBody, withUser } from "@/server/handler";

export const GET = withUser(null, async (user) => ok(await listConversations(user)));

/** Suhbat ochish: { partnerId } → { id } */
export const POST = withUser(null, async (user, request) => {
  const { partnerId } = await parseBody(request, z.object({ partnerId: z.string().min(1) }));
  return ok({ id: await openConversation(user, partnerId) });
});
