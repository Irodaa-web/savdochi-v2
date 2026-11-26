import { ok } from "@/lib/api";
import { deleteMessage } from "@/server/chat";
import { withUser } from "@/server/handler";

type Ctx = { params: Promise<{ id: string; mid: string }> };

/** O'z xabarini hamma uchun o'chirish. */
export const DELETE = withUser<Ctx>(null, async (user, _request, { params }) => {
  const { id, mid } = await params;
  await deleteMessage(user, id, mid);
  return ok(null);
});
