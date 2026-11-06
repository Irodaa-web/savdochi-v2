import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { Order } from "@/models/Order";
import { Partnership } from "@/models/Partnership";
import { User } from "@/models/User";

export type SellerReport = {
  days: number;
  totalOrders: number;
  orderValue: number;
  paidValue: number;
  unpaidValue: number;
  repeatPartners: number;
  newOrders: number;
  topProducts: { name: string; quantity: number; value: number }[];
  /** Ilgari buyurtma bergan, lekin 30 kundan beri bermagan hamkorlar. */
  inactive: { id: string; name: string; days: number }[];
  daily: { day: string; value: number }[];
};

export async function sellerReport(sellerId: string, days = 30): Promise<SellerReport> {
  await connectDb();
  const seller = new Types.ObjectId(sellerId);
  const since = new Date(Date.now() - days * 86_400_000);
  const match = { seller, status: { $ne: "cancelled" }, createdAt: { $gte: since } };

  const [totals] = await Order.aggregate<{ n: number; value: number; paid: number }>([
    { $match: match },
    { $group: { _id: null, n: { $sum: 1 }, value: { $sum: "$total" }, paid: { $sum: "$paidAmount" } } },
  ]);
  const byBuyer = await Order.aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: match }, { $group: { _id: "$buyer", n: { $sum: 1 } } }]);
  const topProducts = await Order.aggregate<{ _id: string; quantity: number; value: number }>([
    { $match: match },
    { $unwind: "$items" },
    { $group: { _id: "$items.name", quantity: { $sum: "$items.quantity" }, value: { $sum: "$items.total" } } },
    { $sort: { value: -1 } },
    { $limit: 5 },
  ]);
  const daily = await Order.aggregate<{ _id: string; value: number }>([
    { $match: match },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, value: { $sum: "$total" } } },
    { $sort: { _id: 1 } },
  ]);
  const newOrders = await Order.countDocuments({ seller, status: "new" });

  const partners = await Partnership.find({ seller, status: "active" }, { buyer: 1 }).lean();
  const last = await Order.aggregate<{ _id: Types.ObjectId; last: Date }>([
    { $match: { seller, buyer: { $in: partners.map((p) => p.buyer) }, status: { $ne: "cancelled" } } },
    { $group: { _id: "$buyer", last: { $max: "$createdAt" } } },
  ]);
  const stale = last.filter((l) => Date.now() - l.last.getTime() > 30 * 86_400_000);
  const names = await User.find({ _id: { $in: stale.map((s) => s._id) } }, { name: 1 }).lean();
  const name = new Map(names.map((u) => [String(u._id), u.name]));

  return {
    days,
    totalOrders: totals?.n ?? 0,
    orderValue: totals?.value ?? 0,
    paidValue: totals?.paid ?? 0,
    unpaidValue: (totals?.value ?? 0) - (totals?.paid ?? 0),
    repeatPartners: byBuyer.filter((b) => b.n > 1).length,
    newOrders,
    topProducts: topProducts.map((p) => ({ name: p._id, quantity: p.quantity, value: p.value })),
    inactive: stale
      .map((s) => ({ id: String(s._id), name: name.get(String(s._id)) ?? "—", days: Math.floor((Date.now() - s.last.getTime()) / 86_400_000) }))
      .sort((a, b) => b.days - a.days),
    daily: fillDays(since, days, daily),
  };
}

/** Grafik uchun davrdagi har bir kun (savdo bo'lmagan kunlar — 0). */
function fillDays(since: Date, days: number, rows: { _id: string; value: number }[]): { day: string; value: number }[] {
  const by = new Map(rows.map((r) => [r._id, r.value]));
  return Array.from({ length: days + 1 }, (_, i) => {
    const day = new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    return { day, value: by.get(day) ?? 0 };
  });
}
