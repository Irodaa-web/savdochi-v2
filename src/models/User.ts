import mongoose, { Schema, type Model, type Types } from "mongoose";
import { REGION_CODES, type RegionCode } from "@/lib/regions";

export type Verification = "unverified" | "pending" | "verified" | "rejected";

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
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  { timestamps: true },
);

export const User: Model<UserDoc> = (mongoose.models.User as Model<UserDoc>) ?? mongoose.model<UserDoc>("User", userSchema);
