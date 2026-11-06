import "server-only";
import { isValidObjectId, Types } from "mongoose";
import { AppError } from "@/lib/api";
import { connectDb } from "@/lib/db";
import { Partnership } from "@/models/Partnership";
import { Product } from "@/models/Product";
import { StoreStock, type StoreStockDoc } from "@/models/StoreStock";
import { User } from "@/models/User";
import { notify } from "./notify";

export type StockRow = {
  id: string;
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  minLevel: number;
  low: boolean;
  seller: { id: string; name: string };
  updatedAt: string;
};

async function toRows(docs: StoreStockDoc[]): Promise<StockRow[]> {
  const sellers = await User.find({ _id: { $in: [...new Set(docs.map((d) => String(d.seller)))] } }, { name: 1 }).lean();
  const name = new Map(sellers.map((s) => [String(s._id), s.name]));
  return docs.map((d) => ({
    id: String(d._id),
    productId: String(d.product),
    name: d.name,
    unit: d.unit,
    quantity: d.quantity,
    minLevel: d.minLevel,
    low: d.quantity <= d.minLevel,
    seller: { id: String(d.seller), name: name.get(String(d.seller)) ?? "—" },
    updatedAt: d.updatedAt.toISOString(),
  }));
}

/** Do'konning o'z ombori. Kam qolganlar birinchi. */
export async function listMyStock(buyerId: string): Promise<StockRow[]> {
  await connectDb();
  const docs = await StoreStock.find({ buyer: buyerId }).sort({ name: 1 }).lean<StoreStockDoc[]>();
  return (await toRows(docs)).sort((a, b) => Number(b.low) - Number(a.low));
}

/** Do'kon qoldiqni yangilaydi (sotilgani ayirilgan holda) yoki yangi mahsulot qo'shadi. */
export async function setStock(buyer: { id: string; name: string }, productId: string, quantity: number, minLevel: number): Promise<void> {
  if (!isValidObjectId(productId)) throw new AppError("NOT_FOUND");
  await connectDb();
  const product = await Product.findById(productId, { seller: 1, name: 1, unit: 1 }).lean();
  if (!product) throw new AppError("NOT_FOUND");
  const before = await StoreStock.findOne({ buyer: buyer.id, product: productId }, { quantity: 1, minLevel: 1 }).lean();
  await StoreStock.updateOne(
    { buyer: buyer.id, product: productId },
    { $set: { quantity, minLevel }, $setOnInsert: { seller: product.seller, name: product.name, unit: product.unit } },
    { upsert: true },
  );
  // Qoldiq chegaradan pastga tushsa — hamkor kompaniyaga xabar (agar do'kon ruxsat bergan bo'lsa).
  const wasLow = before ? before.quantity <= before.minLevel : false;
  if (!wasLow && quantity <= minLevel && minLevel > 0) {
    const p = await Partnership.findOne({ seller: product.seller, buyer: buyer.id, status: "active", shareStock: true }).lean();
    if (p) await notify(product.seller, "stockLow", { name: buyer.name, product: product.name }, `/partners/${buyer.id}`);
  }
}

export async function removeStock(buyerId: string, id: string): Promise<void> {
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  await StoreStock.deleteOne({ _id: id, buyer: buyerId });
}

/**
 * Kompaniya uchun: hamkor do'kon omboridagi FAQAT shu kompaniya mahsulotlari.
 * Hamkorlik faol bo'lishi va do'kon ruxsat bergan bo'lishi kerak.
 */
export async function partnerStock(sellerId: string, buyerId: string): Promise<StockRow[] | null> {
  if (!isValidObjectId(buyerId)) return null;
  await connectDb();
  const p = await Partnership.findOne({ seller: sellerId, buyer: buyerId, status: "active", shareStock: true }).lean();
  if (!p) return null;
  const docs = await StoreStock.find({ buyer: buyerId, seller: sellerId }).sort({ name: 1 }).lean<StoreStockDoc[]>();
  return (await toRows(docs)).sort((a, b) => Number(b.low) - Number(a.low));
}

/** Kompaniya bosh sahifasi uchun: qaysi hamkor do'konlarda mahsulotim kam qolgan. */
export async function lowStockAcrossPartners(sellerId: string): Promise<{ buyerId: string; buyerName: string; items: number }[]> {
  await connectDb();
  const partners = await Partnership.find({ seller: sellerId, status: "active", shareStock: true }, { buyer: 1 }).lean();
  if (!partners.length) return [];
  const rows = await StoreStock.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { seller: new Types.ObjectId(sellerId), buyer: { $in: partners.map((p) => p.buyer) }, $expr: { $lte: ["$quantity", "$minLevel"] } } },
    { $group: { _id: "$buyer", n: { $sum: 1 } } },
  ]);
  const names = await User.find({ _id: { $in: rows.map((r) => r._id) } }, { name: 1 }).lean();
  const name = new Map(names.map((u) => [String(u._id), u.name]));
  return rows.map((r) => ({ buyerId: String(r._id), buyerName: name.get(String(r._id)) ?? "—", items: r.n })).sort((a, b) => b.items - a.items);
}
