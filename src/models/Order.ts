import mongoose, { Schema, type Model, type Types } from "mongoose";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, type OrderStatus, type PaymentMethod, type PaymentStatus } from "@/lib/orders";
import { REGION_CODES, type RegionCode } from "@/lib/regions";

/** Buyurtma qatori — narx va nom buyurtma paytidagi holatda saqlanadi. */
export interface OrderItem {
  product: Types.ObjectId;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface OrderEvent {
  status: OrderStatus;
  by: "buyer" | "seller" | "system";
  at: Date;
}

export interface OrderDoc {
  _id: Types.ObjectId;
  number: number;
  buyer: Types.ObjectId;
  seller: Types.ObjectId;
  items: OrderItem[];
  subtotal: number;
  discountPercent: number;
  discount: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  delivery: { phone: string; region: RegionCode; address: string; lat: number | null; lng: number | null; date: Date | null };
  comment: string;
  history: OrderEvent[];
  /** Mijoz yuborgan so'rov kaliti: bir xil kalit bilan qayta yuborilsa, yangi buyurtma yaratilmaydi. */
  requestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<OrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const eventSchema = new Schema<OrderEvent>({ status: { type: String, enum: ORDER_STATUSES }, by: String, at: Date }, { _id: false });

const schema = new Schema<OrderDoc>(
  {
    number: { type: Number, required: true, unique: true },
    buyer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [itemSchema], required: true },
    subtotal: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "new", index: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "unpaid" },
    paidAmount: { type: Number, default: 0, min: 0 },
    delivery: {
      phone: { type: String, required: true },
      region: { type: String, enum: REGION_CODES, required: true },
      address: { type: String, required: true, maxlength: 300 },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      date: { type: Date, default: null },
    },
    comment: { type: String, default: "", maxlength: 1000 },
    history: { type: [eventSchema], default: [] },
    requestId: { type: String, maxlength: 64 },
  },
  { timestamps: true },
);
schema.index({ seller: 1, createdAt: -1 });
schema.index({ buyer: 1, createdAt: -1 });
schema.index({ buyer: 1, requestId: 1 }, { unique: true, partialFilterExpression: { requestId: { $type: "string" } } });

export const Order: Model<OrderDoc> = (mongoose.models.Order as Model<OrderDoc>) ?? mongoose.model<OrderDoc>("Order", schema);
