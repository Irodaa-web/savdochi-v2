import "server-only";
import { after } from "next/server";
import { AuditLog } from "@/models/AuditLog";
import { Notification, type NotificationType } from "@/models/Notification";
import { User } from "@/models/User";
import { notifyTelegram } from "./telegram";

/** Bildirishnoma yaratadi. Xato bo'lsa asosiy amalni to'xtatmaydi. */
export async function notify(user: unknown, type: NotificationType, params: Record<string, string | number>, link: string): Promise<void> {
  try {
    await Notification.create({ user, type, params, link });
  } catch (error) {
    console.error("notify failed", error);
  }
  // Telegram javobni kutdirmasin: so'rov tugagach yuboriladi (Vercel'da waitUntil orqali).
  const send = () => notifyTelegram(user, type, params, link).catch((error) => console.error("telegram notify failed", error));
  try {
    after(send);
  } catch {
    await send(); // so'rovdan tashqarida (masalan, skriptda) — darhol
  }
}

/** Administratorlarga xabar (saytda va ulangan bo'lsa Telegram'da). Adminlar — ADMIN_PHONES ro'yxati. */
export async function notifyAdmins(type: NotificationType, params: Record<string, string | number>, link: string): Promise<void> {
  const phones = (process.env.ADMIN_PHONES ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  if (!phones.length) return;
  const admins = await User.find({ phone: { $in: phones }, blocked: false }, { _id: 1 }).lean();
  await Promise.all(admins.map((a) => notify(a._id, type, params, link)));
}

/** Audit jurnaliga yozadi. */
export async function audit(actor: string | null, action: string, target: string, details: Record<string, unknown> = {}, ip = ""): Promise<void> {
  try {
    await AuditLog.create({ actor, action, target, details, ip });
  } catch (error) {
    console.error("audit failed", error);
  }
}

export type NotificationView = { id: string; type: NotificationType; params: Record<string, string | number>; link: string; read: boolean; createdAt: string };

export async function listNotifications(userId: string): Promise<{ items: NotificationView[]; unread: number }> {
  const [docs, unread] = await Promise.all([
    Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(30).lean(),
    Notification.countDocuments({ user: userId, read: false }),
  ]);
  return {
    unread,
    items: docs.map((n) => ({ id: String(n._id), type: n.type, params: n.params ?? {}, link: n.link, read: n.read, createdAt: n.createdAt.toISOString() })),
  };
}

export async function markAllRead(userId: string): Promise<void> {
  await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });
}
