import { fail, ok } from "@/lib/api";
import { getLocale } from "@/i18n/server";
import { withUser } from "@/server/handler";
import { createLink, telegramStatus, unlink } from "@/server/telegram";

/** Telegram ulanganmi (va bot sozlanganmi). */
export const GET = withUser(null, async (user) => ok(await telegramStatus(user.id)));

/** Bir martalik ulash havolasi: t.me/<bot>?start=<kod>. */
export const POST = withUser(null, async (user) => {
  const url = await createLink(user.id, await getLocale());
  return url ? ok({ url }) : fail("NOT_FOUND");
});

/** Telegram'ni uzish. */
export const DELETE = withUser(null, async (user) => {
  await unlink(user.id);
  return ok(null);
});
