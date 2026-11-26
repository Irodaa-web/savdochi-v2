import type { RegionRule } from "@/lib/delivery";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import { PROFILE_PAYMENT_METHODS, type PaymentMethod } from "@/lib/orders";
import { REGION_CODES, type RegionCode } from "@/lib/regions";
import { PLAN_CODES, type PlanCode } from "@/lib/plans";

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
  /** Viloyatlar bo'yicha alohida yetkazish kunlari, narxi va minimal summasi. */
  regionRules: RegionRule[];
  paymentMethods: PaymentMethod[];
  /** Do'kon buyurtmani kompaniya omboridan o'zi olib keta oladimi. */
  pickup: boolean;
  /** Rekvizitlar (hisob-faktura va akt sverka uchun). */
  inn: string;
  bankName: string;
  bankAccount: string;
  mfo: string;
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
  /** Parol o'zgarsa yoki hisob nofaol bo'lsa oshiriladi — eski sessiyalar bekor bo'ladi. */
  authVersion: number;
  /** Oxirgi muvaffaqiyatli kirish. 15 kun kirilmasa hisob avtomatik nofaol bo'ladi (lib/inactivity). */
  lastActiveAt: Date;
  /** Avtomatik nofaollik (admin bloklashidan farqli). Qayta kirishda SMS kod bilan tiklanadi. */
  inactive: boolean;
  inactiveAt: Date | null;
  /** Nofaollik ogohlantirishlari qachon yuborilgani — takror yuborilmasligi uchun. */
  inactivity: { warned12At: Date | null; warned14At: Date | null };
  locale: "uz" | "ru" | "en";
  /** Telegram bildirishnomalari: ulangan chat va bir martalik ulash kodi. */
  telegram: { chatId: number | null; linkCode: string | null; linkExpires: Date | null };
  /** Kompaniyaning onlayn to'lov hisoblari. Kalitlar shifrlangan (lib/secretBox). Profil API'sida qaytarilmaydi. */
  onlinePay?: {
    payme?: { merchantId: string; keySealed: string } | null;
    click?: { serviceId: string; merchantId: string; secretSealed: string } | null;
  };
  profile: Profile;
  /** Do'kon saqlagan mahsulotlar. */
  favorites: Types.ObjectId[];
  /**
   * Kompaniya tarifi (lib/plans). Maydon yo'q — eski hisob (Premium deb olinadi).
   * Ataylab standart qiymatsiz: eski hujjat saqlanganda "free" yozilib, kompaniya bilmasdan tushib qolmasin.
   */
  plan?: PlanCode;
  /** Hozirgi pullik tarif — ro'yxatdan o'tgandagi bepul sinov (administrator tarif yoqqanda false bo'ladi). */
  planTrial?: boolean;
  /** Taklif havolasi kodi (kompaniya uchun, birinchi ochilganda yaratiladi). */
  referralCode?: string;
  /** Shu kompaniyani taklif qilgan kompaniya. */
  referredBy?: Types.ObjectId | null;
  /** Taklif sovg'asi berilganmi (administrator tasdiqlaganda — bir marta). */
  referralRewarded?: boolean;
  /** Pullik tarif shu sanagacha amal qiladi (keyin — Bepul). null — muddatsiz. */
  subscriptionUntil: Date | null;
  demo: boolean;
  /** Administrator kompaniyani katalogdan yashirgan (masalan, demo yoki tekshiruvdagi). */
  hidden: boolean;
  /** Tasdiqlash rad etilganda administrator yozgan sabab (foydalanuvchiga ko'rinadi). */
  verificationNote: string;
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
    regionRules: {
      type: [
        new Schema<RegionRule>(
          {
            region: { type: String, enum: REGION_CODES, required: true },
            days: { type: [Number], default: [] },
            fee: { type: Number, default: null, min: 0 },
            minOrderTotal: { type: Number, default: null, min: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    paymentMethods: { type: [String], enum: PROFILE_PAYMENT_METHODS, default: ["cash"] },
    pickup: { type: Boolean, default: false },
    inn: { type: String, default: "", maxlength: 9 },
    bankName: { type: String, default: "", maxlength: 120 },
    bankAccount: { type: String, default: "", maxlength: 20 },
    mfo: { type: String, default: "", maxlength: 5 },
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
    lastActiveAt: { type: Date, default: Date.now },
    inactive: { type: Boolean, default: false },
    inactiveAt: { type: Date, default: null },
    inactivity: {
      warned12At: { type: Date, default: null },
      warned14At: { type: Date, default: null },
    },
    locale: { type: String, enum: ["uz", "ru", "en"], default: "uz" },
    onlinePay: {
      payme: { type: new Schema({ merchantId: String, keySealed: String }, { _id: false }), default: null },
      click: { type: new Schema({ serviceId: String, merchantId: String, secretSealed: String }, { _id: false }), default: null },
    },
    telegram: {
      chatId: { type: Number, default: null },
      linkCode: { type: String, default: null },
      linkExpires: { type: Date, default: null },
    },
    profile: { type: profileSchema, default: () => ({}) },
    favorites: { type: [Schema.Types.ObjectId], ref: "Product", default: [] },
    plan: { type: String, enum: PLAN_CODES },
    planTrial: { type: Boolean },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    referralRewarded: { type: Boolean },
    subscriptionUntil: { type: Date, default: null },
    demo: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    verificationNote: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true },
);

userSchema.index({ "telegram.linkCode": 1 }, { sparse: true });
// Kunlik nofaollik vazifasi faqat oxirgi faollik sanasi bo'yicha qidiradi.
userSchema.index({ lastActiveAt: 1 });

export const User: Model<UserDoc> = (mongoose.models.User as Model<UserDoc>) ?? mongoose.model<UserDoc>("User", userSchema);
