import mongoose, { Schema, type Model, type Types } from "mongoose";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/orders";
import { REGION_CODES, type RegionCode } from "@/lib/regions";

export type Verification = "unverified" | "pending" | "verified" | "rejected";

/** Kompaniya va do'kon profili. Kompaniya uchun yetkazish shartlari ham shu yerda. */
export interface Profile {
  about: string;
  address: string;
  /** Do'kon uchun xaritadagi nuqta. */
  lat: number | null;
  lng: number | null;
  deliveryRegions: RegionCode[];
  /** Hafta kunlari: 1 = dushanba … 7 = yakshanba. */
  deliveryDays: number[];
  /** Buyurtmadan keyin necha kunda yetkaziladi. */
  leadDays: number;
  deliveryFee: number;
  minOrderTotal: number;
  paymentMethods: PaymentMethod[];
}

export interface UserDoc {
  _id: Types.ObjectId;
  role: "buyer" | "seller";
  name: string;
  phone: string;
  passwordHash: string;
  region: RegionCode;
  verification: Verification;
  blocked: boolean;
  /** Parol o'zgarsa oshiriladi — eski sessiyalar bekor bo'ladi. */
  authVersion: number;
  locale: "uz" | "ru" | "en";
  profile: Profile;
  /** Do'kon saqlagan mahsulotlar. */
  favorites: Types.ObjectId[];
  /** Kompaniya obunasi shu sanagacha amal qiladi. null — cheklovsiz (eski hisoblar). */
  subscriptionUntil: Date | null;
  demo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<Profile>(
  {
    about: { type: String, default: "", maxlength: 1000 },
    address: { type: String, default: "", maxlength: 300 },
    lat: { type: Number, default: null, min: -90, max: 90 },
    lng: { type: Number, default: null, min: -180, max: 180 },
    deliveryRegions: { type: [String], enum: REGION_CODES, default: [] },
    deliveryDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
    leadDays: { type: Number, default: 1, min: 0, max: 60 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    minOrderTotal: { type: Number, default: 0, min: 0 },
    paymentMethods: { type: [String], enum: PAYMENT_METHODS, default: ["cash"] },
  },
  { _id: false },
);

const userSchema = new Schema<UserDoc>(
  {
    role: { type: String, enum: ["buyer", "seller"], required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    region: { type: String, enum: REGION_CODES, required: true },
    verification: { type: String, enum: ["unverified", "pending", "verified", "rejected"], default: "unverified" },
    blocked: { type: Boolean, default: false },
    authVersion: { type: Number, default: 0 },
    locale: { type: String, enum: ["uz", "ru", "en"], default: "uz" },
    profile: { type: profileSchema, default: () => ({}) },
    favorites: { type: [Schema.Types.ObjectId], ref: "Product", default: [] },
    subscriptionUntil: { type: Date, default: null },
    demo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const User: Model<UserDoc> = (mongoose.models.User as Model<UserDoc>) ?? mongoose.model<UserDoc>("User", userSchema);
