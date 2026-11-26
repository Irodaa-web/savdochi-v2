import mongoose, { Schema, type Model, type Types } from "mongoose";
import { PLAN_CODES, type PlanCode } from "@/lib/plans";

export const PLAN_ORDER_STATUSES = ["pending", "paid", "rejected", "cancelled"] as const;
export type PlanOrderStatus = (typeof PLAN_ORDER_STATUSES)[number];
/** Qayerdan: kompaniya so'rovi, administrator to'g'ridan-to'g'ri yoqqan, taklif (referal) sovg'asi. */
export const PLAN_ORDER_SOURCES = ["request", "admin", "referral"] as const;
export type PlanOrderSource = (typeof PLAN_ORDER_SOURCES)[number];

/**
 * Tarif buyurtmasi: kompaniya so'rovi (pending) yoki yoqilgan tarif yozuvi (paid) — to'lovlar jurnali shundan.
 * Onlayn to'lov ulanmaguncha to'lovni administrator qabul qilib, summani shu yerga yozadi.
 */
export interface PlanOrderDoc {
  _id: Types.ObjectId;
  company: Types.ObjectId;
  plan: Exclude<PlanCode, "free">;
  months: number;
  /** Tarif narxi × oylar (so'rov paytidagi narx). */
  amount: number;
  /** Haqiqatda to'langan summa (administrator yozadi; sovg'a — 0). */
  paidAmount: number;
  status: PlanOrderStatus;
  source: PlanOrderSource;
  /** Rad etish sababi yoki administrator izohi. */
  note: string;
  decidedBy: Types.ObjectId | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<PlanOrderDoc>(
  {
    company: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: String, enum: PLAN_CODES.filter((p) => p !== "free"), required: true },
    months: { type: Number, required: true, min: 1, max: 24 },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: PLAN_ORDER_STATUSES, default: "pending", index: true },
    source: { type: String, enum: PLAN_ORDER_SOURCES, default: "request" },
    note: { type: String, default: "", maxlength: 500 },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
schema.index({ status: 1, decidedAt: -1 });

export const PlanOrder: Model<PlanOrderDoc> = (mongoose.models.PlanOrder as Model<PlanOrderDoc>) ?? mongoose.model<PlanOrderDoc>("PlanOrder", schema);
