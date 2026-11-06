import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface CartItem {
  product: Types.ObjectId;
  quantity: number;
}

/** Har bir do'konning bitta savati (serverda — telefon va kompyuterda bir xil). */
export interface CartDoc {
  _id: Types.ObjectId;
  buyer: Types.ObjectId;
  items: CartItem[];
  updatedAt: Date;
}

const itemSchema = new Schema<CartItem>(
  { product: { type: Schema.Types.ObjectId, ref: "Product", required: true }, quantity: { type: Number, required: true, min: 1 } },
  { _id: false },
);

const schema = new Schema<CartDoc>({ buyer: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true }, items: { type: [itemSchema], default: [] } }, { timestamps: true });

export const Cart: Model<CartDoc> = (mongoose.models.Cart as Model<CartDoc>) ?? mongoose.model<CartDoc>("Cart", schema);
