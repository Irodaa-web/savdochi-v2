import "server-only";
import { isValidObjectId } from "mongoose";
import { AppError } from "@/lib/api";
import type { SessionUser } from "@/lib/auth/session";
import { activeSalePrice } from "@/lib/catalog";
import { connectDb } from "@/lib/db";
import type { OrderStatus } from "@/lib/orders";
import { Conversation, Message, type ConversationDoc, type MessageDoc } from "@/models/Chat";
import { Order } from "@/models/Order";
import { Product, type ProductDoc } from "@/models/Product";
import { User } from "@/models/User";

export type ConversationView = {
  id: string;
  partner: { id: string; name: string; verified: boolean; logo: string };
  /** Suhbatdagi kompaniya (mahsulot tanlash uchun). */
  sellerId: string;
  lastText: string;
  lastAt: string;
  unread: number;
  /** Suhbatdosh oxirgi marta qachon o'qigan (✓✓) — faqat xabarlar ochilganda. */
  partnerReadAt?: string | null;
  /** Suhbatdosh hozir yozmoqda. */
  partnerTyping?: boolean;
};

export type ProductCardView = { id: string; name: string; category: string; image: string; price: number; oldPrice: number | null; unit: string; minOrder: number; available: boolean; sellerId: string };
export type OrderCardView = { id: string; number: number; status: OrderStatus; total: number; items: number };
export type MessageView = {
  id: string;
  mine: boolean;
  text: string;
  image: string;
  deleted: boolean;
  order: OrderCardView | null;
  product: ProductCardView | null;
  createdAt: string;
};

/** "Yozmoqda…" shuncha vaqt amal qiladi (mijoz har ~3 soniyada yangilaydi). */
const TYPING_MS = 6_000;

const side = (user: SessionUser) =>
  user.role === "seller"
    ? ({ me: "seller", other: "buyer", unread: "unreadSeller", otherUnread: "unreadBuyer", read: "readAtSeller", otherRead: "readAtBuyer", typing: "typingSellerAt", otherTyping: "typingBuyerAt", cleared: "clearedSellerAt" } as const)
    : ({ me: "buyer", other: "seller", unread: "unreadBuyer", otherUnread: "unreadSeller", read: "readAtBuyer", otherRead: "readAtSeller", typing: "typingBuyerAt", otherTyping: "typingSellerAt", cleared: "clearedBuyerAt" } as const);

export async function listConversations(user: SessionUser): Promise<ConversationView[]> {
  await connectDb();
  const s = side(user);
  const docs = await Conversation.find({ [s.me]: user.id }).sort({ lastAt: -1 }).limit(100).lean<ConversationDoc[]>();
  const users = await User.find({ _id: { $in: docs.map((d) => d[s.other]) } }, { name: 1, verification: 1, logo: 1 }).lean();
  const by = new Map(users.map((u) => [String(u._id), u]));
  return docs.map((d) => {
    const u = by.get(String(d[s.other]));
    // Tarixini tozalagan tomon uchun eski oxirgi xabar ko'rsatilmaydi.
    const cleared = d[s.cleared] && d.lastAt <= d[s.cleared]!;
    return {
      id: String(d._id),
      partner: { id: String(d[s.other]), name: u?.name ?? "—", verified: u?.verification === "verified", logo: u?.logo ?? "" },
      sellerId: String(d.seller),
      lastText: cleared ? "" : d.lastText,
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

function productCard(p: ProductDoc): ProductCardView {
  const sale = activeSalePrice(p);
  return {
    id: String(p._id),
    name: p.name,
    category: p.category,
    image: p.images?.[0] ?? "",
    price: sale ?? p.price,
    oldPrice: sale != null ? p.price : null,
    unit: p.unit,
    minOrder: p.minOrder,
    available: p.active && !p.hiddenByAdmin && p.stock >= p.minOrder,
    sellerId: String(p.seller),
  };
}

/**
 * Xabarlar (eskisidan yangisiga). `after` — shu vaqtdan keyin yangi yoki o'zgargan (o'chirilgan) xabarlar.
 * Javobdagi `cursor` — keyingi so'rovda `after` sifatida yuboriladi (so'rov boshlangan vaqt: hech narsa tushib qolmaydi).
 * Ochilganda suhbat o'qilgan deb belgilanadi (suhbatdoshda ✓✓).
 */
export async function listMessages(user: SessionUser, id: string, after?: string): Promise<{ conversation: ConversationView; messages: MessageView[]; cursor: string }> {
  const cursor = new Date();
  const conv = await ownConversation(user, id);
  const s = side(user);
  const filter: Record<string, unknown> = { conversation: conv._id };
  const and: Record<string, unknown>[] = [];
  if (conv[s.cleared]) and.push({ createdAt: { $gt: conv[s.cleared] } });
  const afterDate = after ? new Date(after) : null;
  if (afterDate && !Number.isNaN(afterDate.getTime())) and.push({ $or: [{ updatedAt: { $gt: afterDate } }, { updatedAt: { $exists: false }, createdAt: { $gt: afterDate } }] });
  if (and.length) filter.$and = and;
  const docs = await Message.find(filter).sort({ createdAt: -1 }).limit(200).lean<MessageDoc[]>();
  docs.reverse();
  const readAt = conv[s.read];
  if (conv[s.unread] > 0 || !readAt || readAt < conv.lastAt) await Conversation.updateOne({ _id: conv._id }, { $set: { [s.unread]: 0, [s.read]: cursor } });

  const live = docs.filter((d) => !d.deletedAt);
  const [orders, products, partner] = await Promise.all([
    Order.find({ _id: { $in: live.map((d) => d.order).filter(Boolean) } }, { number: 1, status: 1, total: 1, items: 1 }).lean(),
    Product.find({ _id: { $in: live.map((d) => d.product).filter(Boolean) } }).lean<ProductDoc[]>(),
    User.findById(conv[s.other], { name: 1, verification: 1, logo: 1 }).lean(),
  ]);
  const orderBy = new Map(orders.map((o) => [String(o._id), { id: String(o._id), number: o.number, status: o.status as OrderStatus, total: o.total, items: o.items?.length ?? 0 }]));
  const productBy = new Map(products.map((p) => [String(p._id), productCard(p)]));
  const typingAt = conv[s.otherTyping];
  return {
    conversation: {
      id: String(conv._id),
      partner: { id: String(conv[s.other]), name: partner?.name ?? "—", verified: partner?.verification === "verified", logo: partner?.logo ?? "" },
      sellerId: String(conv.seller),
      lastText: conv.lastText,
      lastAt: conv.lastAt.toISOString(),
      unread: 0,
      partnerReadAt: conv[s.otherRead] ? conv[s.otherRead]!.toISOString() : null,
      partnerTyping: Boolean(typingAt && cursor.getTime() - typingAt.getTime() < TYPING_MS),
    },
    messages: docs.map((m) => ({
      id: String(m._id),
      mine: String(m.sender) === user.id,
      deleted: Boolean(m.deletedAt),
      text: m.deletedAt ? "" : m.text,
      image: m.deletedAt ? "" : (m.image ?? ""),
      order: !m.deletedAt && m.order ? (orderBy.get(String(m.order)) ?? null) : null,
      product: !m.deletedAt && m.product ? (productBy.get(String(m.product)) ?? null) : null,
      createdAt: m.createdAt.toISOString(),
    })),
    cursor: cursor.toISOString(),
  };
}

/** Ro'yxatdagi qisqa matn: matn, bo'lmasa — rasm / mahsulot / buyurtma belgisi. */
function preview(m: { text?: string; image?: string; productName?: string | null; orderNumber?: number | null }): string {
  if (m.text) return m.text.slice(0, 140);
  if (m.image) return "📷";
  if (m.productName != null) return `📦 ${m.productName}`.trim().slice(0, 140);
  if (m.orderNumber != null) return `🧾 №${m.orderNumber}`;
  return "";
}

export async function sendMessage(user: SessionUser, id: string, input: { text?: string; image?: string; orderId?: string; productId?: string }): Promise<void> {
  const conv = await ownConversation(user, id);
  const s = side(user);
  // Buyurtma faqat shu ikki tomon o'rtasidagi bo'lsa; mahsulot — faqat shu suhbatdagi kompaniyaniki.
  const order = input.orderId && isValidObjectId(input.orderId) ? await Order.findOne({ _id: input.orderId, seller: conv.seller, buyer: conv.buyer }, { _id: 1, number: 1 }).lean() : null;
  const product = input.productId && isValidObjectId(input.productId) ? await Product.findOne({ _id: input.productId, seller: conv.seller, active: true }, { _id: 1, name: 1 }).lean() : null;
  const text = input.text?.trim() ?? "";
  const image = input.image ?? "";
  if (!text && !image && !order && !product) throw new AppError("INVALID_INPUT", { text: "messageEmpty" });
  await Message.create({ conversation: conv._id, sender: user.id, text, image, order: order?._id ?? null, product: product?._id ?? null });
  const now = new Date();
  await Conversation.updateOne(
    { _id: conv._id },
    { $set: { lastText: preview({ text, image, productName: product?.name, orderNumber: order?.number }), lastAt: now, [s.read]: now, [s.typing]: null }, $inc: { [s.otherUnread]: 1 } },
  );
}

/** Yuboruvchi o'z xabarini hamma uchun o'chiradi (o'rnida "Xabar o'chirildi" qoladi). */
export async function deleteMessage(user: SessionUser, convId: string, messageId: string): Promise<void> {
  const conv = await ownConversation(user, convId);
  if (!isValidObjectId(messageId)) throw new AppError("NOT_FOUND");
  const res = await Message.updateOne({ _id: messageId, conversation: conv._id, sender: user.id, deletedAt: null }, { $set: { deletedAt: new Date(), text: "", image: "", order: null, product: null } });
  if (res.modifiedCount !== 1) throw new AppError("NOT_FOUND");
  // Ro'yxatdagi oxirgi matn: o'chirilmagan eng so'nggi xabar.
  const last = await Message.findOne({ conversation: conv._id, deletedAt: null }).sort({ createdAt: -1 }).lean<MessageDoc>();
  const [lp, lo] = await Promise.all([
    last?.product ? Product.findById(last.product, { name: 1 }).lean() : null,
    last?.order ? Order.findById(last.order, { number: 1 }).lean() : null,
  ]);
  await Conversation.updateOne({ _id: conv._id }, { $set: { lastText: last ? preview({ text: last.text, image: last.image, productName: lp?.name ?? null, orderNumber: lo?.number ?? null }) : "" } });
}

/** Tarixni faqat o'zi uchun tozalaydi: suhbatdoshda xabarlar saqlanib qoladi. */
export async function clearHistory(user: SessionUser, convId: string): Promise<void> {
  const conv = await ownConversation(user, convId);
  const s = side(user);
  await Conversation.updateOne({ _id: conv._id }, { $set: { [s.cleared]: new Date(), [s.unread]: 0 } });
}

/** "Yozmoqda…" belgisi (mijoz yozayotganda bir necha soniyada bir yuboradi). */
export async function setTyping(user: SessionUser, convId: string): Promise<void> {
  const conv = await ownConversation(user, convId);
  await Conversation.updateOne({ _id: conv._id }, { $set: { [side(user).typing]: new Date() } });
}
