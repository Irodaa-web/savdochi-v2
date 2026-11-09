import { fail, ok } from "@/lib/api";
import { withUser } from "@/server/handler";
import { setWebhook, telegramConfig } from "@/server/telegram";

/** Admin: botning webhook manzilini o'rnatadi (deploydan keyin bir marta). */
export const POST = withUser("admin", async (_user, request) => {
  if (!telegramConfig().enabled) return fail("NOT_FOUND");
  return (await setWebhook(new URL(request.url).origin)) ? ok(null) : fail("SERVER_ERROR");
});
