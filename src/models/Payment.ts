import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Hamkordan olingan to'lov (yoki tuzatish — manfiy summa).
 * Qaysi buyurtmalarga taqsimlangani `allocations` da saqlanadi; akt sverka shu yozuvlardan tuziladi.
 */
export interface PaymentDoc {
  _id: Types.ObjectId;
  seller: Types.ObjectId;
  buyer: Types.ObjectId;
  amount: number;
  note: string;
  /** "ledger" — qarz daftaridan umumiy to'lov; "order" — buyurtma sahifasida to'lov holatini o'zgartirish. */
  source: "ledger" | "order";
  allocations: { order: Types.ObjectId; number: number; amount: number }[];
  createdAt: Date;
}

const schema = new Schema<PaymentDoc>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
    buyer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    note: { type: String, default: "", maxlength: 300 },
    source: { type: String, enum: ["ledger", "order"], required: true },
    allocations: { type: [{ order: { type: Schema.Types.ObjectId, ref: "Order" }, number: Number, amount: Number, _id: false }], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ seller: 1, buyer: 1, createdAt: -1 });

export const Payment: Model<PaymentDoc> = (mongoose.models.Payment as Model<PaymentDoc>) ?? mongoose.model<PaymentDoc>("Payment", schema);
