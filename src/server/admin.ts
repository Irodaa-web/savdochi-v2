import "server-only";
import { isValidObjectId, Types } from "mongoose";
import { AppError } from "@/lib/api";
import { forgetSessionUser } from "@/lib/auth/session";
import { fillDays, periodStart } from "@/lib/chart";
import { connectDb } from "@/lib/db";
import type { OrderStatus } from "@/lib/orders";
import type { RegionCode } from "@/lib/regions";
import { TIME_ZONE } from "@/i18n/format";
import { AuditLog } from "@/models/AuditLog";
import { Order } from "@/models/Order";
import { PlanOrder } from "@/models/PlanOrder";
import { Partnership } from "@/models/Partnership";
import { Product } from "@/models/Product";
import { Staff } from "@/models/Staff";
import { Ticket } from "@/models/Ticket";
import { User, type Verification } from "@/models/User";
import { audit, notify } from "./notify";
import { effectivePlan, PLANS, type PlanCode } from "@/lib/plans";
import { applyPlanTo, recordPlanOrder, rewardReferral, type PaidPlan } from "./billing";
import { forgetHiddenSellers } from "./products";
import { smsEnabled } from "./sms";
import { telegramConfig } from "./telegram";

const DAY = 86_400_000;

export function adminPhones(): string[] {
  return (process.env.ADMIN_PHONES ?? "").split(",").map((p) => p.trim()).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Bosh panel                                                          */
/* ------------------------------------------------------------------ */

export type AdminOverview = {
  sellers: number;
  buyers: number;
  newToday: number;
  newWeek: number;
  pending: number;
  openTickets: number;
  /** Ko'rib chiqilmagan tarif so'rovlari. */
  planRequests: number;
  blocked: number;
  inactive: number;
  activeProducts: number;
  orders: { today: { n: number; value: number }; week: { n: number; value: number }; month: { n: number; value: number } };
  /** So'nggi 30 kunda buyurtma olgan kompaniyalar. */
  activeSellers: number;
  trend: { day: string; value: number; orders: number }[];
  expiring: { id: string; name: string; until: string }[];
  expired: number;
  recentUsers: { id: string; name: string; role: "buyer" | "seller"; createdAt: string; verification: Verification }[];
  system: { telegram: boolean; sms: boolean; cron: boolean; admins: number };
};

export async function adminOverview(): Promise<AdminOverview> {
  await connectDb();
  const now = Date.now();
  const today = periodStart(now, 1);
  const week = periodStart(now, 7);
  const month = periodStart(now, 30);
  const live = { status: { $ne: "cancelled" } };
  const sum = async (since: Date) => {
    const [r] = await Order.aggregate<{ n: number; value: number }>([{ $match: { ...live, createdAt: { $gte: since } } }, { $group: { _id: null, n: { $sum: 1 }, value: { $sum: "$total" } } }]);
    return { n: r?.n ?? 0, value: r?.value ?? 0 };
  };
  const [sellers, buyers, newToday, newWeek, pending, openTickets, planRequests, blocked, inactive, activeProducts, oToday, oWeek, oMonth, activeSellers, daily, expiring, expired, recent] = await Promise.all([
    User.countDocuments({ role: "seller" }),
    User.countDocuments({ role: "buyer" }),
    User.countDocuments({ createdAt: { $gte: today } }),
    User.countDocuments({ createdAt: { $gte: week } }),
    User.countDocuments({ verification: "pending" }),
    Ticket.countDocuments({ status: "open" }),
    PlanOrder.countDocuments({ status: "pending" }),
    User.countDocuments({ blocked: true }),
    User.countDocuments({ inactive: true }),
    Product.countDocuments({ active: true }),
    sum(today),
    sum(week),
    sum(month),
    Order.distinct("seller", { ...live, createdAt: { $gte: month } }).then((ids) => ids.length),
    Order.aggregate<{ _id: string; value: number; orders: number }>([
      { $match: { ...live, createdAt: { $gte: month } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TIME_ZONE } }, value: { $sum: "$total" }, orders: { $sum: 1 } } },
    ]),
    User.find({ role: "seller", blocked: false, subscriptionUntil: { $gt: new Date(now), $lt: new Date(now + 7 * DAY) } }, { name: 1, subscriptionUntil: 1 }).sort({ subscriptionUntil: 1 }).limit(10).lean(),
    User.countDocuments({ role: "seller", subscriptionUntil: { $ne: null, $lt: new Date(now) } }),
    User.find({}, { name: 1, role: 1, createdAt: 1, verification: 1 }).sort({ createdAt: -1 }).limit(6).lean(),
  ]);
  return {
    sellers,
    buyers,
    newToday,
    newWeek,
    pending,
    openTickets,
    planRequests,
    blocked,
    inactive,
    activeProducts,
    orders: { today: oToday, week: oWeek, month: oMonth },
    activeSellers,
    trend: fillDays(month, 30, daily),
    expiring: expiring.map((u) => ({ id: String(u._id), name: u.name, until: u.subscriptionUntil!.toISOString() })),
    expired,
    recentUsers: recent.map((u) => ({ id: String(u._id), name: u.name, role: u.role, createdAt: u.createdAt.toISOString(), verification: u.verification })),
    system: {
      telegram: telegramConfig().enabled,
      sms: smsEnabled(),
      cron: Boolean(process.env.CRON_SECRET),
      admins: adminPhones().length,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Foydalanuvchilar                                                    */
/* ------------------------------------------------------------------ */

export const USER_STATUSES = ["pending", "verified", "rejected", "unverified", "blocked", "inactive", "hidden", "demo"] as const;
export type UserStatusFilter = (typeof USER_STATUSES)[number];

export type AdminUserRow = {
  id: string;
  role: "buyer" | "seller";
  name: string;
  phone: string;
  region: RegionCode;
  verification: Verification;
  blocked: boolean;
  inactive: boolean;
  hidden: boolean;
  demo: boolean;
  isAdmin: boolean;
  subscriptionUntil: string | null;
  /** Amaldagi tarif (kompaniya uchun). */
  plan: PlanCode;
  /** Hisob rasmi ("" — yo'q). */
  logo: string;
  planTrial: boolean;
  lastActiveAt: string | null;
  createdAt: string;
};

const PAGE = 30;

export async function listUsers(opts: { q?: string; role?: "buyer" | "seller"; status?: UserStatusFilter; page?: number }): Promise<{ items: AdminUserRow[]; total: number; page: number; pages: number }> {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (opts.role) filter.role = opts.role;
  switch (opts.status) {
    case "pending":
    case "verified":
    case "rejected":
    case "unverified":
      filter.verification = opts.status;
      break;
    case "blocked":
      filter.blocked = true;
      break;
    case "inactive":
      filter.inactive = true;
      break;
    case "hidden":
      filter.hidden = true;
      break;
    case "demo":
      filter.demo = true;
      break;
  }
  const q = opts.q?.trim();
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 60);
    const digits = q.replace(/\D/g, "");
    filter.$or = [{ name: { $regex: escaped, $options: "i" } }, ...(digits.length >= 3 ? [{ phone: { $regex: digits } }] : [])];
  }
  const page = Math.max(1, opts.page ?? 1);
  const admins = new Set(adminPhones());
  const [docs, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE).limit(PAGE).lean(),
    User.countDocuments(filter),
  ]);
  return {
    items: docs.map((u) => ({
      id: String(u._id),
      role: u.role,
      name: u.name,
      phone: u.phone,
      region: u.region,
      verification: u.verification,
      blocked: u.blocked,
      inactive: Boolean(u.inactive),
      hidden: Boolean(u.hidden),
      demo: Boolean(u.demo),
      isAdmin: admins.has(u.phone),
      subscriptionUntil: u.subscriptionUntil ? u.subscriptionUntil.toISOString() : null,
      plan: effectivePlan(u),
      logo: u.logo ?? "",
      planTrial: Boolean(u.planTrial),
      lastActiveAt: u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : null,
      createdAt: u.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE)),
  };
}

export type AdminUserDetail = AdminUserRow & {
  verificationNote: string;
  telegram: boolean;
  profile: { address: string; about: string; inn: string; bankName: string; bankAccount: string; mfo: string };
  stats: { orders: number; value: number; products: number; partners: number; staff: number; openTickets: number };
  orders: { id: string; number: number; party: string; total: number; status: OrderStatus; createdAt: string }[];
  products: { id: string; name: string; price: number; stock: number; active: boolean }[];
  staff: { name: string; phone: string; role: string; blocked: boolean }[];
};

export async function getUserDetail(id: string): Promise<AdminUserDetail | null> {
  if (!isValidObjectId(id)) return null;
  await connectDb();
  const u = await User.findById(id).lean();
  if (!u) return null;
  const oid = new Types.ObjectId(id);
  const side = u.role === "seller" ? "seller" : "buyer";
  const [[totals], orders, products, productCount, partners, staff, openTickets] = await Promise.all([
    Order.aggregate<{ n: number; value: number }>([{ $match: { [side]: oid, status: { $ne: "cancelled" } } }, { $group: { _id: null, n: { $sum: 1 }, value: { $sum: "$total" } } }]),
    Order.find({ [side]: oid }, { number: 1, buyer: 1, seller: 1, total: 1, status: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(10).lean(),
    u.role === "seller" ? Product.find({ seller: oid }, { name: 1, price: 1, stock: 1, active: 1 }).sort({ active: -1, updatedAt: -1 }).limit(12).lean() : Promise.resolve([]),
    u.role === "seller" ? Product.countDocuments({ seller: oid, active: true }) : Promise.resolve(0),
    Partnership.countDocuments({ [side]: oid, status: "active" }),
    u.role === "seller" ? Staff.find({ company: oid }, { name: 1, phone: 1, role: 1, blocked: 1 }).lean() : Promise.resolve([]),
    Ticket.countDocuments({ user: oid, status: { $ne: "resolved" } }),
  ]);
  const parties = await User.find({ _id: { $in: orders.map((o) => (side === "seller" ? o.buyer : o.seller)) } }, { name: 1 }).lean();
  const partyName = new Map(parties.map((p) => [String(p._id), p.name]));
  const p = u.profile ?? ({} as Partial<NonNullable<typeof u.profile>>);
  return {
    id,
    role: u.role,
    name: u.name,
    phone: u.phone,
    region: u.region,
    verification: u.verification,
    verificationNote: u.verificationNote ?? "",
    blocked: u.blocked,
    inactive: Boolean(u.inactive),
    hidden: Boolean(u.hidden),
    demo: Boolean(u.demo),
    isAdmin: adminPhones().includes(u.phone),
    subscriptionUntil: u.subscriptionUntil ? u.subscriptionUntil.toISOString() : null,
    plan: effectivePlan(u),
    logo: u.logo ?? "",
    planTrial: Boolean(u.planTrial),
    lastActiveAt: u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : null,
    createdAt: u.createdAt.toISOString(),
    telegram: Boolean(u.telegram?.chatId),
    profile: { address: p.address ?? "", about: p.about ?? "", inn: p.inn ?? "", bankName: p.bankName ?? "", bankAccount: p.bankAccount ?? "", mfo: p.mfo ?? "" },
    stats: { orders: totals?.n ?? 0, value: totals?.value ?? 0, products: productCount, partners, staff: staff.length, openTickets },
    orders: orders.map((o) => ({ id: String(o._id), number: o.number, party: partyName.get(String(side === "seller" ? o.buyer : o.seller)) ?? "—", total: o.total, status: o.status, createdAt: o.createdAt.toISOString() })),
    products: products.map((x) => ({ id: String(x._id), name: x.name, price: x.price, stock: x.stock, active: x.active })),
    staff: staff.map((s) => ({ name: s.name, phone: s.phone, role: s.role, blocked: s.blocked })),
  };
}

export type AdminUserInput = { verification?: Verification; reason?: string; blocked?: boolean; extendMonths?: number; plan?: PlanCode; gift?: boolean; hidden?: boolean; reactivate?: boolean };

/**
 * Administrator amallari. Himoya: o'zini va boshqa administratorni bloklab bo'lmaydi.
 * Rad etishda sabab foydalanuvchiga bildirishnoma bilan yuboriladi.
 */
export async function adminUpdateUser(adminId: string, id: string, input: AdminUserInput, ip: string): Promise<void> {
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const u = await User.findById(id);
  if (!u) throw new AppError("NOT_FOUND");
  if (input.blocked && (id === adminId || adminPhones().includes(u.phone))) throw new AppError("INVALID_INPUT", { blocked: "adminSelfBlock" });

  if (input.verification && input.verification !== u.verification) {
    u.verification = input.verification;
    u.verificationNote = input.verification === "rejected" ? (input.reason ?? "").trim() : "";
    if (input.verification === "verified") await notify(u._id, "verified", {}, u.role === "seller" ? "/products" : "/profile");
    if (input.verification === "rejected") await notify(u._id, "verificationRejected", { reason: u.verificationNote || "—" }, "/profile");
  }
  if (input.blocked !== undefined && input.blocked !== u.blocked) {
    u.blocked = input.blocked;
    // Bloklansa — barcha sessiyalar bekor bo'ladi.
    if (input.blocked) u.authVersion += 1;
  }
  if (input.hidden !== undefined) u.hidden = input.hidden;
  if (input.reactivate && u.inactive) {
    u.inactive = false;
    u.inactiveAt = null;
    u.lastActiveAt = new Date();
    u.inactivity = { warned12At: null, warned14At: null };
  }
  // Tarif (faqat kompaniya): Bepulga o'tkazish yoki pullik tarifni N oyga yoqish/uzaytirish.
  // Xuddi shu tarif hali amalda bo'lsa — muddat davom ettiriladi, aks holda bugundan boshlanadi.
  let planNote: { plan: PlanCode; until: Date | null } | null = null;
  if (u.role === "seller" && (input.extendMonths === -1 || input.plan === "free")) {
    u.plan = "free";
    u.subscriptionUntil = null;
    u.planTrial = false;
    planNote = { plan: "free", until: null };
  } else if (u.role === "seller" && input.extendMonths && input.extendMonths > 0) {
    const current = effectivePlan(u);
    const plan: PaidPlan = input.plan && input.plan !== "free" ? input.plan : current === "free" ? "premium" : current;
    planNote = { plan, until: applyPlanTo(u, plan, input.extendMonths) };
  }
  await u.save();
  // Taklif bilan kelgan kompaniya tasdiqlansa — ikkala kompaniyaga sovg'a (bir marta).
  if (input.verification === "verified" && u.role === "seller") await rewardReferral(u._id);
  // To'lovlar jurnali: administrator to'g'ridan-to'g'ri yoqqan tarif — narx bo'yicha to'langan deb yoziladi.
  if (planNote && planNote.plan !== "free" && input.extendMonths && input.extendMonths > 0)
    await recordPlanOrder({
      company: u._id,
      plan: planNote.plan,
      months: input.extendMonths,
      // Sovg'a — to'lovsiz (daromadga qo'shilmaydi); oddiy yoqish — narx bo'yicha to'langan deb yoziladi.
      paidAmount: input.gift ? 0 : PLANS[planNote.plan].price * input.extendMonths,
      source: input.gift ? "gift" : "admin",
      adminId,
    });
  forgetSessionUser(id);
  forgetHiddenSellers();
  if (planNote && input.gift && planNote.plan !== "free") await notify(u._id, "planGift", { plan: planNote.plan, months: input.extendMonths ?? 0 }, "/billing");
  else if (planNote) await notify(u._id, "planChanged", { plan: planNote.plan, until: planNote.until ? planNote.until.toISOString().slice(0, 10) : "" }, "/billing");
  await audit(adminId, "admin.user.update", `user:${id}`, input as Record<string, unknown>, ip);
}

/* ------------------------------------------------------------------ */
/* Mahsulotlar moderatsiyasi va buyurtmalar monitoringi                */
/* ------------------------------------------------------------------ */

export type AdminProductRow = { id: string; name: string; price: number; stock: number; active: boolean; hidden: boolean; note: string; seller: { id: string; name: string }; updatedAt: string };

export async function listProductsAdmin(opts: { q?: string; filter?: "hidden" | "archived"; page?: number }): Promise<{ items: AdminProductRow[]; total: number; page: number; pages: number }> {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (opts.filter === "hidden") filter.hiddenByAdmin = true;
  if (opts.filter === "archived") filter.active = false;
  const q = opts.q?.trim();
  if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 60), $options: "i" };
  const page = Math.max(1, opts.page ?? 1);
  const [docs, total] = await Promise.all([
    Product.find(filter, { name: 1, price: 1, stock: 1, active: 1, hiddenByAdmin: 1, adminNote: 1, seller: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).skip((page - 1) * PAGE).limit(PAGE).lean(),
    Product.countDocuments(filter),
  ]);
  const sellers = await User.find({ _id: { $in: docs.map((d) => d.seller) } }, { name: 1 }).lean();
  const name = new Map(sellers.map((s) => [String(s._id), s.name]));
  return {
    items: docs.map((d) => ({
      id: String(d._id),
      name: d.name,
      price: d.price,
      stock: d.stock,
      active: d.active,
      hidden: Boolean(d.hiddenByAdmin),
      note: d.adminNote ?? "",
      seller: { id: String(d.seller), name: name.get(String(d.seller)) ?? "—" },
      updatedAt: new Date(d.updatedAt).toISOString(),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE)),
  };
}

/** Mahsulotni sabab bilan yashirish yoki qaytarish; kompaniyaga bildirishnoma boradi. */
export async function moderateProduct(adminId: string, id: string, input: { hidden: boolean; note?: string }, ip: string): Promise<void> {
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const note = input.hidden ? (input.note ?? "").trim() : "";
  const p = await Product.findByIdAndUpdate(id, { $set: { hiddenByAdmin: input.hidden, adminNote: note } }, { new: true }).lean();
  if (!p) throw new AppError("NOT_FOUND");
  await notify(p.seller, input.hidden ? "productHidden" : "productRestored", { product: p.name, reason: note || "—" }, "/products");
  await audit(adminId, input.hidden ? "admin.product.hide" : "admin.product.show", `product:${id}`, { name: p.name, ...(note ? { reason: note } : {}) }, ip);
}

export type AdminOrderRow = { id: string; number: number; buyer: string; seller: string; total: number; paid: number; status: OrderStatus; paymentStatus: string; items: number; createdAt: string };

export async function listOrdersAdmin(opts: { q?: string; status?: OrderStatus; page?: number }): Promise<{ items: AdminOrderRow[]; total: number; page: number; pages: number; value: number }> {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  const q = opts.q?.trim();
  if (q) {
    const n = Number(q.replace(/\D/g, ""));
    if (n && /^\D*\d+$/.test(q)) filter.number = n;
    else {
      const users = await User.find({ name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 60), $options: "i" } }, { _id: 1 }).limit(50).lean();
      const ids = users.map((u) => u._id);
      filter.$or = [{ buyer: { $in: ids } }, { seller: { $in: ids } }];
    }
  }
  const page = Math.max(1, opts.page ?? 1);
  const [docs, total, [sum]] = await Promise.all([
    Order.find(filter, { number: 1, buyer: 1, seller: 1, total: 1, paidAmount: 1, status: 1, paymentStatus: 1, items: 1, createdAt: 1 }).sort({ createdAt: -1 }).skip((page - 1) * PAGE).limit(PAGE).lean(),
    Order.countDocuments(filter),
    Order.aggregate<{ value: number }>([{ $match: { ...filter, status: opts.status ?? { $ne: "cancelled" } } }, { $group: { _id: null, value: { $sum: "$total" } } }]),
  ]);
  const parties = await User.find({ _id: { $in: docs.flatMap((d) => [d.buyer, d.seller]) } }, { name: 1 }).lean();
  const name = new Map(parties.map((u) => [String(u._id), u.name]));
  return {
    items: docs.map((d) => ({
      id: String(d._id),
      number: d.number,
      buyer: name.get(String(d.buyer)) ?? "—",
      seller: name.get(String(d.seller)) ?? "—",
      total: d.total,
      paid: d.paidAmount ?? 0,
      status: d.status,
      paymentStatus: d.paymentStatus,
      items: d.items?.length ?? 0,
      createdAt: d.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE)),
    value: sum?.value ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/* Jurnal                                                              */
/* ------------------------------------------------------------------ */

export type AuditView = { id: string; actor: string; action: string; target: string; targetName: string | null; details: Record<string, unknown>; ip: string; createdAt: string };

/** Turkumlar: jurnal filtri uchun (amal nomining boshlanishi bo'yicha). */
export const AUDIT_KINDS = ["admin", "auth", "staff", "inactivity", "pay"] as const;
export type AuditKind = (typeof AUDIT_KINDS)[number];

export async function listAudit(opts: { kind?: AuditKind; page?: number } = {}): Promise<{ items: AuditView[]; pages: number; page: number }> {
  await connectDb();
  const filter = opts.kind ? { action: { $regex: `^${opts.kind}\\.` } } : {};
  const page = Math.max(1, opts.page ?? 1);
  const PER = 50;
  const [docs, total] = await Promise.all([AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PER).limit(PER).lean(), AuditLog.countDocuments(filter)]);
  // Kim va kimga nisbatan — ID o'rniga ismlar.
  const userIds = new Set<string>();
  for (const d of docs) {
    if (d.actor) userIds.add(String(d.actor));
    const m = /^user:([a-f0-9]{24})$/.exec(d.target ?? "");
    if (m) userIds.add(m[1]!);
    else if (/^[a-f0-9]{24}$/.test(d.target ?? "")) userIds.add(d.target);
  }
  const staffIds = docs.map((d) => /^staff:([a-f0-9]{24})$/.exec(d.target ?? "")?.[1]).filter((x): x is string => Boolean(x));
  const [users, staff] = await Promise.all([
    User.find({ _id: { $in: [...userIds] } }, { name: 1 }).lean(),
    Staff.find({ _id: { $in: staffIds } }, { name: 1 }).lean(),
  ]);
  const names = new Map([...users, ...staff].map((u) => [String(u._id), u.name]));
  return {
    page,
    pages: Math.max(1, Math.ceil(total / PER)),
    items: docs.map((d) => {
      const targetId = /^(?:user|staff):([a-f0-9]{24})$/.exec(d.target ?? "")?.[1] ?? (/^[a-f0-9]{24}$/.test(d.target ?? "") ? d.target : null);
      return {
        id: String(d._id),
        // "" — tizim; "?" — o'chirilgan foydalanuvchi.
        actor: d.actor ? (names.get(String(d.actor)) ?? "?") : "",
        action: d.action,
        target: d.target,
        targetName: targetId ? (names.get(targetId) ?? null) : null,
        details: (d.details ?? {}) as Record<string, unknown>,
        ip: d.ip,
        createdAt: d.createdAt.toISOString(),
      };
    }),
  };
}

/** Eski admin sahifasi uchun (sidebar belgisi va h.k.). */
export async function adminStats() {
  const o = await adminOverview();
  return { sellers: o.sellers, buyers: o.buyers, pending: o.pending, products: o.activeProducts, orders: o.orders.month.n, openTickets: o.openTickets };
}
