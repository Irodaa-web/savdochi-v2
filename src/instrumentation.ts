/**
 * Server nusxasi ishga tushganda bir marta: Telegram bot webhookini avtomatik o'rnatadi
 * (TELEGRAM_BOT_TOKEN bo'lsa). Node.js kodi alohida faylda — Edge yig'ilmasiga tushmaydi.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setupTelegram } = await import("./instrumentation-node");
    setupTelegram();
  }
}
