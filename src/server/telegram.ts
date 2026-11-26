import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { fmt } from "@/i18n/format";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { connectDb } from "@/lib/db";
import type { NotificationType } from "@/models/Notification";
import { User } from "@/models/User";
import { normalizePhone } from "@/lib/phone";
import { hit } from "@/lib/rateLimit";
import { storeOneTimeCode } from "./sms";
import { effectivePlan, planHas } from "@/lib/plans";

/**
 * Telegram bot: bildirishnomalar va parolni tiklash.
 * Sozlash uchun bitta o'zgaruvchi yetadi: TELEGRAM_BOT_TOKEN (BotFather'dan).
 * Ixtiyoriy: TELEGRAM_BOT_USERNAME (berilmasa getMe'dan olinadi), TELEGRAM_WEBHOOK_SECRET (berilmasa tokendan
 * hosil qilinadi), APP_URL (berilmasa Vercel'ning production manzili).
 * Foydalanuvchi Sozlamalarda "Ulash"ni bosadi → t.me/<bot>?start=<kod> → bot kodni tekshirib chatni bog'laydi.
 */
export function telegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  return {
    enabled: Boolean(token),
    token,
    username: (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, ""),
    // Webhook so'rovlari shu kalit bilan keladi; alohida berilmasa — tokendan (tashqariga chiqmaydigan) xesh.
    secret: process.env.TELEGRAM_WEBHOOK_SECRET || (token ? createHash("sha256").update(`webhook:${token}`).digest("hex").slice(0, 48) : ""),
    // Sinov uchun almashtirsa bo'ladi; odatda https://api.telegram.org
    apiBase: (process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org").replace(/\/$/, ""),
    appUrl: (process.env.APP_URL || vercelUrl).replace(/\/$/, ""),
  };
}

let cachedUsername: string | null = null;

/** Bot nomi (@ siz): sozlamadan yoki bir marta getMe orqali. */
export async function botUsername(): Promise<string | null> {
  const cfg = telegramConfig();
  if (!cfg.enabled) return null;
  if (cfg.username) return cfg.username;
  if (cachedUsername) return cachedUsername;
  const me = await telegramApi<{ username?: string }>("getMe", {});
  cachedUsername = me?.username ?? null;
  return cachedUsername;
}

let webhookReady: Promise<void> | null = null;

/**
 * Webhookni avtomatik sozlaydi (faqat production'da). Har server nusxasi bir marta getWebhookInfo so'raydi
 * va faqat kerak bo'lsa setWebhook chaqiradi: manzil boshqa bo'lsa yoki Telegram so'nggi yuborishda
 * 401/403 olgan bo'lsa (kalit mos emas). Sahifa so'rovi ichida after() bilan chaqiriladi —
 * Vercel ish tugaguncha kutadi (fondagi ish muzlatilib qolmaydi). Admin qo'lda hech narsa bosmaydi.
 */
export function ensureWebhook(): Promise<void> {
  const cfg = telegramConfig();
  if (!cfg.enabled || !cfg.appUrl) return Promise.resolve();
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return Promise.resolve(); // preview webhookni "o'g'irlamasin"
  webhookReady ??= (async () => {
    const url = `${cfg.appUrl}/api/v1/telegram/webhook`;
    const info = await telegramApi<{ url?: string; last_error_message?: string }>("getWebhookInfo", {});
    if (!info) {
      webhookReady = null; // keyingi so'rovda qayta urinadi
      return;
    }
    if (info.url === url && !/40[13]/.test(info.last_error_message ?? "")) return;
    const ok = await telegramApi<boolean>("setWebhook", { url, allowed_updates: ["message"], secret_token: cfg.secret });
    if (ok !== true) webhookReady = null;
  })();
  return webhookReady;
}

/** Bot API chaqiruvi. Xato bo'lsa null — asosiy amal to'xtamaydi. */
export async function telegramApi<T = unknown>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const cfg = telegramConfig();
  if (!cfg.token) return null;
  try {
    const res = await fetch(`${cfg.apiBase}/bot${cfg.token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!json.ok) {
      console.error("telegram", method, json.description);
      return null;
    }
    return json.result ?? null;
  } catch (error) {
    console.error("telegram", method, error);
    return null;
  }
}

const LINK_TTL_MS = 15 * 60 * 1000;

export type TelegramStatus = { enabled: boolean; linked: boolean };

export async function telegramStatus(userId: string): Promise<TelegramStatus> {
  const cfg = telegramConfig();
  if (!cfg.enabled) return { enabled: false, linked: false };
  await connectDb();
  const u = await User.findById(userId, { telegram: 1 }).lean();
  return { enabled: true, linked: Boolean(u?.telegram?.chatId) };
}

/** Bir martalik ulash havolasi (15 daqiqa amal qiladi). Til — bot xabarlari shu tilda yuboriladi. */
export async function createLink(userId: string, locale: Locale): Promise<string | null> {
  const cfg = telegramConfig();
  if (!cfg.enabled) return null;
  await connectDb();
  const username = await botUsername();
  if (!username) return null;
  const code = randomBytes(12).toString("base64url");
  await User.updateOne({ _id: userId }, { $set: { locale, "telegram.linkCode": code, "telegram.linkExpires": new Date(Date.now() + LINK_TTL_MS) } });
  return `https://t.me/${username}?start=${code}`;
}

export async function unlink(userId: string): Promise<void> {
  await connectDb();
  const u = await User.findByIdAndUpdate(userId, { $set: { "telegram.chatId": null, "telegram.linkCode": null, "telegram.linkExpires": null } }).lean();
  const chatId = u?.telegram?.chatId;
  if (chatId) await telegramApi("sendMessage", { chat_id: chatId, text: getDictionary(localeOf(u.locale)).telegram.unlinked });
}

export const localeOf = (value: unknown): Locale => (isLocale(value) ? value : defaultLocale);

type Update = {
  message?: {
    chat?: { id?: number; type?: string };
    from?: { id?: number; language_code?: string };
    text?: string;
    contact?: { phone_number?: string; user_id?: number };
  };
};

const RESET_TTL_MS = 15 * 60 * 1000;

/**
 * Parolni tiklash: foydalanuvchi "Raqamimni yuborish" tugmasi bilan o'z kontaktini yuboradi.
 * Telegram buni faqat egasining o'z raqami bo'lsa (contact.user_id === from.id) shunday yuboradi —
 * shu bilan telefon egaligi tasdiqlanadi (SMS kodiga teng). Keyin 15 daqiqalik bir martalik havola beriladi.
 */
async function handleContact(chatId: number, fromId: number | undefined, contact: NonNullable<NonNullable<Update["message"]>["contact"]>, lang?: string): Promise<void> {
  const base = getDictionary(isLocale(lang) ? lang : defaultLocale);
  const removeKeyboard = { reply_markup: { remove_keyboard: true } };
  if (!fromId || contact.user_id !== fromId) {
    await telegramApi("sendMessage", { chat_id: chatId, text: base.telegram.resetNotOwn });
    return;
  }
  if (!(await hit(`tgreset:${fromId}`, 5, 60 * 60 * 1000))) {
    await telegramApi("sendMessage", { chat_id: chatId, text: base.telegram.resetTooMany, ...removeKeyboard });
    return;
  }
  const phone = normalizePhone(contact.phone_number ?? "");
  const user = phone ? await User.findOne({ phone, blocked: false }, { name: 1, locale: 1 }).lean() : null;
  if (!phone || !user) {
    await telegramApi("sendMessage", { chat_id: chatId, text: base.telegram.resetNotFound, ...removeKeyboard });
    return;
  }
  const t = getDictionary(localeOf(user.locale));
  const key = randomBytes(24).toString("base64url");
  await storeOneTimeCode(phone, "tgreset", key, RESET_TTL_MS);
  // Raqam tasdiqlandi — shu chat bildirishnomalar uchun ham hisobga ulanadi (bitta chat — bitta hisob).
  await User.updateMany({ _id: { $ne: user._id }, "telegram.chatId": chatId }, { $set: { "telegram.chatId": null } });
  await User.updateOne({ _id: user._id }, { $set: { "telegram.chatId": chatId } });
  const url = `${telegramConfig().appUrl}/reset-password?p=${encodeURIComponent(phone)}&k=${key}`;
  await telegramApi("sendMessage", { chat_id: chatId, text: fmt(t.telegram.resetFound, { name: user.name }), ...removeKeyboard });
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text: t.telegram.resetLink,
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [[{ text: t.telegram.resetButton, url }]] },
  });
}

/** Webhook: /start <kod> — chatni hisobga bog'laydi; /start reset va kontakt — parolni tiklash; /stop — uzadi. */
export async function handleUpdate(update: Update): Promise<void> {
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim() ?? "";
  if (!chatId || update.message?.chat?.type !== "private") return;
  await connectDb();

  if (update.message?.contact) {
    await handleContact(chatId, update.message.from?.id, update.message.contact, update.message.from?.language_code);
    return;
  }

  if (text === "/start reset" || text === "/reset") {
    const t = getDictionary(defaultLocale);
    await telegramApi("sendMessage", {
      chat_id: chatId,
      text: t.telegram.resetStart,
      reply_markup: { keyboard: [[{ text: t.telegram.resetShare, request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
    });
    return;
  }

  if (text === "/stop") {
    const u = await User.findOneAndUpdate({ "telegram.chatId": chatId }, { $set: { "telegram.chatId": null } }).lean();
    await telegramApi("sendMessage", { chat_id: chatId, text: getDictionary(localeOf(u?.locale)).telegram.unlinked });
    return;
  }

  const code = /^\/start\s+([A-Za-z0-9_-]{8,64})$/.exec(text)?.[1];
  if (!code) {
    await telegramApi("sendMessage", { chat_id: chatId, text: getDictionary(defaultLocale).telegram.howTo });
    return;
  }
  const u = await User.findOneAndUpdate(
    { "telegram.linkCode": code, "telegram.linkExpires": { $gt: new Date() }, blocked: false },
    { $set: { "telegram.chatId": chatId, "telegram.linkCode": null, "telegram.linkExpires": null } },
    { new: true },
  ).lean();
  const t = getDictionary(localeOf(u?.locale));
  // Bitta Telegram chat — bitta hisob: oldin boshqa hisobga ulangan bo'lsa, o'sha uziladi.
  if (u) await User.updateMany({ _id: { $ne: u._id }, "telegram.chatId": chatId }, { $set: { "telegram.chatId": null } });
  await telegramApi("sendMessage", { chat_id: chatId, text: u ? fmt(t.telegram.linked, { name: u.name }) : t.telegram.expired });
}

/** Hisob haqidagi xizmat xabarlari — tarifdan qat'i nazar Telegram va telefonga (push) boradi. */
export const SERVICE_TYPES = new Set<NotificationType>(["planChanged", "planGift", "verified", "verificationRejected", "ticketReply", "inactivityWarning", "inactivityFinal", "productHidden", "productRestored"]);

/** Bildirishnoma matni foydalanuvchi tilida (holat va tarif kodlari so'z bilan). Telegram va push uchun. */
export function notificationText(t: ReturnType<typeof getDictionary>, type: NotificationType, params: Record<string, string | number>): string {
  const s = String(params.status ?? "");
  const plan = String(params.plan ?? "");
  const values = { ...params, status: (t.orderStatus as Record<string, string>)[s] ?? (t.paymentStatus as Record<string, string>)[s] ?? s, plan: (t.plans.names as Record<string, string>)[plan] ?? plan };
  return fmt((t.notifications.types as Record<string, string>)[type] ?? type, values);
}

/** Bildirishnomani Telegram'ga ham yuboradi (foydalanuvchi ulagan bo'lsa). */
export async function notifyTelegram(userId: unknown, type: NotificationType, params: Record<string, string | number>, link: string): Promise<void> {
  const cfg = telegramConfig();
  if (!cfg.enabled) return;
  const u = await User.findById(userId, { telegram: 1, locale: 1, role: 1, plan: 1, subscriptionUntil: 1 }).lean();
  const chatId = u?.telegram?.chatId;
  if (!chatId) return;
  // Kompaniya: savdo xabarlari Telegram'ga Standart va Premium tariflarda (Bepulda — faqat saytda).
  if (u.role === "seller" && !SERVICE_TYPES.has(type) && !planHas(effectivePlan(u), "telegram")) return;
  const t = getDictionary(localeOf(u.locale));
  const text = notificationText(t, type, params);
  const url = cfg.appUrl && link ? `${cfg.appUrl}${link}` : null;
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(url ? { reply_markup: { inline_keyboard: [[{ text: t.telegram.open, url }]] } } : {}),
  });
}

