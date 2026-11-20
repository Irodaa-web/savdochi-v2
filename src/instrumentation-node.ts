import { ensureWebhook } from "@/server/telegram";

/** Javoblarni kutdirmaydi; xato bo'lsa — logga yoziladi va keyingi ishga tushishda qayta uriniladi. */
export function setupTelegram(): void {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  ensureWebhook().catch((error) => console.error("telegram webhook setup", error));
}
