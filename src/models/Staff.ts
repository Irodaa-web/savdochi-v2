import mongoose, { Schema, type Model, type Types } from "mongoose";
import { STAFF_ROLES, type StaffRole } from "@/lib/staff";

/**
 * Kompaniya xodimi: o'z telefoni va paroli bilan kiradi, kompaniya nomidan ishlaydi.
 * Huquqlari roliga qarab (lib/staff). Telefon foydalanuvchilar (User) bilan ham takrorlanmaydi.
 */
export interface StaffDoc {
  _id: Types.ObjectId;
  company: Types.ObjectId;
  name: string;
  phone: string;
  passwordHash: string;
  role: StaffRole;
  blocked: boolean;
  /** Parol, rol o'zgarsa yoki bloklansa oshiriladi — eski sessiyalar bekor bo'ladi. */
  authVersion: number;
  lastActiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<StaffDoc>(
  {
    company: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: STAFF_ROLES, required: true },
    blocked: { type: Boolean, default: false },
    authVersion: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Staff: Model<StaffDoc> = (mongoose.models.Staff as Model<StaffDoc>) ?? mongoose.model<StaffDoc>("Staff", schema);
