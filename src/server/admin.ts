import "server-only";
import { isValidObjectId } from "mongoose";
import { AppError } from "@/lib/api";
import { connectDb } from "@/lib/db";
import type { RegionCode } from "@/lib/regions";
import { AuditLog } from "@/models/AuditLog";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Ticket } from "@/models/Ticket";
import { User, type Verification } from "@/models/User";
import { audit, notify } from "./notify";

export type AdminUserView = {
  id: string;
  role: "buyer" | "seller";
  name: string;
  phone: string;
  region: RegionCode;
  verification: Verification;
  blocked: boolean;
  demo: boolean;
  subscriptionUntil: string | null;
  address: string;
  createdAt: string;
};

export async function adminStats() {
  await connectDb();
  const [sellers, buyers, pending, products, orders, openTickets] = await Promise.all([
    User.countDocuments({ role: "seller" }),
    User.countDocuments({ role: "buyer" }),
    User.countDocuments({ verification: "pending" }),
    Product.countDocuments({ active: true }),
    Order.countDocuments({}),
    Ticket.countDocuments({ status: { $ne: "resolved" } }),
  ]);
  return { sellers, buyers, pending, products, orders, openTickets };
}

export async function listUsers(opts: { q?: string; role?: "buyer" | "seller"; verification?: Verification }): Promise<AdminUserView[]> {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (opts.role) filter.role = opts.role;
  if (opts.verification) filter.verification = opts.verification;
  const q = opts.q?.trim();
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 60);
    filter.$or = [{ name: { $regex: escaped, $options: "i" } }, { phone: { $regex: escaped.replace(/\D/g, "") || escaped } }];
  }
  const docs = await User.find(filter).sort({ verification: 1, createdAt: -1 }).limit(200).lean();
  return docs.map((u) => ({
    id: String(u._id),
    role: u.role,
    name: u.name,
    phone: u.phone,
    region: u.region,
    verification: u.verification,
    blocked: u.blocked,
    demo: Boolean(u.demo),
    subscriptionUntil: u.subscriptionUntil ? u.subscriptionUntil.toISOString() : null,
    address: u.profile?.address ?? "",
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function adminUpdateUser(adminId: string, id: string, input: { verification?: Verification; blocked?: boolean; extendMonths?: number }, ip: string): Promise<void> {
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const u = await User.findById(id);
  if (!u) throw new AppError("NOT_FOUND");
  if (input.verification && input.verification !== u.verification) {
    u.verification = input.verification;
    if (input.verification === "verified") await notify(u._id, "verified", {}, "/profile");
  }
  if (input.blocked !== undefined && input.blocked !== u.blocked) {
    u.blocked = input.blocked;
    // Bloklansa — barcha sessiyalar bekor bo'ladi.
    if (input.blocked) u.authVersion += 1;
  }
  if (input.extendMonths === -1) {
    u.subscriptionUntil = new Date(Date.now() - 1000);
  } else if (input.extendMonths && input.extendMonths > 0) {
    const base = u.subscriptionUntil && u.subscriptionUntil.getTime() > Date.now() ? new Date(u.subscriptionUntil) : new Date();
    base.setMonth(base.getMonth() + input.extendMonths);
    u.subscriptionUntil = base;
  }
  await u.save();
  await audit(adminId, "admin.user.update", `user:${id}`, input, ip);
}

export type AuditView = { id: string; actor: string; action: string; target: string; details: string; ip: string; createdAt: string };

export async function listAudit(): Promise<AuditView[]> {
  await connectDb();
  const docs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
  const users = await User.find({ _id: { $in: docs.map((d) => d.actor).filter(Boolean) } }, { name: 1 }).lean();
  const name = new Map(users.map((u) => [String(u._id), u.name]));
  return docs.map((d) => ({
    id: String(d._id),
    actor: d.actor ? (name.get(String(d.actor)) ?? String(d.actor)) : "system",
    action: d.action,
    target: d.target,
    details: JSON.stringify(d.details ?? {}),
    ip: d.ip,
    createdAt: d.createdAt.toISOString(),
  }));
}
