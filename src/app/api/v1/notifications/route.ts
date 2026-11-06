import { ok } from "@/lib/api";
import { withUser } from "@/server/handler";
import { listNotifications, markAllRead } from "@/server/notify";

export const GET = withUser(null, async (user) => ok(await listNotifications(user.id)));

/** Barchasini o'qilgan qilish. */
export const POST = withUser(null, async (user) => {
  await markAllRead(user.id);
  return ok(null);
});
