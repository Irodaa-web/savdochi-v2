import "server-only";
import { isValidObjectId } from "mongoose";
import { AppError } from "@/lib/api";
import type { SessionUser } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { Conversation, Message, type ConversationDoc, type MessageDoc } from "@/models/Chat";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";

export type ConversationView = { id: string; partner: { id: string; name: string; verified: boolean }; lastText: string; lastAt: string; unread: number };
export type MessageView = {
  id: string;
  mine: boolean;
  text: string;
  order: { id: string; number: number } | null;
  product: { id: string; name: string } | null;
  createdAt: string;
};

const side = (user: SessionUser) => (user.role === "seller" ? { me: "seller", other: "buyer", unread: "unreadSeller", otherUnread: "unreadBuyer" } as const : { me: "buyer", other: "seller", unread: "unreadBuyer", otherUnread: "unreadSeller" } as const);

export async function listConversations(user: SessionUser): Promise<ConversationView[]> {
  await connectDb();
  const s = side(user);
  const docs = await Conversation.find({ [s.me]: user.id }).sort({ lastAt: -1 }).limit(100).lean<ConversationDoc[]>();
  const users = await User.find({ _id: { $in: docs.map((d) => d[s.other]) } }, { name: 1, verification: 1 }).lean();
  const by = new Map(users.map((u) => [String(u._id), u]));
  return docs.map((d) => {
    const u = by.get(String(d[s.other]));
    return {
      id: String(d._id),
      partner: { id: String(d[s.other]), name: u?.name ?? "—", verified: u?.verification === "verified" },
      lastText: d.lastText,
      lastAt: d.lastAt.toISOString(),
      unread: d[s.unread],
    };
  });
}

export async function unreadChats(user: SessionUser): Promise<number> {
  await connectDb();
  const s = side(user);
  return Conversation.countDocuments({ [s.me]: user.id, [s.unread]: { $gt: 0 } });
}

/** Suhbatni topadi yoki yaratadi (kompaniya ↔ do'kon). */
export async function openConversation(user: SessionUser, partnerId: string): Promise<string> {
  if (!isValidObjectId(partnerId)) throw new AppError("NOT_FOUND");
  await connectDb();
  const s = side(user);
  const partner = await User.findOne({ _id: partnerId, role: s.other, blocked: false }, { _id: 1 }).lean();
  if (!partner) throw new AppError("NOT_FOUND");
  const key = { [s.me]: user.id, [s.other]: partnerId };
  const doc = await Conversation.findOneAndUpdate(key, { $setOnInsert: { ...key, lastAt: new Date() } }, { upsert: true, new: true }).lean<ConversationDoc>();
  return String(doc!._id);
}

async function ownConversation(user: SessionUser, id: string): Promise<ConversationDoc> {
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const doc = await Conversation.findOne({ _id: id, [side(user).me]: user.id }).lean<ConversationDoc>();
  if (!doc) throw new AppError("NOT_FOUND");
  return doc;
}

/** Xabarlar (eskisidan yangisiga). `after` — faqat shu vaqtdan keyingilari (so'rov orqali yangilash uchun). */
export async function listMessages(user: SessionUser, id: string, after?: string): Promise<{ conversation: ConversationView; messages: MessageView[] }> {
  const conv = await ownConversation(user, id);
  const s = side(user);
  const filter: Record<string, unknown> = { conversation: conv._id };
  const afterDate = after ? new Date(after) : null;
  if (afterDate && !Number.isNaN(afterDate.getTime())) filter.createdAt = { $gt: afterDate };
  const docs = await Message.find(filter).sort({ createdAt: -1 }).limit(200).lean<MessageDoc[]>();
  docs.reverse();
  if (conv[s.unread] > 0) await Conversation.updateOne({ _id: conv._id }, { $set: { [s.unread]: 0 } });

  const [orders, products, partner] = await Promise.all([
    Order.find({ _id: { $in: docs.map((d) => d.order).filter(Boolean) } }, { number: 1 }).lean(),
    Product.find({ _id: { $in: docs.map((d) => d.product).filter(Boolean) } }, { name: 1 }).lean(),
    User.findById(conv[s.other], { name: 1, verification: 1 }).lean(),
  ]);
  const orderBy = new Map(orders.map((o) => [String(o._id), o.number]));
  const productBy = new Map(products.map((p) => [String(p._id), p.name]));
  return {
    conversation: {
      id: String(conv._id),
      partner: { id: String(conv[s.other]), name: partner?.name ?? "—", verified: partner?.verification === "verified" },
      lastText: conv.lastText,
      lastAt: conv.lastAt.toISOString(),
      unread: 0,
    },
    messages: docs.map((m) => ({
      id: String(m._id),
      mine: String(m.sender) === user.id,
      text: m.text,
      order: m.order && orderBy.has(String(m.order)) ? { id: String(m.order), number: orderBy.get(String(m.order))! } : null,
      product: m.product && productBy.has(String(m.product)) ? { id: String(m.product), name: productBy.get(String(m.product))! } : null,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function sendMessage(user: SessionUser, id: string, input: { text: string; orderId?: string; productId?: string }): Promise<void> {
  const conv = await ownConversation(user, id);
  const s = side(user);
  // Buyurtma faqat shu ikki tomon o'rtasidagi bo'lsa biriktiriladi.
  const order = input.orderId && isValidObjectId(input.orderId) ? await Order.findOne({ _id: input.orderId, seller: conv.seller, buyer: conv.buyer }, { _id: 1 }).lean() : null;
  const product = input.productId && isValidObjectId(input.productId) ? await Product.findById(input.productId, { _id: 1 }).lean() : null;
  await Message.create({ conversation: conv._id, sender: user.id, text: input.text, order: order?._id ?? null, product: product?._id ?? null });
  await Conversation.updateOne({ _id: conv._id }, { $set: { lastText: input.text.slice(0, 140), lastAt: new Date() }, $inc: { [s.otherUnread]: 1 } });
}
