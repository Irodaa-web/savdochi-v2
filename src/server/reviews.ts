import "server-only";
import { isValidObjectId, Types } from "mongoose";
import { AppError } from "@/lib/api";
import type { SessionUser } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { Order } from "@/models/Order";
import { Review, type ReviewDoc } from "@/models/Review";
import { User } from "@/models/User";
import { notify } from "./notify";

export type Rating = { average: number; count: number };
export type ReviewView = { id: string; rating: number; text: string; reply: string; repliedAt: string | null; buyerName: string; orderNumber: number; orderId: string; createdAt: string };

const toView = (r: ReviewDoc, buyerName: string): ReviewView => ({
  id: String(r._id),
  rating: r.rating,
  text: r.text,
  reply: r.reply,
  repliedAt: r.repliedAt ? r.repliedAt.toISOString() : null,
  buyerName,
  orderNumber: r.orderNumber,
  orderId: String(r.order),
  createdAt: r.createdAt.toISOString(),
});

/**
 * Do'kon yetkazilgan buyurtmaga baho qo'yadi yoki bahosini yangilaydi.
 * Birinchi marta qo'yilganda kompaniyaga bildirishnoma boradi.
 */
export async function rateOrder(user: SessionUser, orderId: string, input: { rating: number; text: string }): Promise<ReviewView> {
  if (!isValidObjectId(orderId)) throw new AppError("NOT_FOUND");
  await connectDb();
  const order = await Order.findOne({ _id: orderId, buyer: user.id }, { seller: 1, number: 1, status: 1 }).lean();
  if (!order) throw new AppError("NOT_FOUND");
  if (order.status !== "delivered") throw new AppError("INVALID_STATE");
  const existed = await Review.exists({ order: order._id });
  const doc = await Review.findOneAndUpdate(
    { order: order._id },
    { $set: { rating: input.rating, text: input.text.trim() }, $setOnInsert: { seller: order.seller, buyer: user.id, orderNumber: order.number } },
    { upsert: true, new: true, runValidators: true },
  ).lean<ReviewDoc>();
  if (!existed) await notify(order.seller, "reviewNew", { name: user.name, rating: input.rating, number: order.number }, `/suppliers/${order.seller}#reviews`);
  return toView(doc!, user.name);
}

/** Kompaniya o'ziga yozilgan sharhga javob beradi (yoki javobni o'zgartiradi). */
export async function replyReview(user: SessionUser, reviewId: string, text: string): Promise<ReviewView> {
  if (!isValidObjectId(reviewId)) throw new AppError("NOT_FOUND");
  await connectDb();
  const reply = text.trim();
  const doc = await Review.findOneAndUpdate({ _id: reviewId, seller: user.id }, { $set: { reply, repliedAt: reply ? new Date() : null } }, { new: true }).lean<ReviewDoc>();
  if (!doc) throw new AppError("NOT_FOUND");
  const buyer = await User.findById(doc.buyer, { name: 1 }).lean();
  return toView(doc, buyer?.name ?? "—");
}

/** Buyurtmaga qo'yilgan baho (buyurtma sahifasi uchun). */
export async function reviewForOrder(orderId: string): Promise<ReviewView | null> {
  if (!isValidObjectId(orderId)) return null;
  await connectDb();
  const doc = await Review.findOne({ order: orderId }).lean<ReviewDoc>();
  if (!doc) return null;
  const buyer = await User.findById(doc.buyer, { name: 1 }).lean();
  return toView(doc, buyer?.name ?? "—");
}

/** Kompaniya sahifasi: reyting, yulduzlar bo'yicha taqsimot va oxirgi sharhlar. */
export async function sellerReviews(sellerId: string, limit = 20): Promise<{ rating: Rating; stars: number[]; items: ReviewView[] }> {
  const empty = { rating: { average: 0, count: 0 }, stars: [0, 0, 0, 0, 0], items: [] };
  if (!isValidObjectId(sellerId)) return empty;
  await connectDb();
  const [docs, dist] = await Promise.all([
    Review.find({ seller: sellerId }).sort({ createdAt: -1 }).limit(limit).lean<ReviewDoc[]>(),
    Review.aggregate<{ _id: number; n: number }>([{ $match: { seller: new Types.ObjectId(sellerId) } }, { $group: { _id: "$rating", n: { $sum: 1 } } }]),
  ]);
  const stars = [1, 2, 3, 4, 5].map((s) => dist.find((d) => d._id === s)?.n ?? 0);
  const count = stars.reduce((a, b) => a + b, 0);
  const average = count ? stars.reduce((sum, n, i) => sum + n * (i + 1), 0) / count : 0;
  const buyers = await User.find({ _id: { $in: docs.map((d) => d.buyer) } }, { name: 1 }).lean();
  const names = new Map(buyers.map((b) => [String(b._id), b.name]));
  return { rating: { average, count }, stars, items: docs.map((d) => toView(d, names.get(String(d.buyer)) ?? "—")) };
}

/** Bir nechta kompaniyaning reytingi (katalog kartalari uchun) — bitta agregatsiya. */
export async function ratingsFor(sellerIds: string[]): Promise<Map<string, Rating>> {
  const ids = sellerIds.filter((id) => isValidObjectId(id)).map((id) => new Types.ObjectId(id));
  if (!ids.length) return new Map();
  await connectDb();
  const rows = await Review.aggregate<{ _id: Types.ObjectId; average: number; count: number }>([
    { $match: { seller: { $in: ids } } },
    { $group: { _id: "$seller", average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), { average: r.average, count: r.count }]));
}
