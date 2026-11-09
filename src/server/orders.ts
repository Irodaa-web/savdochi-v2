import "server-only";
import { isValidObjectId, type ClientSession, type FilterQuery } from "mongoose";
import { AppError } from "@/lib/api";
import type { SessionUser } from "@/lib/auth/session";
import { connectDb, withTransaction } from "@/lib/db";
import { ORDER_TRANSITIONS, type OrderStatus, type PaymentMethod, type PaymentStatus } from "@/lib/orders";
import type { RegionCode } from "@/lib/regions";
import type { CheckoutInput } from "@/lib/validation";
import { nextSeq } from "@/models/Counter";
import { Order, type OrderDoc } from "@/models/Order";
import { Product } from "@/models/Product";
import { StoreStock } from "@/models/StoreStock";
import { User } from "@/models/User";
import { getCart, removeCartItems, setCartItem } from "./cart";
import { notify } from "./notify";

export type OrderView = {
  id: string;
  number: number;
  buyer: { id: string; name: string; phone: string };
  seller: { id: string; name: string; phone: string };
  items: { productId: string; name: string; unit: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  discountPercent: number;
  discount: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  delivery: { phone: string; region: RegionCode; address: string; lat: number | null; lng: number | null; date: string | null };
  comment: string;
  history: { status: OrderStatus; by: string; at: string }[];
  createdAt: string;
};

async function toViews(docs: OrderDoc[]): Promise<OrderView[]> {
  const ids = [...new Set(docs.flatMap((d) => [String(d.buyer), String(d.seller)]))];
  const users = await User.find({ _id: { $in: ids } }, { name: 1, phone: 1 }).lean();
  const by = new Map(users.map((u) => [String(u._id), u]));
  const party = (id: unknown) => {
    const u = by.get(String(id));
    return { id: String(id), name: u?.name ?? "—", phone: u?.phone ?? "" };
  };
  return docs.map((d) => ({
    id: String(d._id),
    number: d.number,
    buyer: party(d.buyer),
    seller: party(d.seller),
    items: d.items.map((i) => ({ productId: String(i.product), name: i.name, unit: i.unit, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
    subtotal: d.subtotal,
    discountPercent: d.discountPercent,
    discount: d.discount,
    deliveryFee: d.deliveryFee,
    total: d.total,
    status: d.status,
    paymentMethod: d.paymentMethod,
    paymentStatus: d.paymentStatus,
    paidAmount: d.paidAmount,
    delivery: { ...d.delivery, date: d.delivery.date ? new Date(d.delivery.date).toISOString() : null },
    comment: d.comment,
    history: (d.history ?? []).map((h) => ({ status: h.status, by: h.by, at: new Date(h.at).toISOString() })),
    createdAt: d.createdAt.toISOString(),
  }));
}

const sideKey = (user: SessionUser) => (user.role === "seller" ? "seller" : "buyer");

export async function listOrders(user: SessionUser, opts: { status?: OrderStatus | "open"; partnerId?: string; limit?: number } = {}): Promise<OrderView[]> {
  await connectDb();
  const filter: FilterQuery<OrderDoc> = { [sideKey(user)]: user.id };
  if (opts.status === "open") filter.status = { $in: ["new", "confirmed", "shipped"] };
  else if (opts.status) filter.status = opts.status;
  if (opts.partnerId && isValidObjectId(opts.partnerId)) filter[user.role === "seller" ? "buyer" : "seller"] = opts.partnerId;
  const docs = await Order.find(filter).sort({ createdAt: -1 }).limit(opts.limit ?? 100).lean<OrderDoc[]>();
  return toViews(docs);
}

export async function getOrder(user: SessionUser, id: string): Promise<OrderView | null> {
  if (!isValidObjectId(id)) return null;
  await connectDb();
  const doc = await Order.findOne({ _id: id, [sideKey(user)]: user.id }).lean<OrderDoc>();
  return doc ? (await toViews([doc]))[0]! : null;
}

type StockLine = { productId: string; quantity: number };

/** Omborni kamaytiradi; birortasi yetmasa xato tashlaydi (tranzaksiya hammasini bekor qiladi). */
async function takeStock(items: StockLine[], session: ClientSession): Promise<void> {
  for (const item of items) {
    const res = await Product.updateOne({ _id: item.productId, active: true, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { session });
    if (res.modifiedCount !== 1) throw new AppError("OUT_OF_STOCK");
  }
}

async function returnStock(items: StockLine[], session: ClientSession): Promise<void> {
  for (const item of items) await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } }, { session });
}

const isDuplicateKey = (error: unknown) => (error as { code?: number } | null)?.code === 11000;

async function findByRequestId(user: SessionUser, requestId: string | undefined): Promise<OrderView | null> {
  if (!requestId) return null;
  const doc = await Order.findOne({ buyer: user.id, requestId }).lean<OrderDoc>();
  return doc ? (await toViews([doc]))[0]! : null;
}

/**
 * Savatdagi bitta sotuvchi guruhidan buyurtma yaratadi.
 * Ombor, buyurtma va savat bitta tranzaksiyada o'zgaradi; `requestId` qayta kelsa — o'sha buyurtma qaytadi.
 */
export async function checkout(user: SessionUser, input: CheckoutInput): Promise<OrderView> {
  await connectDb();
  const existing = await findByRequestId(user, input.requestId);
  if (existing) return existing;

  const cart = await getCart(user.id);
  const group = cart.groups.find((g) => g.seller.id === input.sellerId);
  if (!group || !group.lines.length) throw new AppError("CART_EMPTY");
  if (group.lines.some((l) => l.problem === "unavailable")) throw new AppError("NOT_FOUND");
  if (group.lines.some((l) => l.problem === "outOfStock")) throw new AppError("OUT_OF_STOCK");
  if (group.lines.some((l) => l.problem === "belowMin") || group.belowMinTotal) throw new AppError("BELOW_MIN_ORDER");
  if (!group.terms.paymentMethods.includes(input.paymentMethod)) throw new AppError("INVALID_INPUT", { paymentMethod: "paymentRequired" });

  const items = group.lines.map((l) => ({ productId: l.productId, quantity: l.quantity }));
  // Raqam tranzaksiyadan tashqarida olinadi: hisoblagich hujjati ziddiyat nuqtasiga aylanmasin (bo'shliq bo'lishi mumkin).
  const number = await nextSeq("order");
  let order: OrderDoc;
  try {
    order = await withTransaction(async (session) => {
      await takeStock(items, session);
      const [created] = await Order.create(
        [
          {
            number,
            buyer: user.id,
            seller: input.sellerId,
            items: group.lines.map((l) => ({ product: l.productId, name: l.name, unit: l.unit, quantity: l.quantity, unitPrice: l.unitPrice, total: l.total })),
            subtotal: group.subtotal,
            discountPercent: group.discountPercent,
            discount: group.discount,
            deliveryFee: group.deliveryFee,
            total: group.total,
            paymentMethod: input.paymentMethod,
            delivery: { phone: input.phone, region: input.region, address: input.address, lat: input.lat, lng: input.lng, date: null },
            comment: input.comment,
            history: [{ status: "new", by: "buyer", at: new Date() }],
            ...(input.requestId ? { requestId: input.requestId } : {}),
          },
        ],
        { session },
      );
      await removeCartItems(user.id, items.map((i) => i.productId), session);
      return created!.toObject() as OrderDoc;
    });
  } catch (error) {
    // Bir xil requestId bilan parallel so'rov: birinchisi yutdi — o'shani qaytaramiz.
    if (isDuplicateKey(error)) {
      const winner = await findByRequestId(user, input.requestId);
      if (winner) return winner;
    }
    throw error;
  }

  // Do'kon manzilini keyingi safar uchun eslab qoladi.
  await User.updateOne({ _id: user.id }, { $set: { "profile.address": input.address, ...(input.lat !== null ? { "profile.lat": input.lat, "profile.lng": input.lng } : {}) } });
  await notify(input.sellerId, "orderNew", { number: order.number, name: user.name }, `/orders/${order._id}`);
  return (await toViews([order]))[0]!;
}

/** Holat, to'lov va yetkazish sanasini o'zgartirish (har bir tomon o'z huquqi doirasida). */
export async function updateOrder(
  user: SessionUser,
  id: string,
  input: { status?: OrderStatus; paymentStatus?: PaymentStatus; paidAmount?: number; deliveryDate?: string | null },
): Promise<OrderView> {
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const side = sideKey(user);
  const order = await Order.findOne({ _id: id, [side]: user.id });
  if (!order) throw new AppError("NOT_FOUND");
  const other = side === "seller" ? order.buyer : order.seller;
  const link = `/orders/${order._id}`;

  if (input.status && input.status !== order.status) {
    const allowed = ORDER_TRANSITIONS[side][order.status] ?? [];
    if (!allowed.includes(input.status)) throw new AppError("INVALID_STATE");
    const from = order.status;
    const to = input.status;
    const snapshot = order.toObject() as OrderDoc;
    // Holat va ombor bitta tranzaksiyada: ombor faqat bir marta qaytariladi/qo'shiladi.
    await withTransaction(async (session) => {
      // Shartli yangilash: ikki tomon bir vaqtda o'zgartirsa, faqat bittasi o'tadi.
      const res = await Order.updateOne({ _id: order._id, status: from }, { $set: { status: to }, $push: { history: { status: to, by: side, at: new Date() } } }, { session });
      if (res.modifiedCount !== 1) throw new AppError("INVALID_STATE");
      if (to === "cancelled") await returnStock(snapshot.items.map((i) => ({ productId: String(i.product), quantity: i.quantity })), session);
      if (to === "delivered") await addToStoreStock(snapshot, session);
    });
    order.status = to;
    await notify(other, "orderStatus", { number: order.number, status: input.status }, link);
  }

  if (side === "seller") {
    let paymentChanged = false;
    if (input.paymentStatus && input.paymentStatus !== order.paymentStatus) {
      order.paymentStatus = input.paymentStatus;
      if (input.paymentStatus === "paid") order.paidAmount = order.total;
      if (input.paymentStatus === "unpaid") order.paidAmount = 0;
      paymentChanged = true;
    }
    if (input.paidAmount !== undefined && order.paymentStatus === "partial") {
      order.paidAmount = Math.min(input.paidAmount, order.total);
      paymentChanged = true;
    }
    if (input.deliveryDate !== undefined) order.delivery.date = input.deliveryDate ? new Date(input.deliveryDate) : null;
    await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: order.paymentStatus, paidAmount: order.paidAmount, "delivery.date": order.delivery.date } });
    if (paymentChanged) await notify(other, "orderPayment", { number: order.number, status: order.paymentStatus }, link);
  }

  return (await getOrder(user, id))!;
}

/** Yetkazilgan mahsulotlar do'kon omboriga qo'shiladi. */
async function addToStoreStock(order: OrderDoc, session: ClientSession): Promise<void> {
  for (const item of order.items) {
    await StoreStock.updateOne(
      { buyer: order.buyer, product: item.product },
      { $inc: { quantity: item.quantity }, $setOnInsert: { seller: order.seller, name: item.name, unit: item.unit, minLevel: 0 } },
      { upsert: true, session },
    );
  }
}

/** Buyurtmani takrorlash: mahsulotlarni savatga qo'shadi. Mavjud bo'lmaganlarini qaytaradi. */
export async function reorder(user: SessionUser, id: string): Promise<{ added: number; skipped: string[] }> {
  const order = await getOrder(user, id);
  if (!order) throw new AppError("NOT_FOUND");
  let added = 0;
  const skipped: string[] = [];
  for (const item of order.items) {
    try {
      await setCartItem(user.id, item.productId, item.quantity, true);
      added += 1;
    } catch {
      skipped.push(item.name);
    }
  }
  return { added, skipped };
}
