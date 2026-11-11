import "server-only";
import { randomBytes } from "node:crypto";
import { fmt } from "@/i18n/format";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { connectDb } from "@/lib/db";
import type { NotificationType } from "@/models/Notification";
import { User } from "@/models/User";

/**
 * Telegram bildirishnomalari.
 * Sozlash: TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET, APP_URL.
 * Foydalanuvchi Sozlamalarda "Ulash"ni bosadi → t.me/<bot>?start=<kod> → bot kodni tekshirib chatni bog'laydi.
 */
export function telegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const username = (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");
  return {
    enabled: Boolean(token && username),
    token,
    username,
    secret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
    // Sinov uchun almashtirsa bo'ladi; odatda https://api.telegram.org
    apiBase: (process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org").replace(/\/$/, ""),
    appUrl: (process.env.APP_URL ?? "").replace(/\/$/, ""),
  };
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
  const code = randomBytes(12).toString("base64url");
  await User.updateOne({ _id: userId }, { $set: { locale, "telegram.linkCode": code, "telegram.linkExpires": new Date(Date.now() + LINK_TTL_MS) } });
  return `https://t.me/${cfg.username}?start=${code}`;
}

export async function unlink(userId: string): Promise<void> {
  await connectDb();
  const u = await User.findByIdAndUpdate(userId, { $set: { "telegram.chatId": null, "telegram.linkCode": null, "telegram.linkExpires": null } }).lean();
  const chatId = u?.telegram?.chatId;
  if (chatId) await telegramApi("sendMessage", { chat_id: chatId, text: getDictionary(localeOf(u.locale)).telegram.unlinked });
}

const localeOf = (value: unknown): Locale => (isLocale(value) ? value : defaultLocale);

type Update = { message?: { chat?: { id?: number; type?: string }; text?: string } };

/** Webhook: /start <kod> — chatni hisobga bog'laydi; /stop — uzadi. */
export async function handleUpdate(update: Update): Promise<void> {
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim() ?? "";
  if (!chatId || update.message?.chat?.type !== "private") return;
  await connectDb();

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

/** Bildirishnomani Telegram'ga ham yuboradi (foydalanuvchi ulagan bo'lsa). */
export async function notifyTelegram(userId: unknown, type: NotificationType, params: Record<string, string | number>, link: string): Promise<void> {
  const cfg = telegramConfig();
  if (!cfg.enabled) return;
  const u = await User.findById(userId, { telegram: 1, locale: 1 }).lean();
  const chatId = u?.telegram?.chatId;
  if (!chatId) return;
  const t = getDictionary(localeOf(u.locale));
  const s = String(params.status ?? "");
  const values = { ...params, status: (t.orderStatus as Record<string, string>)[s] ?? (t.paymentStatus as Record<string, string>)[s] ?? s };
  const text = fmt((t.notifications.types as Record<string, string>)[type] ?? type, values);
  const url = cfg.appUrl && link ? `${cfg.appUrl}${link}` : null;
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(url ? { reply_markup: { inline_keyboard: [[{ text: t.telegram.open, url }]] } } : {}),
  });
}

/** Admin: webhook manzilini Telegram'ga ro'yxatdan o'tkazadi. */
export async function setWebhook(origin: string): Promise<boolean> {
  const cfg = telegramConfig();
  if (!cfg.enabled) return false;
  const base = cfg.appUrl || origin;
  const ok = await telegramApi<boolean>("setWebhook", {
    url: `${base}/api/v1/telegram/webhook`,
    allowed_updates: ["message"],
    ...(cfg.secret ? { secret_token: cfg.secret } : {}),
  });
  return ok === true;
}
