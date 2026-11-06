import mongoose, { Schema, type Model, type Types } from "mongoose";
import { CATEGORY_CODES, UNIT_CODES, type CategoryCode, type PriceTier, type UnitCode } from "@/lib/catalog";

export interface ProductDoc {
  _id: Types.ObjectId;
  seller: Types.ObjectId;
  name: string;
  category: CategoryCode;
  unit: UnitCode;
  /** Bir birlik narxi, so'mda (butun son). */
  price: number;
  /** Miqdor oshganda arzonroq narx: [{ min: 50, price: 9000 }]. */
  priceTiers: PriceTier[];
  minOrder: number;
  stock: number;
  /** Bir birlikdagi dona soni (masalan, blokda 6 ta shisha). */
  packSize: number;
  description: string;
  /** Arxivlangan mahsulot katalogda ko'rinmaydi, lekin eski buyurtmalarda qoladi. */
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductDoc>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, enum: CATEGORY_CODES, required: true, index: true },
    unit: { type: String, enum: UNIT_CODES, required: true },
    price: { type: Number, required: true, min: 1 },
    priceTiers: { type: [{ _id: false, min: { type: Number, min: 2 }, price: { type: Number, min: 1 } }], default: [] },
    minOrder: { type: Number, default: 1, min: 1 },
    stock: { type: Number, default: 0, min: 0 },
    packSize: { type: Number, default: 1, min: 1 },
    description: { type: String, default: "", maxlength: 2000 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", description: "text" });
productSchema.index({ active: 1, category: 1, createdAt: -1 });

export const Product: Model<ProductDoc> =
  (mongoose.models.Product as Model<ProductDoc>) ?? mongoose.model<ProductDoc>("Product", productSchema);
