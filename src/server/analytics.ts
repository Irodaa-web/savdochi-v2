import "server-only";
import { Types } from "mongoose";
import { TIME_ZONE } from "@/i18n/format";
import type { CategoryCode } from "@/lib/catalog";
import { fillDays, periodStart } from "@/lib/chart";
import { connectDb } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";

/** Davr: kunlar soni. 365 — oylar bo'yicha. */
export const PERIODS = [7, 30, 90, 365] as const;
export type Period = (typeof PERIODS)[number];
export const periodOf = (raw: string | undefined): Period => (PERIODS as readonly number[]).includes(Number(raw)) ? (Number(raw) as Period) : 30;

export type Totals = { orders: number; value: number; paid: number; buyers: number; cancelled: number; discount: number };
export type TrendPoint = { day: string; value: number; orders: number };
export type Share = { id: string; name: string; value: number; orders: number };

export type SellerAnalytics = {
  period: Period;
  monthly: boolean;
  current: Totals;
  previous: Totals;
  trend: TrendPoint[];
  categories: { category: CategoryCode; value: number; quantity: number }[];
  clients: (Share & { last: string })[];
  weekdays: { day: number; value: number; orders: number }[];
  /** O'rtacha vaqt (soat): yangi → tasdiqlangan, yangi → yetkazilgan. */
  speed: { confirmHours: number | null; deliverHours: number | null };
  /** Faol, lekin davrda bitta ham sotilmagan mahsulotlar. */
  unsold: { id: string; name: string; stock: number; unit: string }[];
  newClients: number;
};

/**
 * Davr chegaralari (Toshkent vaqti): kunlik davrlarda — to'liq kalendar kunlar, 365 da — joriy oy
 * va oldingi 11 oy (1-sanadan). Oldingi davr — xuddi shuncha uzunlikdagi undan oldingi oraliq.
 */
function rangeFor(period: Period): { since: Date; prevSince: Date } {
  if (period !== 365) {
    const since = periodStart(Date.now(), period);
    return { since, prevSince: new Date(since.getTime() - period * 86_400_000) };
  }
  const now = new Date(Date.now() + 5 * 3_600_000);
  const month = (back: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1) - 5 * 3_600_000);
  return { since: month(11), prevSince: month(23) };
}

const empty = (): Totals => ({ orders: 0, value: 0, paid: 0, buyers: 0, cancelled: 0, discount: 0 });

/** Joriy va oldingi teng davr ko'rsatkichlari — bitta agregatsiya. */
async function totalsFor(side: "seller" | "buyer", id: Types.ObjectId, since: Date, prevSince: Date): Promise<{ current: Totals; previous: Totals }> {
  const rows = await Order.aggregate<{ _id: { cur: boolean; cancelled: boolean }; n: number; value: number; paid: number; discount: number; parties: Types.ObjectId[] }>([
    { $match: { [side]: id, createdAt: { $gte: prevSince } } },
    {
      $group: {
        _id: { cur: { $gte: ["$createdAt", since] }, cancelled: { $eq: ["$status", "cancelled"] } },
        n: { $sum: 1 },
        value: { $sum: "$total" },
        paid: { $sum: "$paidAmount" },
        discount: { $sum: "$discount" },
        parties: { $addToSet: side === "seller" ? "$buyer" : "$seller" },
      },
    },
  ]);
  const build = (cur: boolean): Totals => {
    const ok = rows.find((r) => r._id.cur === cur && !r._id.cancelled);
    const bad = rows.find((r) => r._id.cur === cur && r._id.cancelled);
    return ok || bad
      ? { orders: ok?.n ?? 0, value: ok?.value ?? 0, paid: ok?.paid ?? 0, buyers: ok?.parties.length ?? 0, cancelled: bad?.n ?? 0, discount: ok?.discount ?? 0 }
      : empty();
  };
  return { current: build(true), previous: build(false) };
}

/** Savdo dinamikasi: kunlar (≤ 90) yoki oylar (365). */
async function trendFor(match: Record<string, unknown>, since: Date, period: Period): Promise<TrendPoint[]> {
  const monthly = period === 365;
  const rows = await Order.aggregate<{ _id: string; value: number; orders: number }>([
    { $match: match },
    { $group: { _id: { $dateToString: { format: monthly ? "%Y-%m" : "%Y-%m-%d", date: "$createdAt", timezone: TIME_ZONE } }, value: { $sum: "$total" }, orders: { $sum: 1 } } },
  ]);
  if (!monthly) return fillDays(since, period, rows);
  // 12 oy: joriy oy va undan oldingi 11 tasi (Toshkent vaqti).
  const now = new Date(Date.now() + 5 * 3_600_000);
  const by = new Map(rows.map((r) => [r._id, r]));
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
    const key = d.toISOString().slice(0, 7);
    return { day: key, value: by.get(key)?.value ?? 0, orders: by.get(key)?.orders ?? 0 };
  });
}

/** Kategoriyalar bo'yicha savdo: buyurtma qatorlari mahsulot kategoriyasi bilan. */
async function categoriesFor(match: Record<string, unknown>): Promise<SellerAnalytics["categories"]> {
  const rows = await Order.aggregate<{ _id: CategoryCode | null; value: number; quantity: number }>([
    { $match: match },
    { $unwind: "$items" },
    { $lookup: { from: Product.collection.name, localField: "items.product", foreignField: "_id", as: "p", pipeline: [{ $project: { category: 1 } }] } },
    { $group: { _id: { $ifNull: [{ $first: "$p.category" }, "other"] }, value: { $sum: "$items.total" }, quantity: { $sum: "$items.quantity" } } },
    { $sort: { value: -1 } },
  ]);
  return rows.map((r) => ({ category: (r._id ?? "other") as CategoryCode, value: r.value, quantity: r.quantity }));
}

export async function sellerAnalytics(sellerId: string, period: Period): Promise<SellerAnalytics> {
  await connectDb();
  const seller = new Types.ObjectId(sellerId);
  const { since, prevSince } = rangeFor(period);
  const match = { seller, status: { $ne: "cancelled" }, createdAt: { $gte: since } };

  const [totals, trend, categories, clients, weekdays, speed, sold, firstOrders] = await Promise.all([
    totalsFor("seller", seller, since, prevSince),
    trendFor(match, since, period),
    categoriesFor(match),
    Order.aggregate<{ _id: Types.ObjectId; value: number; orders: number; last: Date }>([
      { $match: match },
      { $group: { _id: "$buyer", value: { $sum: "$total" }, orders: { $sum: 1 }, last: { $max: "$createdAt" } } },
      { $sort: { value: -1 } },
      { $limit: 8 },
    ]),
    Order.aggregate<{ _id: number; value: number; orders: number }>([
      { $match: match },
      { $group: { _id: { $isoDayOfWeek: { date: "$createdAt", timezone: TIME_ZONE } }, value: { $sum: "$total" }, orders: { $sum: 1 } } },
    ]),
    // Bajarish tezligi: tarixdagi birinchi "tasdiqlangan" va "yetkazildi" vaqtigacha.
    Order.aggregate<{ _id: null; confirm: number | null; deliver: number | null }>([
      { $match: { seller, createdAt: { $gte: since } } },
      {
        $project: {
          c: { $first: { $filter: { input: "$history", cond: { $eq: ["$$this.status", "confirmed"] } } } },
          d: { $first: { $filter: { input: "$history", cond: { $eq: ["$$this.status", "delivered"] } } } },
          createdAt: 1,
        },
      },
      { $group: { _id: null, confirm: { $avg: { $subtract: ["$c.at", "$createdAt"] } }, deliver: { $avg: { $subtract: ["$d.at", "$createdAt"] } } } },
    ]),
    Order.distinct("items.product", match),
    // Yangi mijozlar: birinchi buyurtmasi shu davrda bo'lgan do'konlar.
    Order.aggregate<{ n: number }>([
      { $match: { seller, status: { $ne: "cancelled" } } },
      { $group: { _id: "$buyer", first: { $min: "$createdAt" } } },
      { $match: { first: { $gte: since } } },
      { $count: "n" },
    ]),
  ]);

  const [names, unsold] = await Promise.all([
    User.find({ _id: { $in: clients.map((c) => c._id) } }, { name: 1 }).lean(),
    Product.find({ seller, active: true, _id: { $nin: sold } }, { name: 1, stock: 1, unit: 1 }).sort({ stock: -1 }).limit(8).lean(),
  ]);
  const name = new Map(names.map((u) => [String(u._id), u.name]));
  const hours = (ms: number | null | undefined) => (ms == null ? null : Math.round((ms / 3_600_000) * 10) / 10);

  return {
    period,
    monthly: period === 365,
    ...totals,
    trend,
    categories,
    clients: clients.map((c) => ({ id: String(c._id), name: name.get(String(c._id)) ?? "—", value: c.value, orders: c.orders, last: c.last.toISOString() })),
    weekdays: Array.from({ length: 7 }, (_, i) => {
      const w = weekdays.find((x) => x._id === i + 1);
      return { day: i + 1, value: w?.value ?? 0, orders: w?.orders ?? 0 };
    }),
    speed: { confirmHours: hours(speed[0]?.confirm), deliverHours: hours(speed[0]?.deliver) },
    unsold: unsold.map((p) => ({ id: String(p._id), name: p.name, stock: p.stock, unit: p.unit })),
    newClients: firstOrders[0]?.n ?? 0,
  };
}

export type BuyerAnalytics = {
  period: Period;
  monthly: boolean;
  current: Totals;
  previous: Totals;
  trend: TrendPoint[];
  suppliers: Share[];
  categories: SellerAnalytics["categories"];
  products: { name: string; unit: string; quantity: number; value: number }[];
  /** Hamkor chegirmasi hisobiga tejalgan summa (buyurtmalarda saqlangan chegirma). */
  saved: number;
};

/** Do'kon: xarajatlar tahlili. */
export async function buyerAnalytics(buyerId: string, period: Period): Promise<BuyerAnalytics> {
  await connectDb();
  const buyer = new Types.ObjectId(buyerId);
  const { since, prevSince } = rangeFor(period);
  const match = { buyer, status: { $ne: "cancelled" }, createdAt: { $gte: since } };
  const [totals, trend, categories, suppliers, products] = await Promise.all([
    totalsFor("buyer", buyer, since, prevSince),
    trendFor(match, since, period),
    categoriesFor(match),
    Order.aggregate<{ _id: Types.ObjectId; value: number; orders: number }>([
      { $match: match },
      { $group: { _id: "$seller", value: { $sum: "$total" }, orders: { $sum: 1 } } },
      { $sort: { value: -1 } },
      { $limit: 8 },
    ]),
    Order.aggregate<{ _id: string; unit: string; quantity: number; value: number }>([
      { $match: match },
      { $unwind: "$items" },
      { $group: { _id: "$items.name", unit: { $first: "$items.unit" }, quantity: { $sum: "$items.quantity" }, value: { $sum: "$items.total" } } },
      { $sort: { value: -1 } },
      { $limit: 8 },
    ]),
  ]);
  const names = await User.find({ _id: { $in: suppliers.map((s) => s._id) } }, { name: 1 }).lean();
  const name = new Map(names.map((u) => [String(u._id), u.name]));
  return {
    period,
    monthly: period === 365,
    ...totals,
    trend,
    suppliers: suppliers.map((s) => ({ id: String(s._id), name: name.get(String(s._id)) ?? "—", value: s.value, orders: s.orders })),
    categories,
    products: products.map((p) => ({ name: p._id, unit: p.unit, quantity: p.quantity, value: p.value })),
    saved: totals.current.discount,
  };
}

/** O'zgarish foizi (oldingi davr 0 bo'lsa — null). */
export function change(cur: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}
