import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Do'konning doimiy buyurtma ro'yxati (shablon): har hafta beriladigan mahsulotlar va miqdorlari.
 * Bir bosishda savatga solinadi. Bir nechta yetkazib beruvchining mahsulotlari bo'lishi mumkin.
 */
export interface OrderListItem {
  product: Types.ObjectId;
  name: string;
  unit: string;
  quantity: number;
}

export interface OrderListDoc {
  _id: Types.ObjectId;
  buyer: Types.ObjectId;
  name: string;
  items: OrderListItem[];
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<OrderListItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const schema = new Schema<OrderListDoc>(
  {
    buyer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    items: { type: [itemSchema], default: [] },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const OrderList: Model<OrderListDoc> = (mongoose.models.OrderList as Model<OrderListDoc>) ?? mongoose.model<OrderListDoc>("OrderList", schema);
