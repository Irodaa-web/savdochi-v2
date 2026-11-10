import mongoose, { Schema, type Model, type Types } from "mongoose";

export const ONLINE_PROVIDERS = ["payme", "click"] as const;
export type OnlineProvider = (typeof ONLINE_PROVIDERS)[number];

/**
 * Onlayn to'lov (hisob): do'kon "Payme/Click orqali to'lash"ni bosganda yaratiladi.
 * created → pending (tizim tranzaksiyani ochdi) → paid | cancelled.
 */
export interface OnlinePaymentDoc {
  _id: Types.ObjectId;
  provider: OnlineProvider;
  seller: Types.ObjectId;
  buyer: Types.ObjectId;
  order: Types.ObjectId;
  orderNumber: number;
  /** So'm (butun son). Payme'ga tiyin = amount × 100. */
  amount: number;
  state: "created" | "pending" | "paid" | "cancelled";
  /** Payme transaction id yoki Click click_trans_id. */
  providerId: string | null;
  /** Payme: tranzaksiya yaratilgan vaqt (ms) — GetStatement uchun. */
  providerTime: number | null;
  /** Click: merchant_prepare_id. */
  prepareId: number | null;
  /** Payme holati: to'langandan keyin bekor qilinganmi (-2) yoki oldin (-1). */
  cancelledAfterPaid: boolean;
  reason: number | null;
  pendingAt: Date | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
}

const schema = new Schema<OnlinePaymentDoc>(
  {
    provider: { type: String, enum: ONLINE_PROVIDERS, required: true },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
    buyer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    orderNumber: { type: Number, required: true },
    amount: { type: Number, required: true, min: 1 },
    state: { type: String, enum: ["created", "pending", "paid", "cancelled"], default: "created" },
    providerId: { type: String, default: null },
    providerTime: { type: Number, default: null },
    prepareId: { type: Number, default: null },
    cancelledAfterPaid: { type: Boolean, default: false },
    reason: { type: Number, default: null },
    pendingAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ provider: 1, providerId: 1 }, { unique: true, partialFilterExpression: { providerId: { $type: "string" } } });
schema.index({ seller: 1, provider: 1, providerTime: 1 });

export const OnlinePayment: Model<OnlinePaymentDoc> =
  (mongoose.models.OnlinePayment as Model<OnlinePaymentDoc>) ?? mongoose.model<OnlinePaymentDoc>("OnlinePayment", schema);
