import "server-only";
import { isValidObjectId, Types, type ClientSession } from "mongoose";
import { AppError } from "@/lib/api";
import type { SessionUser } from "@/lib/auth/session";
import { connectDb, withTransaction } from "@/lib/db";
import { allocateFifo } from "@/lib/debts";
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
    const plan = allocateFifo(orders.map((o) => ({ id: String(o._id), total: o.total, paid: o.paidAmount })), amount);
    const allocations: PaymentDoc["allocations"] = [];
    for (const a of plan.allocations) {
      const o = orders.find((x) => String(x._id) === a.id)!;
      o.paidAmount += a.amount;
      o.paymentStatus = o.paidAmount >= o.total ? "paid" : "partial";
      await o.save({ session });
      allocations.push({ order: o._id, number: o.number, amount: a.amount });
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

export type StatementParty = { id: string; name: string; phone: string; address: string; inn: string; bankName: string; bankAccount: string; mfo: string };
export type StatementRow = { date: string; kind: "order" | "payment" | "correction"; number: number | null; debit: number; credit: number };
export type Statement = {
  seller: StatementParty;
  buyer: StatementParty;
  from: string;
  to: string;
  opening: number;
  rows: StatementRow[];
  totalDebit: number;
  totalCredit: number;
  closing: number;
};

/** "YYYY-MM-DD" ni Toshkent vaqti bo'yicha kun boshi/oxiriga aylantiradi. */
export function tashkentDay(day: string, end = false): Date {
  return new Date(`${day}T${end ? "23:59:59.999" : "00:00:00.000"}+05:00`);
}

/**
 * Akt sverka: davr boshidagi qoldiq, davrdagi jo'natmalar (buyurtmalar) va to'lovlar, oxirgi qoldiq.
 * Musbat qoldiq — do'konning kompaniya oldidagi qarzi.
 * Qarz daftari paydo bo'lishidan oldin qayd etilgan to'lovlar buyurtmadagi to'langan summadan tiklanadi.
 */
export async function statement(user: SessionUser, partnerId: string, fromDay: string, toDay: string): Promise<Statement | null> {
  if (!isValidObjectId(partnerId)) return null;
  await connectDb();
  const { me, other } = sideOf(user);
  const pair = { [me]: user.id, [other]: partnerId } as { seller: string; buyer: string };
  const users = await User.find({ _id: { $in: [pair.seller, pair.buyer] } }, { name: 1, phone: 1, role: 1, profile: 1 }).lean();
  const seller = users.find((u) => String(u._id) === pair.seller && u.role === "seller");
  const buyer = users.find((u) => String(u._id) === pair.buyer && u.role === "buyer");
  if (!seller || !buyer) return null;

  const [orders, payments] = await Promise.all([
    Order.find({ ...pair, status: { $ne: "cancelled" } }, { number: 1, total: 1, paidAmount: 1, createdAt: 1, updatedAt: 1 }).lean<OrderDoc[]>(),
    Payment.find(pair).lean<PaymentDoc[]>(),
  ]);
  const allocated = new Map<string, number>();
  for (const p of payments) for (const a of p.allocations) allocated.set(String(a.order), (allocated.get(String(a.order)) ?? 0) + a.amount);

  const all: (StatementRow & { at: Date })[] = [];
  for (const o of orders) {
    all.push({ at: o.createdAt, date: o.createdAt.toISOString(), kind: "order", number: o.number, debit: o.total, credit: 0 });
    const legacy = o.paidAmount - (allocated.get(String(o._id)) ?? 0);
    if (legacy > 0) all.push({ at: o.updatedAt, date: o.updatedAt.toISOString(), kind: "payment", number: o.number, debit: 0, credit: legacy });
  }
  for (const p of payments) {
    const single = p.allocations.length === 1 ? p.allocations[0]!.number : null;
    all.push({ at: p.createdAt, date: p.createdAt.toISOString(), kind: p.amount < 0 ? "correction" : "payment", number: single, debit: 0, credit: p.amount });
  }
  all.sort((a, b) => a.at.getTime() - b.at.getTime());

  const from = tashkentDay(fromDay);
  const to = tashkentDay(toDay, true);
  let opening = 0;
  const rows: StatementRow[] = [];
  for (const r of all) {
    if (r.at < from) opening += r.debit - r.credit;
    else if (r.at <= to) rows.push({ date: r.date, kind: r.kind, number: r.number, debit: r.debit, credit: r.credit });
  }
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const party = (u: (typeof users)[number]): StatementParty => ({
    id: String(u._id),
    name: u.name,
    phone: u.phone,
    address: u.profile?.address ?? "",
    inn: u.profile?.inn ?? "",
    bankName: u.profile?.bankName ?? "",
    bankAccount: u.profile?.bankAccount ?? "",
    mfo: u.profile?.mfo ?? "",
  });
  return { seller: party(seller), buyer: party(buyer), from: fromDay, to: toDay, opening, rows, totalDebit, totalCredit, closing: opening + totalDebit - totalCredit };
}
