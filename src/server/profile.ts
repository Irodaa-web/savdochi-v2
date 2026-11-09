import "server-only";
import { isValidObjectId } from "mongoose";
import { AppError } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { connectDb } from "@/lib/db";
import type { PaymentMethod } from "@/lib/orders";
import type { RegionCode } from "@/lib/regions";
import type { ProfileInput } from "@/lib/validation";
import { Product } from "@/models/Product";
import { User, type Profile, type UserDoc } from "@/models/User";

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
  paymentMethods: ["cash"] as PaymentMethod[],
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
  // Hisob ma'lumotlari to'ldirilsa — tekshiruvga navbatga qo'yiladi.
  if (u.verification === "unverified" && profile.address) await User.updateOne({ _id: userId }, { $set: { verification: "pending" } });
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
export async function getSellerPublic(sellerId: string): Promise<(ProfileView & { productCount: number }) | null> {
  const view = await getProfile(sellerId);
  if (!view || view.role !== "seller") return null;
  const productCount = await Product.countDocuments({ seller: sellerId, active: true });
  return { ...view, productCount };
}

/** Obuna faolmi: null — cheklovsiz, aks holda sana kelajakda bo'lishi kerak. */
export function subscriptionActive(until: Date | string | null | undefined): boolean {
  if (!until) return true;
  return new Date(until).getTime() > Date.now();
}
