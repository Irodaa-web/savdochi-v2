import "server-only";
import { isValidObjectId, Types } from "mongoose";
import { AppError } from "@/lib/api";
import type { SessionUser } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type { RegionCode } from "@/lib/regions";
import { Order } from "@/models/Order";
import { Partnership, type PartnershipDoc, type PartnershipStatus } from "@/models/Partnership";
import { User } from "@/models/User";
import { notify } from "./notify";

export type PartnerView = {
  id: string;
  status: PartnershipStatus;
  requestedBy: "buyer" | "seller";
  /** So'rov menga kelganmi (javob berishim kerakmi). */
  incoming: boolean;
  discount: number;
  terms: string;
  shareStock: boolean;
  creditLimit: number;
  paymentDays: number;
  partner: { id: string; name: string; region: RegionCode; verified: boolean; phone: string };
  orderCount: number;
  orderValue: number;
  lastOrderAt: string | null;
  updatedAt: string;
};

type Side = { me: "buyer" | "seller"; other: "buyer" | "seller" };
const sideOf = (user: SessionUser): Side => (user.role === "seller" ? { me: "seller", other: "buyer" } : { me: "buyer", other: "seller" });

export async function listPartners(user: SessionUser): Promise<PartnerView[]> {
  await connectDb();
  const { me, other } = sideOf(user);
  const docs = await Partnership.find({ [me]: user.id }).sort({ updatedAt: -1 }).lean<PartnershipDoc[]>();
  const otherIds = docs.map((d) => d[other]);
  const [users, stats] = await Promise.all([
    User.find({ _id: { $in: otherIds } }, { name: 1, region: 1, verification: 1, phone: 1 }).lean(),
    Order.aggregate<{ _id: Types.ObjectId; n: number; sum: number; last: Date }>([
      { $match: { [me]: new Types.ObjectId(user.id), [other]: { $in: otherIds }, status: { $ne: "cancelled" } } },
      { $group: { _id: `$${other}`, n: { $sum: 1 }, sum: { $sum: "$total" }, last: { $max: "$createdAt" } } },
    ]),
  ]);
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const statBy = new Map(stats.map((s) => [String(s._id), s]));
  return docs.flatMap((d) => {
    const u = byId.get(String(d[other]));
    if (!u) return [];
    const s = statBy.get(String(d[other]));
    return [
      {
        id: String(d._id),
        status: d.status,
        requestedBy: d.requestedBy,
        incoming: d.status === "pending" && d.requestedBy !== me,
        discount: d.discount,
        terms: d.terms,
        shareStock: d.shareStock,
        creditLimit: d.creditLimit ?? 0,
        paymentDays: d.paymentDays ?? 14,
        partner: { id: String(u._id), name: u.name, region: u.region, verified: u.verification === "verified", phone: d.status === "active" ? u.phone : "" },
        orderCount: s?.n ?? 0,
        orderValue: s?.sum ?? 0,
        lastOrderAt: s?.last ? s.last.toISOString() : null,
        updatedAt: d.updatedAt.toISOString(),
      },
    ];
  });
}

/** Ikki tomon o'rtasidagi hamkorlik (bo'lmasa null). */
export async function findPartnership(sellerId: string, buyerId: string): Promise<PartnershipDoc | null> {
  if (!isValidObjectId(sellerId) || !isValidObjectId(buyerId)) return null;
  await connectDb();
  return Partnership.findOne({ seller: sellerId, buyer: buyerId }).lean<PartnershipDoc>();
}

/** Hamkorlik so'rovi. Rad etilgan bo'lsa — qayta so'rov yuborish mumkin. */
export async function requestPartnership(user: SessionUser, otherId: string): Promise<PartnerView["status"]> {
  if (!isValidObjectId(otherId) || otherId === user.id) throw new AppError("NOT_FOUND");
  await connectDb();
  const { me, other } = sideOf(user);
  const target = await User.findOne({ _id: otherId, role: other, blocked: false }, { name: 1 }).lean();
  if (!target) throw new AppError("NOT_FOUND");
  const key = { [me]: user.id, [other]: otherId } as { seller: string; buyer: string };
  const existing = await Partnership.findOne(key);
  if (existing?.status === "active") return "active";
  if (existing?.status === "pending" && existing.requestedBy !== me) {
    // Ikkinchi tomon ham so'rov yuborgan bo'lsa — darhol faollashadi.
    existing.status = "active";
    await existing.save();
    await notify(otherId, "partnerAccepted", { name: user.name }, "/partners");
    return "active";
  }
  if (existing) {
    existing.status = "pending";
    existing.requestedBy = me;
    await existing.save();
  } else {
    await Partnership.create({ ...key, requestedBy: me });
  }
  await notify(otherId, "partnerRequest", { name: user.name }, "/partners");
  return "pending";
}

export async function updatePartnership(
  user: SessionUser,
  id: string,
  input: { action: "accept" | "reject" | "update"; discount?: number; terms?: string; shareStock?: boolean; creditLimit?: number; paymentDays?: number },
): Promise<void> {
  if (!isValidObjectId(id)) throw new AppError("NOT_FOUND");
  await connectDb();
  const { me, other } = sideOf(user);
  const doc = await Partnership.findOne({ _id: id, [me]: user.id });
  if (!doc) throw new AppError("NOT_FOUND");

  if (input.action === "accept" || input.action === "reject") {
    if (doc.status !== "pending" || doc.requestedBy === me) throw new AppError("INVALID_STATE");
    doc.status = input.action === "accept" ? "active" : "rejected";
    await doc.save();
    await notify(doc[other], input.action === "accept" ? "partnerAccepted" : "partnerRejected", { name: user.name }, "/partners");
    return;
  }
  // Chegirma va shartlarni kompaniya belgilaydi; qoldiqni ko'rsatishni do'kon hal qiladi.
  if (me === "seller") {
    if (input.discount !== undefined) doc.discount = input.discount;
    if (input.terms !== undefined) doc.terms = input.terms;
    if (input.creditLimit !== undefined) doc.creditLimit = input.creditLimit;
    if (input.paymentDays !== undefined) doc.paymentDays = input.paymentDays;
  } else if (input.shareStock !== undefined) {
    doc.shareStock = input.shareStock;
  }
  await doc.save();
}

/** Do'kon uchun: kompaniya bilan faol hamkorlikdagi chegirma, %. */
export async function partnerDiscount(sellerId: string, buyerId: string): Promise<number> {
  const p = await findPartnership(sellerId, buyerId);
  return p?.status === "active" ? p.discount : 0;
}
