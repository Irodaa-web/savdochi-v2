import "server-only";
import { AuditLog } from "@/models/AuditLog";
import { Notification, type NotificationType } from "@/models/Notification";

/** Bildirishnoma yaratadi. Xato bo'lsa asosiy amalni to'xtatmaydi. */
export async function notify(user: unknown, type: NotificationType, params: Record<string, string | number>, link: string): Promise<void> {
  try {
    await Notification.create({ user, type, params, link });
  } catch (error) {
    console.error("notify failed", error);
  }
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
