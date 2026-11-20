import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Do'konning kompaniyaga bahosi — yetkazilgan buyurtma bo'yicha, bitta buyurtmaga bitta.
 * Kompaniya javob yozishi mumkin.
 */
export interface ReviewDoc {
  _id: Types.ObjectId;
  seller: Types.ObjectId;
  buyer: Types.ObjectId;
  order: Types.ObjectId;
  orderNumber: number;
  rating: number;
  text: string;
  reply: string;
  repliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ReviewDoc>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    buyer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    orderNumber: { type: Number, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, default: "", maxlength: 1000 },
    reply: { type: String, default: "", maxlength: 1000 },
    repliedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
schema.index({ seller: 1, createdAt: -1 });

export const Review: Model<ReviewDoc> = (mongoose.models.Review as Model<ReviewDoc>) ?? mongoose.model<ReviewDoc>("Review", schema);
