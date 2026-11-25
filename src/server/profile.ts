import "server-only";
import { forgetSessionUser } from "@/lib/auth/session";
import { isValidObjectId } from "mongoose";
import { AppError } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { connectDb } from "@/lib/db";
import type { PaymentMethod } from "@/lib/orders";
import type { RegionCode } from "@/lib/regions";
import type { ProfileInput } from "@/lib/validation";
import { Product } from "@/models/Product";
import { User, type Profile, type UserDoc } from "@/models/User";
import { notifyAdmins } from "./notify";

export type ProfileView = {
  id: string;
  role: "buyer" | "seller";
  name: string;
  phone: string;
  region: RegionCode;
  verified: boolean;
  profile: Profile;
  subscriptionUntil: string | null;
  createdAt: string;
};

export const DEFAULT_PROFILE: Profile = {
  about: "",
  address: "",
  lat: null,
  lng: null,
  deliveryRegions: [],
  deliveryDays: [1, 2, 3, 4, 5, 6],
  leadDays: 1,
  deliveryFee: 0,
  minOrderTotal: 0,
  regionRules: [],
  paymentMethods: ["cash"] as PaymentMethod[],
  pickup: false,
  inn: "",
  bankName: "",
  bankAccount: "",
  mfo: "",
};

export function profileOf(user: Pick<UserDoc, "profile">): Profile {
  return { ...DEFAULT_PROFILE, ...(user.profile ?? {}) };
}

function toView(u: UserDoc): ProfileView {
  return {
    id: String(u._id),
    role: u.role,
    name: u.name,
    phone: u.phone,
    region: u.region,
    verified: u.verification === "verified",
    profile: profileOf(u),
    subscriptionUntil: u.subscriptionUntil ? u.subscriptionUntil.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function getProfile(userId: string): Promise<ProfileView | null> {
  if (!isValidObjectId(userId)) return null;
  await connectDb();
  const u = await User.findById(userId).lean<UserDoc>();
  return u && !u.blocked ? toView(u) : null;
}

export async function updateProfile(userId: string, input: ProfileInput): Promise<ProfileView> {
  await connectDb();
  const { name, region, ...profile } = input;
  const u = await User.findByIdAndUpdate(userId, { $set: { name, region, profile } }, { new: true, runValidators: true }).lean<UserDoc>();
  if (!u) throw new AppError("NOT_FOUND");
  forgetSessionUser(userId);
  // Hisob ma'lumotlari to'ldirilsa — tekshiruvga navbatga qo'yiladi. Rad etilgan hisob ma'lumotini
  // tuzatib saqlasa — qayta tekshiruvga tushadi (aks holda "rad etilgan"ligicha qolib ketardi).
  if ((u.verification === "unverified" || u.verification === "rejected") && profile.address) {
    const res = await User.updateOne({ _id: userId, verification: u.verification }, { $set: { verification: "pending" } });
    if (res.modifiedCount === 1) {
      forgetSessionUser(userId);
      await notifyAdmins("verificationPending", { name: u.name }, "/admin/users?status=pending");
      return toView({ ...u, verification: "pending" as const });
    }
  }
  return toView(u);
}

export async function changePassword(userId: string, current: string, next: string): Promise<void> {
  await connectDb();
  const u = await User.findById(userId).select("+passwordHash");
  if (!u || !(await verifyPassword(current, u.passwordHash))) throw new AppError("INVALID_CREDENTIALS", { current: "INVALID_CREDENTIALS" });
  u.passwordHash = await hashPassword(next);
  u.authVersion += 1;
  await u.save();
}

/** Kompaniyaning ommaviy sahifasi uchun: profil + mahsulotlar soni. */
/**
 * Kompaniyaning ochiq sahifasi. Tasdiqlanmagan yoki demo kompaniya boshqalarga ko'rinmaydi —
 * faqat o'zi (qanday ko'rinishini tekshirish uchun) va administrator ko'radi.
 */
export async function getSellerPublic(sellerId: string, viewer?: { id: string; isAdmin: boolean }): Promise<(ProfileView & { productCount: number }) | null> {
  if (!isValidObjectId(sellerId)) return null;
  const [view, productCount, demo] = await Promise.all([
    getProfile(sellerId),
    Product.countDocuments({ seller: sellerId, active: true, hiddenByAdmin: { $ne: true } }),
    User.exists({ _id: sellerId, demo: true }),
  ]);
  if (!view || view.role !== "seller") return null;
  const privileged = viewer && (viewer.isAdmin || viewer.id === sellerId);
  if (!privileged && (demo || !view.verified)) return null;
  return { ...view, productCount };
}

/** Obuna faolmi: null — cheklovsiz, aks holda sana kelajakda bo'lishi kerak. */
export function subscriptionActive(until: Date | string | null | undefined): boolean {
  if (!until) return true;
  return new Date(until).getTime() > Date.now();
}
