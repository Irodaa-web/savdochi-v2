import "server-only";
import webpush from "web-push";
import { connectDb } from "@/lib/db";
import { getDictionary } from "@/i18n/server";
import { effectivePlan, planHas } from "@/lib/plans";
import { AppSetting } from "@/models/AppSetting";
import type { NotificationType } from "@/models/Notification";
import { PushSub } from "@/models/PushSub";
import { User } from "@/models/User";
import { localeOf, notificationText, SERVICE_TYPES, telegramConfig } from "./telegram";

/**
 * Web Push (telefon va kompyuterga bildirishnoma). VAPID kalitlari: VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY
 * berilgan bo'lsa — ular; aks holda birinchi ishlatilganda yaratilib bazada saqlanadi (sozlash shart emas).
 */
type Keys = { publicKey: string; privateKey: string };
let keysCache: Keys | null = null;

async function vapidKeys(): Promise<Keys> {
  if (keysCache) return keysCache;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keysCache = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    return keysCache;
  }
  await connectDb();
  // Bir vaqtda ikki server yaratsa ham bittasi qoladi: $setOnInsert — faqat birinchisi yoziladi.
  const fresh = webpush.generateVAPIDKeys();
  await AppSetting.updateOne({ _id: "vapid" }, { $setOnInsert: { value: fresh } }, { upsert: true });
  const stored = (await AppSetting.findById("vapid").lean())?.value as Keys | undefined;
  keysCache = stored ?? fresh;
  return keysCache;
}

export async function pushPublicKey(): Promise<string> {
  return (await vapidKeys()).publicKey;
}

export async function savePushSub(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void> {
  await connectDb();
  await PushSub.updateOne({ endpoint: sub.endpoint }, { $set: { user: userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, { upsert: true });
}

export async function removePushSub(userId: string, endpoint: string): Promise<void> {
  await connectDb();
  await PushSub.deleteOne({ user: userId, endpoint });
}

/** Bildirishnomani foydalanuvchining barcha qurilmalariga yuboradi. Eskirgan obunalar o'chiriladi. */
export async function notifyPush(userId: unknown, type: NotificationType, params: Record<string, string | number>, link: string): Promise<void> {
  const subs = await PushSub.find({ user: userId }).lean();
  if (!subs.length) return;
  const u = await User.findById(userId, { locale: 1, role: 1, plan: 1, subscriptionUntil: 1 }).lean();
  if (!u) return;
  // Kompaniya: savdo xabarlari telefonga Standart va Premium tariflarda (Telegram bilan bir xil qoida).
  if (u.role === "seller" && !SERVICE_TYPES.has(type) && !planHas(effectivePlan(u), "telegram")) return;
  const keys = await vapidKeys();
  const subject = telegramConfig().appUrl || "https://savdochi-v2.vercel.app";
  const payload = JSON.stringify({ title: "Savdochi", body: notificationText(getDictionary(localeOf(u.locale)), type, params), url: link || "/" });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86_400, vapidDetails: { subject, publicKey: keys.publicKey, privateKey: keys.privateKey } });
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await PushSub.deleteOne({ _id: s._id });
        else console.error("push failed", status ?? error);
      }
    }),
  );
}
