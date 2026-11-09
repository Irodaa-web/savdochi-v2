import "server-only";
import { isValidObjectId, Types, type ClientSession } from "mongoose";
import { AppError } from "@/lib/api";
import type { SessionUser } from "@/lib/auth/session";
import { connectDb, withTransaction } from "@/lib/db";
import { Order, type OrderDoc } from "@/models/Order";
import { Partnership } from "@/models/Partnership";
import { Payment, type PaymentDoc } from "@/models/Payment";
import { User } from "@/models/User";
import { notify } from "./notify";

/**
 * Qarz = bekor qilinmagan va to'liq to'lanmagan buyurtmalar bo'yicha (jami − to'langan).
 * Muddati o'tgan = to'lov muddati (dueDate) bugundan oldin bo'lgan buyurtmalar qoldig'i.
 */
const unpaidFilter = { status: { $ne: "cancelled" }, paymentStatus: { $ne: "paid" } } as const;

export type DebtRow = {
  partner: { id: string; name: string; phone: string };
  outstanding: number;
  overdue: number;
  unpaidOrders: number;
  nextDue: string | null;
  creditLimit: number;
  paymentDays: number;
};

export type DebtSummary = { rows: DebtRow[]; totalOutstanding: number; totalOverdue: number; overdueCount: number };

type Side = { me: "buyer" | "seller"; other: "buyer" | "seller" };
const sideOf = (user: SessionUser): Side => (user.role === "seller" ? { me: "seller", other: "buyer" } : { me: "buyer", other: "seller" });

/** Hamkorning joriy qarzi (tranzaksiya ichida ham ishlaydi). */
export async function outstandingBetween(sellerId: string, buyerId: string, session?: ClientSession): Promise<number> {
  const [row] = await Order.aggregate<{ sum: number }>([
    { $match: { seller: new Types.ObjectId(sellerId), buyer: new Types.ObjectId(buyerId), ...unpaidFilter } },
    { $group: { _id: null, sum: { $sum: { $subtract: ["$total", "$paidAmount"] } } } },
  ]).session(session ?? null);
  return row?.sum ?? 0;
}

/** Hamkorlar bo'yicha qarzlar ro'yxati (kompaniya uchun — olinadigan, do'kon uchun — to'lanadigan). */
export async function listDebts(user: SessionUser): Promise<DebtSummary> {
  await connectDb();
  const { me, other } = sideOf(user);
  const now = new Date();
  const grouped = await Order.aggregate<{ _id: Types.ObjectId; outstanding: number; overdue: number; n: number; nextDue: Date | null }>([
    { $match: { [me]: new Types.ObjectId(user.id), ...unpaidFilter } },
    { $addFields: { left: { $subtract: ["$total", "$paidAmount"] } } },
    { $match: { left: { $gt: 0 } } },
    {
      $group: {
        _id: `$${other}`,
        outstanding: { $sum: "$left" },
        overdue: { $sum: { $cond: [{ $and: [{ $ne: ["$dueDate", null] }, { $lt: ["$dueDate", now] }] }, "$left", 0] } },
        n: { $sum: 1 },
        nextDue: { $min: "$dueDate" },
      },
    },
    { $sort: { overdue: -1, outstanding: -1 } },
  ]);
  const ids = grouped.map((g) => g._id);
  const [users, partnerships] = await Promise.all([
    User.find({ _id: { $in: ids } }, { name: 1, phone: 1 }).lean(),
    Partnership.find({ [me]: user.id, [other]: { $in: ids } }, { seller: 1, buyer: 1, creditLimit: 1, paymentDays: 1 }).lean(),
  ]);
  const userBy = new Map(users.map((u) => [String(u._id), u]));
  const termsBy = new Map(partnerships.map((p) => [String(p[other]), p]));
  const rows = grouped.map((g) => {
    const u = userBy.get(String(g._id));
    const p = termsBy.get(String(g._id));
    return {
      partner: { id: String(g._id), name: u?.name ?? "—", phone: u?.phone ?? "" },
      outstanding: g.outstanding,
      overdue: g.overdue,
      unpaidOrders: g.n,
      nextDue: g.nextDue ? g.nextDue.toISOString() : null,
      creditLimit: p?.creditLimit ?? 0,
      paymentDays: p?.paymentDays ?? 14,
    };
  });
  return {
    rows,
    totalOutstanding: rows.reduce((s, r) => s + r.outstanding, 0),
    totalOverdue: rows.reduce((s, r) => s + r.overdue, 0),
    overdueCount: rows.filter((r) => r.overdue > 0).length,
  };
}

export type LedgerOrder = { id: string; number: number; createdAt: string; total: number; paid: number; left: number; dueDate: string | null; overdue: boolean };
export type LedgerPayment = { id: string; amount: number; note: string; source: PaymentDoc["source"]; orders: number[]; createdAt: string };
export type Ledger = {
  partner: { id: string; name: string; phone: string };
  outstanding: number;
  overdue: number;
  creditLimit: number;
  paymentDays: number;
  orders: LedgerOrder[];
  payments: LedgerPayment[];
};

/** Bitta hamkor bilan qarz daftari: to'lanmagan buyurtmalar va to'lovlar tarixi. */
export async function partnerLedger(user: SessionUser, partnerId: string): Promise<Ledger | null> {
  if (!isValidObjectId(partnerId)) return null;
  await connectDb();
  const { me, other } = sideOf(user);
  const partner = await User.findOne({ _id: partnerId, role: other }, { name: 1, phone: 1 }).lean();
  if (!partner) return null;
  const pair = { [me]: user.id, [other]: partnerId };
  const [orders, payments, partnership] = await Promise.all([
    Order.find({ ...pair, ...unpaidFilter }).sort({ createdAt: 1 }).lean<OrderDoc[]>(),
    Payment.find(pair).sort({ createdAt: -1 }).limit(100).lean<PaymentDoc[]>(),
    Partnership.findOne(pair, { creditLimit: 1, paymentDays: 1 }).lean(),
  ]);
  const now = Date.now();
  const rows = orders
    .map((o) => ({
      id: String(o._id),
      number: o.number,
      createdAt: o.createdAt.toISOString(),
      total: o.total,
      paid: o.paidAmount,
      left: o.total - o.paidAmount,
      dueDate: o.dueDate ? o.dueDate.toISOString() : null,
      overdue: !!o.dueDate && o.dueDate.getTime() < now,
    }))
    .filter((o) => o.left > 0);
  return {
    partner: { id: partnerId, name: partner.name, phone: partner.phone },
    outstanding: rows.reduce((s, o) => s + o.left, 0),
    overdue: rows.filter((o) => o.overdue).reduce((s, o) => s + o.left, 0),
    creditLimit: partnership?.creditLimit ?? 0,
    paymentDays: partnership?.paymentDays ?? 14,
    orders: rows,
    payments: payments.map((p) => ({
      id: String(p._id),
      amount: p.amount,
      note: p.note,
      source: p.source,
      orders: p.allocations.map((a) => a.number),
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

/**
 * Kompaniya hamkordan to'lov oldi: summa eng eski to'lanmagan buyurtmalardan boshlab taqsimlanadi.
 * Hammasi bitta tranzaksiyada; summa qarzdan katta bo'lsa — rad etiladi.
 */
export async function recordPayment(user: SessionUser, buyerId: string, amount: number, note: string): Promise<Ledger> {
  if (user.role !== "seller") throw new AppError("FORBIDDEN");
  if (!isValidObjectId(buyerId)) throw new AppError("NOT_FOUND");
  await connectDb();
  const buyer = await User.findOne({ _id: buyerId, role: "buyer" }, { name: 1 }).lean();
  if (!buyer) throw new AppError("NOT_FOUND");

  await withTransaction(async (session) => {
    const orders = await Order.find({ seller: user.id, buyer: buyerId, ...unpaidFilter }).sort({ createdAt: 1 }).session(session);
    const outstanding = orders.reduce((s, o) => s + Math.max(0, o.total - o.paidAmount), 0);
    if (amount > outstanding) throw new AppError("INVALID_INPUT", { amount: "amountTooLarge" });
    let rest = amount;
    const allocations: PaymentDoc["allocations"] = [];
    for (const o of orders) {
      if (rest <= 0) break;
      const left = o.total - o.paidAmount;
      if (left <= 0) continue;
      const part = Math.min(left, rest);
      o.paidAmount += part;
      o.paymentStatus = o.paidAmount >= o.total ? "paid" : "partial";
      await o.save({ session });
      allocations.push({ order: o._id, number: o.number, amount: part });
      rest -= part;
    }
    await Payment.create([{ seller: user.id, buyer: buyerId, amount, note, source: "ledger", allocations }], { session });
  });

  await notify(buyerId, "paymentReceived", { name: user.name, amount: amount.toLocaleString("ru-RU") }, `/debts/${user.id}`);
  return (await partnerLedger(user, buyerId))!;
}

/** Buyurtma sahifasida to'langan summa o'zgarganda daftarga yozuv (tuzatish manfiy bo'lishi mumkin). */
export async function logOrderPayment(order: Pick<OrderDoc, "_id" | "number" | "seller" | "buyer">, delta: number, session?: ClientSession): Promise<void> {
  if (!delta) return;
  await Payment.create([{ seller: order.seller, buyer: order.buyer, amount: delta, note: "", source: "order", allocations: [{ order: order._id, number: order.number, amount: delta }] }], { session });
}

/** Nasiya: hamkorlik shartlari va hozir qancha bo'sh limit qolgani. */
export async function creditInfo(sellerId: string, buyerId: string): Promise<{ limit: number; used: number; available: number; days: number } | null> {
  const p = await Partnership.findOne({ seller: sellerId, buyer: buyerId, status: "active" }, { creditLimit: 1, paymentDays: 1 }).lean();
  if (!p || !p.creditLimit) return null;
  const used = await outstandingBetween(sellerId, buyerId);
  return { limit: p.creditLimit, used, available: Math.max(0, p.creditLimit - used), days: p.paymentDays ?? 14 };
}
