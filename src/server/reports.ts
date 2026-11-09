import "server-only";
import { TIME_ZONE } from "@/i18n/format";
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

  // Barcha so'rovlar parallel: baza uzoq bo'lsa ham sahifa bitta "aylanish" vaqtida tayyor bo'ladi.
  const [[totals], byBuyer, topProducts, daily, newOrders, last] = await Promise.all([
    Order.aggregate<{ n: number; value: number; paid: number }>([
      { $match: match },
      { $group: { _id: null, n: { $sum: 1 }, value: { $sum: "$total" }, paid: { $sum: "$paidAmount" } } },
    ]),
    Order.aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: match }, { $group: { _id: "$buyer", n: { $sum: 1 } } }]),
    Order.aggregate<{ _id: string; quantity: number; value: number }>([
      { $match: match },
      { $unwind: "$items" },
      { $group: { _id: "$items.name", quantity: { $sum: "$items.quantity" }, value: { $sum: "$items.total" } } },
      { $sort: { value: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate<{ _id: string; value: number }>([
      { $match: match },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TIME_ZONE } }, value: { $sum: "$total" } } },
      { $sort: { _id: 1 } },
    ]),
    Order.countDocuments({ seller, status: "new" }),
    // Faol hamkorlarning oxirgi buyurtmasi (hamkorlik ro'yxati $lookup bilan bitta so'rovda).
    Partnership.aggregate<{ _id: Types.ObjectId; name: string; last: Date | null }>([
      { $match: { seller, status: "active" } },
      {
        $lookup: {
          from: Order.collection.name,
          let: { b: "$buyer" },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$seller", seller] }, { $eq: ["$buyer", "$$b"] }, { $ne: ["$status", "cancelled"] }] } } }, { $group: { _id: null, last: { $max: "$createdAt" } } }],
          as: "o",
        },
      },
      { $lookup: { from: User.collection.name, localField: "buyer", foreignField: "_id", as: "u" } },
      { $project: { _id: "$buyer", name: { $first: "$u.name" }, last: { $first: "$o.last" } } },
    ]),
  ]);
  const stale = last.filter((l) => l.last && Date.now() - new Date(l.last).getTime() > 30 * 86_400_000);

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
      .map((s) => ({ id: String(s._id), name: s.name ?? "—", days: Math.floor((Date.now() - new Date(s.last!).getTime()) / 86_400_000) }))
      .sort((a, b) => b.days - a.days),
    daily: fillDays(since, days, daily),
  };
}

/** Grafik uchun davrdagi har bir kun (savdo bo'lmagan kunlar — 0). */
function fillDays(since: Date, days: number, rows: { _id: string; value: number }[]): { day: string; value: number }[] {
  const by = new Map(rows.map((r) => [r._id, r.value]));
  return Array.from({ length: days + 1 }, (_, i) => {
    // Toshkent (UTC+5) kuni — agregatsiyadagi timezone bilan mos.
    const day = new Date(since.getTime() + i * 86_400_000 + 5 * 3_600_000).toISOString().slice(0, 10);
    return { day, value: by.get(day) ?? 0 };
  });
}
