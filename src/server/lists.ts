import "server-only";
import { isValidObjectId } from "mongoose";
import { AppError } from "@/lib/api";
import type { SessionUser } from "@/lib/auth/session";
import { activeSalePrice, unitPriceFor } from "@/lib/catalog";
import { connectDb } from "@/lib/db";
import { Order } from "@/models/Order";
import { OrderList, type OrderListDoc } from "@/models/OrderList";
import { Product, type ProductDoc } from "@/models/Product";
import { User } from "@/models/User";
import { addManyToCart, type BulkAddResult } from "./cart";

export const MAX_LISTS = 20;

export type OrderListView = {
  id: string;
  name: string;
  items: { productId: string; name: string; unit: string; quantity: number; unitPrice: number; available: boolean; seller: string }[];
  /** Hozirgi narxlar bo'yicha taxminiy summa (sotuvda bor mahsulotlar). */
  estimate: number;
  sellers: string[];
  lastUsedAt: string | null;
  updatedAt: string;
};

async function toViews(docs: OrderListDoc[]): Promise<OrderListView[]> {
  const products = await Product.find({ _id: { $in: docs.flatMap((d) => d.items.map((i) => i.product)) } }).lean<ProductDoc[]>();
  const sellers = await User.find({ _id: { $in: [...new Set(products.map((p) => String(p.seller)))] } }, { name: 1 }).lean();
  const sellerName = new Map(sellers.map((s) => [String(s._id), s.name]));
  const byId = new Map(products.map((p) => [String(p._id), p]));
  return docs.map((d) => {
    const items = d.items.map((i) => {
      const p = byId.get(String(i.product));
      const available = Boolean(p?.active && p.stock >= p.minOrder);
      return {
        productId: String(i.product),
        name: p?.name ?? i.name,
        unit: i.unit,
        quantity: i.quantity,
        unitPrice: p ? unitPriceFor(i.quantity, p.price, p.priceTiers ?? [], activeSalePrice(p)) : 0,
        available,
        seller: p ? (sellerName.get(String(p.seller)) ?? "—") : "—",
      };
    });
    return {
      id: String(d._id),
      name: d.name,
      items,
      estimate: items.filter((i) => i.available).reduce((s, i) => s + i.unitPrice * i.quantity, 0),
      sellers: [...new Set(items.map((i) => i.seller).filter((s) => s !== "—"))],
      lastUsedAt: d.lastUsedAt ? d.lastUsedAt.toISOString() : null,
      updatedAt: d.updatedAt.toISOString(),
    };
  });
}

export async function listOrderLists(buyerId: string): Promise<OrderListView[]> {
  await connectDb();
  const docs = await OrderList.find({ buyer: buyerId }).sort({ lastUsedAt: -1, updatedAt: -1 }).lean<OrderListDoc[]>();
  return toViews(docs);
}

/** Buyurtmadan ro'yxat yaratish (yoki mavjud ro'yxatga shu buyurtma mahsulotlarini qo'shish). */
export async function saveOrderAsList(user: SessionUser, orderId: string, input: { name: string; listId?: string }): Promise<OrderListView> {
  if (!isValidObjectId(orderId)) throw new AppError("NOT_FOUND");
  await connectDb();
  const order = await Order.findOne({ _id: orderId, buyer: user.id }, { items: 1 }).lean();
  if (!order) throw new AppError("NOT_FOUND");
  const fresh = order.items.map((i) => ({ product: i.product, name: i.name, unit: i.unit, quantity: i.quantity }));

  let doc: OrderListDoc | null;
  if (input.listId) {
    if (!isValidObjectId(input.listId)) throw new AppError("NOT_FOUND");
    const list = await OrderList.findOne({ _id: input.listId, buyer: user.id });
    if (!list) throw new AppError("NOT_FOUND");
    // Bor mahsulotning miqdori yangilanadi, yo'g'i qo'shiladi.
    for (const item of fresh) {
      const existing = list.items.find((i) => String(i.product) === String(item.product));
      if (existing) existing.quantity = item.quantity;
      else list.items.push(item);
    }
    if (list.items.length > 100) throw new AppError("INVALID_INPUT", { items: "listTooLong" });
    await list.save();
    doc = list.toObject() as OrderListDoc;
  } else {
    if ((await OrderList.countDocuments({ buyer: user.id })) >= MAX_LISTS) throw new AppError("INVALID_INPUT", { name: "listsLimit" });
    doc = (await OrderList.create({ buyer: user.id, name: input.name, items: fresh })).toObject() as OrderListDoc;
  }
  return (await toViews([doc]))[0]!;
}

/** Nomini va/yoki miqdorlarni o'zgartirish. Miqdor 0 — mahsulot ro'yxatdan olib tashlanadi. */
export async function updateOrderList(user: SessionUser, id: string, input: { name?: string; items?: { productId: string; quantity: number }[] }): Promise<OrderListView> {
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const list = await OrderList.findOne({ _id: id, buyer: user.id });
  if (!list) throw new AppError("NOT_FOUND");
  if (input.name) list.name = input.name;
  if (input.items) {
    const wanted = new Map(input.items.map((i) => [i.productId, i.quantity]));
    list.items = list.items.flatMap((i) => {
      const q = wanted.get(String(i.product)) ?? i.quantity;
      return q > 0 ? [{ product: i.product, name: i.name, unit: i.unit, quantity: q }] : [];
    });
    if (!list.items.length) throw new AppError("INVALID_INPUT", { items: "listEmpty" });
  }
  await list.save();
  return (await toViews([list.toObject() as OrderListDoc]))[0]!;
}

export async function deleteOrderList(user: SessionUser, id: string): Promise<void> {
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const res = await OrderList.deleteOne({ _id: id, buyer: user.id });
  if (!res.deletedCount) throw new AppError("NOT_FOUND");
}

/** Ro'yxatni savatga solish. */
export async function orderListToCart(user: SessionUser, id: string): Promise<BulkAddResult> {
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const list = await OrderList.findOne({ _id: id, buyer: user.id }).lean<OrderListDoc>();
  if (!list) throw new AppError("NOT_FOUND");
  const result = await addManyToCart(user.id, list.items.map((i) => ({ productId: String(i.product), quantity: i.quantity })));
  await OrderList.updateOne({ _id: list._id }, { $set: { lastUsedAt: new Date() } });
  return result;
}
