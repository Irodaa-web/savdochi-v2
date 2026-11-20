import { ok } from "@/lib/api";
import { Notification } from "@/models/Notification";
import { Order } from "@/models/Order";
import { cartCount } from "@/server/cart";
import { unreadChats } from "@/server/chat";
import { withUser } from "@/server/handler";

/**
 * Belgilar uchun bitta yengil so'rov: savat, chat, bildirishnomalar va buyurtmalar.
 * Buyurtmalar: kompaniya uchun — javob kutayotgan yangilari, do'kon uchun — yo'ldagilari.
 */
export const GET = withUser(null, async (user) => {
  const [cart, chats, notifications, orders] = await Promise.all([
    user.role === "buyer" ? cartCount(user.id) : Promise.resolve(0),
    unreadChats(user),
    Notification.countDocuments({ user: user.id, read: false }),
    user.role === "seller" ? Order.countDocuments({ seller: user.id, status: "new" }) : Order.countDocuments({ buyer: user.id, status: "shipped" }),
  ]);
  return ok({ cart, chats, notifications, orders });
});
