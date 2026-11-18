import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/api";
import { SmsCode, type SmsPurpose } from "@/models/SmsCode";

/**
 * SMS orqali tasdiqlash (Eskiz.uz).
 * Sozlash: ESKIZ_EMAIL, ESKIZ_PASSWORD (my.eskiz.uz hisobi), ixtiyoriy ESKIZ_FROM (standart 4546).
 * Sinov: SMS_DEV=1 — SMS yuborilmaydi, kod server logiga yoziladi.
 * Hech biri sozlanmagan bo'lsa SMS o'chiq: ro'yxatdan o'tish kodsiz ishlaydi, parolni tiklash mavjud emas.
 */
export function smsEnabled(): boolean {
  return process.env.SMS_DEV === "1" || Boolean(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD);
}

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const ESKIZ = "https://notify.eskiz.uz/api";

let token: { value: string; at: number } | null = null;

async function eskizToken(force = false): Promise<string> {
  // Token 30 kun amal qiladi; xavfsiz tomonda — 20 kunda yangilanadi.
  if (!force && token && Date.now() - token.at < 20 * 86_400_000) return token.value;
  const body = new URLSearchParams({ email: process.env.ESKIZ_EMAIL ?? "", password: process.env.ESKIZ_PASSWORD ?? "" });
  const res = await fetch(`${ESKIZ}/auth/login`, { method: "POST", body, signal: AbortSignal.timeout(8000) });
  const json = (await res.json().catch(() => null)) as { data?: { token?: string } } | null;
  if (!res.ok || !json?.data?.token) throw new Error(`eskiz login ${res.status}`);
  token = { value: json.data.token, at: Date.now() };
  return token.value;
}

async function sendSms(phone: string, text: string): Promise<void> {
  if (process.env.SMS_DEV === "1") {
    console.log(`[SMS_DEV] ${phone}: ${text}`);
    return;
  }
  const send = async (bearer: string) =>
    fetch(`${ESKIZ}/message/sms/send`, {
      method: "POST",
      headers: { authorization: `Bearer ${bearer}` },
      body: new URLSearchParams({ mobile_phone: phone.replace(/^\+/, ""), message: text, from: process.env.ESKIZ_FROM || "4546" }),
      signal: AbortSignal.timeout(8000),
    });
  let res = await send(await eskizToken());
  if (res.status === 401) res = await send(await eskizToken(true));
  if (!res.ok) throw new Error(`eskiz send ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Oddiy xabar (masalan, nofaollik ogohlantirishi). SMS_DEV=1 da logga yoziladi. */
export async function sendNotice(phone: string, text: string): Promise<void> {
  await sendSms(phone, text);
}

function hashCode(id: string, code: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`${id}:${code}`).digest("hex");
}

const TEXTS: Record<string, (code: string) => string> = {
  uz: (c) => `Savdochi: tasdiqlash kodi ${c}. Kodni hech kimga bermang.`,
  ru: (c) => `Savdochi: код подтверждения ${c}. Никому не сообщайте код.`,
  en: (c) => `Savdochi: your verification code is ${c}. Do not share it.`,
};

/** Yangi kod yaratib yuboradi (oldingisi bekor bo'ladi). */
export async function sendCode(phone: string, purpose: SmsPurpose, locale: string): Promise<void> {
  const id = `${purpose}:${phone}`;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await SmsCode.updateOne({ _id: id }, { $set: { codeHash: hashCode(id, code), attempts: 0, expiresAt: new Date(Date.now() + CODE_TTL_MS) } }, { upsert: true });
  try {
    await sendSms(phone, (TEXTS[locale] ?? TEXTS.uz!)(code));
  } catch (error) {
    console.error("sms send failed", error);
    await SmsCode.deleteOne({ _id: id });
    throw new AppError("SMS_FAILED");
  }
}

/**
 * Kodni tekshiradi. To'g'ri bo'lsa — kod o'chiriladi (bir martalik).
 * 5 ta xato urinishdan keyin kod bekor bo'ladi — yangisini so'rash kerak.
 */
export async function verifyCode(phone: string, purpose: SmsPurpose, code: string): Promise<boolean> {
  const id = `${purpose}:${phone}`;
  const doc = await SmsCode.findOneAndUpdate({ _id: id, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } }, { $inc: { attempts: 1 } }, { new: true }).lean();
  if (!doc) return false;
  const a = Buffer.from(doc.codeHash);
  const b = Buffer.from(hashCode(id, code));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  await SmsCode.deleteOne({ _id: id });
  return true;
}
