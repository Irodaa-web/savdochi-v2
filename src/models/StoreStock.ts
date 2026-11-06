import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Do'kon omboridagi mahsulot qoldig'i. Buyurtma yetkazilganda avtomatik oshadi,
 * do'kon sotganini o'zi kamaytiradi. Hamkor kompaniya o'z mahsulotlari bo'yicha
 * qoldiqni ko'radi va kam qolganini biladi.
 */
export interface StoreStockDoc {
  _id: Types.ObjectId;
  buyer: Types.ObjectId;
  product: Types.ObjectId;
  seller: Types.ObjectId;
  name: string;
  unit: string;
  quantity: number;
  /** Shundan kam qolsa — "kerak" deb belgilanadi. */
  minLevel: number;
  updatedAt: Date;
}

const schema = new Schema<StoreStockDoc>(
  {
    buyer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, default: 0, min: 0 },
    minLevel: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);
schema.index({ buyer: 1, product: 1 }, { unique: true });

export const StoreStock: Model<StoreStockDoc> =
  (mongoose.models.StoreStock as Model<StoreStockDoc>) ?? mongoose.model<StoreStockDoc>("StoreStock", schema);
