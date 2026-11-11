import mongoose, { Schema, type Model, type Types } from "mongoose";

export type PartnershipStatus = "pending" | "active" | "rejected";

/** Kompaniya va do'kon o'rtasidagi hamkorlik. Bir juftlik uchun bitta yozuv. */
export interface PartnershipDoc {
  _id: Types.ObjectId;
  seller: Types.ObjectId;
  buyer: Types.ObjectId;
  status: PartnershipStatus;
  /** So'rovni kim yuborgan. */
  requestedBy: "buyer" | "seller";
  /** Hamkorga doimiy chegirma, %. */
  discount: number;
  terms: string;
  /** Do'kon o'z ombor qoldig'ini shu kompaniyaga ko'rsatadimi. */
  shareStock: boolean;
  /** Nasiya limiti, so'm: hamkorning to'lanmagan qarzi shundan oshmasligi kerak. 0 — nasiya berilmaydi. */
  creditLimit: number;
  /** Nasiya buyurtmasini to'lash muddati, kun. */
  paymentDays: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<PartnershipDoc>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    buyer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["pending", "active", "rejected"], default: "pending" },
    requestedBy: { type: String, enum: ["buyer", "seller"], required: true },
    discount: { type: Number, default: 0, min: 0, max: 50 },
    terms: { type: String, default: "", maxlength: 1000 },
    shareStock: { type: Boolean, default: true },
    creditLimit: { type: Number, default: 0, min: 0 },
    paymentDays: { type: Number, default: 14, min: 1, max: 180 },
  },
  { timestamps: true },
);
schema.index({ seller: 1, buyer: 1 }, { unique: true });

export const Partnership: Model<PartnershipDoc> =
  (mongoose.models.Partnership as Model<PartnershipDoc>) ?? mongoose.model<PartnershipDoc>("Partnership", schema);
