import { ok } from "@/lib/api";
import { Notification } from "@/models/Notification";
import { cartCount } from "@/server/cart";
import { unreadChats } from "@/server/chat";
import { withUser } from "@/server/handler";

/** Header belgilari uchun bitta yengil so'rov: savat, chat, bildirishnomalar. */
export const GET = withUser(null, async (user) => {
  const [cart, chats, notifications] = await Promise.all([
    user.role === "buyer" ? cartCount(user.id) : Promise.resolve(0),
    unreadChats(user),
    Notification.countDocuments({ user: user.id, read: false }),
  ]);
  return ok({ cart, chats, notifications });
});
