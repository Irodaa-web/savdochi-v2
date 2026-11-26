import "server-only";
import { isValidObjectId, type HydratedDocument } from "mongoose";
import { AppError } from "@/lib/api";
import { forgetSessionUser, type SessionUser } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { effectivePlan, PLANS, type PlanCode } from "@/lib/plans";
import { PlanOrder, type PlanOrderDoc, type PlanOrderSource, type PlanOrderStatus } from "@/models/PlanOrder";
import { User, type UserDoc } from "@/models/User";
import { audit, notify, notifyAdmins } from "./notify";
import { forgetHiddenSellers } from "./products";

export type PaidPlan = Exclude<PlanCode, "free">;
export const PLAN_MONTHS = [1, 3, 12] as const;

/**
 * Kompaniya hujjatiga tarifni qo'llaydi (saqlamaydi). Xuddi shu pullik tarif hali amalda bo'lsa —
 * muddat davom ettiriladi, aks holda (boshqa tarif, sinov yoki tugagan) — bugundan boshlanadi.
 */
export function applyPlanTo(u: HydratedDocument<UserDoc>, plan: PaidPlan, months: number): Date {
  const current = effectivePlan(u);
  const keep = current === plan && !u.planTrial && u.subscriptionUntil && u.subscriptionUntil.getTime() > Date.now();
  const until = keep ? new Date(u.subscriptionUntil!) : new Date();
  until.setMonth(until.getMonth() + months);
  u.plan = plan;
  u.subscriptionUntil = until;
  u.planTrial = false;
  return until;
}

/** To'lovlar jurnaliga yoqilgan tarif yozuvi. */
export async function recordPlanOrder(input: { company: unknown; plan: PaidPlan; months: number; paidAmount: number; source: PlanOrderSource; adminId?: string | null; note?: string }): Promise<void> {
  await PlanOrder.create({
    company: input.company,
    plan: input.plan,
    months: input.months,
    amount: PLANS[input.plan].price * input.months,
    paidAmount: input.paidAmount,
    status: "paid",
    source: input.source,
    note: input.note ?? "",
    decidedBy: input.adminId ?? null,
    decidedAt: new Date(),
  });
}

/** Tarifni yoqadi, saqlaydi, keshlarni yangilaydi va kompaniyaga xabar beradi (so'rov, sovg'a uchun). */
export async function grantPlan(companyId: unknown, plan: PaidPlan, months: number): Promise<Date> {
  const u = await User.findById(companyId);
  if (!u || u.role !== "seller") throw new AppError("NOT_FOUND");
  const until = applyPlanTo(u, plan, months);
  await u.save();
  forgetSessionUser(String(u._id));
  forgetHiddenSellers();
  await notify(u._id, "planChanged", { plan, until: until.toISOString().slice(0, 10) }, "/billing");
  return until;
}

/* ------------------------------------------------------------------ */
/* Kompaniya: tarif so'rovi                                            */
/* ------------------------------------------------------------------ */

export type PlanOrderView = {
  id: string;
  company: { id: string; name: string; phone: string };
  plan: PaidPlan;
  months: number;
  amount: number;
  paidAmount: number;
  status: PlanOrderStatus;
  source: PlanOrderSource;
  note: string;
  createdAt: string;
  decidedAt: string | null;
};

function owner(user: SessionUser): string {
  if (user.role !== "seller" || user.staff) throw new AppError("FORBIDDEN");
  return user.id;
}

async function toViews(docs: PlanOrderDoc[]): Promise<PlanOrderView[]> {
  const users = await User.find({ _id: { $in: docs.map((d) => d.company) } }, { name: 1, phone: 1 }).lean();
  const by = new Map(users.map((u) => [String(u._id), u]));
  return docs.map((d) => ({
    id: String(d._id),
    company: { id: String(d.company), name: by.get(String(d.company))?.name ?? "—", phone: by.get(String(d.company))?.phone ?? "" },
    plan: d.plan,
    months: d.months,
    amount: d.amount,
    paidAmount: d.paidAmount,
    status: d.status,
    source: d.source,
    note: d.note,
    createdAt: d.createdAt.toISOString(),
    decidedAt: d.decidedAt ? d.decidedAt.toISOString() : null,
  }));
}

/** Kompaniya so'rov yuboradi. Bitta ochiq so'rov: yangisi eskisini bekor qiladi. Adminlarga xabar boradi. */
export async function requestPlan(user: SessionUser, plan: PaidPlan, months: number): Promise<PlanOrderView> {
  const company = owner(user);
  await connectDb();
  await PlanOrder.updateMany({ company, status: "pending" }, { $set: { status: "cancelled", decidedAt: new Date() } });
  const doc = await PlanOrder.create({ company, plan, months, amount: PLANS[plan].price * months, status: "pending", source: "request" });
  await notifyAdmins("planRequest", { name: user.name, plan, months }, "/admin/billing");
  await audit(company, "plan.request", `planOrder:${doc._id}`, { plan, months });
  return (await toViews([doc.toObject() as PlanOrderDoc]))[0]!;
}

export async function cancelPlanRequest(user: SessionUser, id: string): Promise<void> {
  const company = owner(user);
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const res = await PlanOrder.updateOne({ _id: id, company, status: "pending" }, { $set: { status: "cancelled", decidedAt: new Date() } });
  if (res.modifiedCount !== 1) throw new AppError("NOT_FOUND");
}

/** Kompaniyaning ochiq so'rovi va oxirgi tarif yozuvlari (Tarif sahifasi uchun). */
export async function myPlanOrders(companyId: string): Promise<{ pending: PlanOrderView | null; history: PlanOrderView[] }> {
  await connectDb();
  const [pending, history] = await Promise.all([
    PlanOrder.findOne({ company: companyId, status: "pending" }).lean<PlanOrderDoc>(),
    PlanOrder.find({ company: companyId, status: { $in: ["paid", "rejected"] } }).sort({ decidedAt: -1 }).limit(10).lean<PlanOrderDoc[]>(),
  ]);
  const views = await toViews([...(pending ? [pending] : []), ...history]);
  return { pending: pending ? views[0]! : null, history: views.slice(pending ? 1 : 0) };
}

/* ------------------------------------------------------------------ */
/* Administrator: so'rovlar, to'lovlar jurnali, daromad                */
/* ------------------------------------------------------------------ */

const PAGE = 30;

export async function listPlanOrders(opts: { status?: PlanOrderStatus; page?: number }): Promise<{ items: PlanOrderView[]; total: number; page: number; pages: number }> {
  await connectDb();
  const filter = opts.status ? { status: opts.status } : { status: { $in: ["pending", "paid", "rejected"] } };
  const page = Math.max(1, opts.page ?? 1);
  const sort = opts.status === "pending" ? { createdAt: 1 as const } : { createdAt: -1 as const };
  const [docs, total] = await Promise.all([PlanOrder.find(filter).sort(sort).skip((page - 1) * PAGE).limit(PAGE).lean<PlanOrderDoc[]>(), PlanOrder.countDocuments(filter)]);
  return { items: await toViews(docs), total, page, pages: Math.max(1, Math.ceil(total / PAGE)) };
}

export type BillingSummary = { pending: number; month: number; days30: number; total: number; byPlan: Record<PaidPlan, number>; payingCompanies: number };

/** Daromad: shu oy, oxirgi 30 kun, jami; tarif bo'yicha; hozir pullik tarifdagi kompaniyalar soni. */
export async function billingSummary(): Promise<BillingSummary> {
  await connectDb();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sum = async (match: Record<string, unknown>) => (await PlanOrder.aggregate<{ v: number }>([{ $match: { status: "paid", ...match } }, { $group: { _id: null, v: { $sum: "$paidAmount" } } }]))[0]?.v ?? 0;
  const [pending, month, days30, total, byPlanRows, paying] = await Promise.all([
    PlanOrder.countDocuments({ status: "pending" }),
    sum({ decidedAt: { $gte: monthStart } }),
    sum({ decidedAt: { $gte: new Date(now.getTime() - 30 * 86_400_000) } }),
    sum({}),
    PlanOrder.aggregate<{ _id: PaidPlan; v: number }>([{ $match: { status: "paid" } }, { $group: { _id: "$plan", v: { $sum: "$paidAmount" } } }]),
    User.countDocuments({ role: "seller", plan: { $in: ["standard", "premium"] }, planTrial: { $ne: true }, subscriptionUntil: { $gt: now } }),
  ]);
  const byPlan = { standard: 0, premium: 0 };
  for (const r of byPlanRows) if (r._id in byPlan) byPlan[r._id] = r.v;
  return { pending, month, days30, total, byPlan, payingCompanies: paying };
}

/** So'rovni tasdiqlash (to'lov qabul qilingan — summa yoziladi, tarif yoqiladi) yoki rad etish (sabab bilan). */
export async function decidePlanRequest(adminId: string, id: string, input: { action: "approve"; paidAmount: number } | { action: "reject"; reason: string }, ip: string): Promise<void> {
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const order = await PlanOrder.findOne({ _id: id, status: "pending" });
  if (!order) throw new AppError("NOT_FOUND");
  if (input.action === "approve") {
    // Avval holatni band qilamiz — ikki marta bosilsa tarif ikki marta uzaytirilmasin.
    const res = await PlanOrder.updateOne({ _id: id, status: "pending" }, { $set: { status: "paid", paidAmount: input.paidAmount, decidedBy: adminId, decidedAt: new Date() } });
    if (res.modifiedCount !== 1) throw new AppError("INVALID_STATE");
    await grantPlan(order.company, order.plan, order.months);
  } else {
    const res = await PlanOrder.updateOne({ _id: id, status: "pending" }, { $set: { status: "rejected", note: input.reason, decidedBy: adminId, decidedAt: new Date() } });
    if (res.modifiedCount !== 1) throw new AppError("INVALID_STATE");
    await notify(order.company, "planRequestRejected", { plan: order.plan, reason: input.reason }, "/billing");
  }
  await audit(adminId, `admin.plan.${input.action}`, `planOrder:${id}`, { plan: order.plan, months: order.months, ...(input.action === "approve" ? { paidAmount: input.paidAmount } : { reason: input.reason }) }, ip);
}

/* ------------------------------------------------------------------ */
/* Taklif (referal): taklif qilgan va qo'shilgan kompaniyaga 1 oy sovg'a */
/* ------------------------------------------------------------------ */

export const REFERRAL_MONTHS = 1;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // adashtiradigan 0/O, 1/I yo'q

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/** Kompaniyaning taklif kodi (yo'q bo'lsa yaratiladi) va natijalari. */
export async function myReferral(companyId: string): Promise<{ code: string; invited: number; rewarded: number }> {
  await connectDb();
  let code = (await User.findById(companyId, { referralCode: 1 }).lean())?.referralCode;
  for (let i = 0; !code && i < 5; i++) {
    const candidate = newCode();
    try {
      const res = await User.updateOne({ _id: companyId, referralCode: { $exists: false } }, { $set: { referralCode: candidate } });
      code = res.modifiedCount === 1 ? candidate : (await User.findById(companyId, { referralCode: 1 }).lean())?.referralCode;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error; // takroriy kod — qayta urinamiz
    }
  }
  if (!code) throw new AppError("SERVER_ERROR");
  const [invited, rewarded] = await Promise.all([User.countDocuments({ referredBy: companyId }), User.countDocuments({ referredBy: companyId, referralRewarded: true })]);
  return { code, invited, rewarded };
}

/** Sovg'a uchun tarif: amaldagi pullik tarif (sinov emas) bo'lsa — o'sha uzaytiriladi, aks holda Premium. */
async function giftPlanFor(companyId: unknown): Promise<PaidPlan> {
  const u = await User.findById(companyId, { role: 1, plan: 1, planTrial: 1, subscriptionUntil: 1 }).lean();
  const current = u ? effectivePlan(u) : "free";
  return current !== "free" && !u?.planTrial ? current : "premium";
}

/**
 * Taklif bilan kelgan kompaniya administrator tomonidan tasdiqlanganda — ikkalasiga 1 oy sovg'a (bir marta).
 * Soxta hisoblar bilan suiiste'mol qilmaslik uchun sovg'a aynan tasdiqdan keyin beriladi.
 */
export async function rewardReferral(companyId: unknown): Promise<void> {
  const claim = await User.findOneAndUpdate(
    { _id: companyId, role: "seller", verification: "verified", referredBy: { $ne: null }, referralRewarded: { $ne: true } },
    { $set: { referralRewarded: true } },
    { new: true, projection: { referredBy: 1, name: 1 } },
  ).lean();
  if (!claim?.referredBy) return;
  const referrer = await User.findOne({ _id: claim.referredBy, role: "seller", blocked: { $ne: true } }, { _id: 1 }).lean();
  for (const id of [claim._id, ...(referrer ? [referrer._id] : [])]) {
    const plan = await giftPlanFor(id);
    await grantPlan(id, plan, REFERRAL_MONTHS);
    await recordPlanOrder({ company: id, plan, months: REFERRAL_MONTHS, paidAmount: 0, source: "referral" });
  }
  if (referrer) await notify(referrer._id, "referralReward", { name: claim.name, months: REFERRAL_MONTHS }, "/billing");
}
