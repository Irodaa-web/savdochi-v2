import mongoose, { Schema, type Model, type Types } from "mongoose";

/** Kompaniya va do'kon o'rtasidagi bitta suhbat. */
export interface ConversationDoc {
  _id: Types.ObjectId;
  seller: Types.ObjectId;
  buyer: Types.ObjectId;
  lastText: string;
  lastAt: Date;
  unreadBuyer: number;
  unreadSeller: number;
  /** Har tomon suhbatni oxirgi marta qachon o'qigan (✓✓ belgisi uchun). */
  readAtBuyer: Date | null;
  readAtSeller: Date | null;
  /** "Yozmoqda…" — tomonning oxirgi yozish vaqti (bir necha soniya amal qiladi). */
  typingBuyerAt: Date | null;
  typingSellerAt: Date | null;
  /** Tomon o'zi uchun tarixni tozalagan vaqt — undan oldingi xabarlar unga ko'rinmaydi. */
  clearedBuyerAt: Date | null;
  clearedSellerAt: Date | null;
}

export interface MessageDoc {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  text: string;
  /** Biriktirilgan rasm (Vercel Blob manzili; "" — yo'q). */
  image: string;
  /** Xabar biror buyurtma yoki mahsulot haqida bo'lsa (chatda karta bo'lib chiqadi). */
  order: Types.ObjectId | null;
  product: Types.ObjectId | null;
  /** Yuboruvchi o'chirgan (hamma uchun) — matn va biriktirmalar tozalanadi. */
  deletedAt: Date | null;
  createdAt: Date;
  /** O'chirilganda yangilanadi — so'rov orqali yangilashda o'zgarishlar ham keladi. */
  updatedAt?: Date;
}

const conversationSchema = new Schema<ConversationDoc>({
  seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
  buyer: { type: Schema.Types.ObjectId, ref: "User", required: true },
  lastText: { type: String, default: "" },
  lastAt: { type: Date, default: () => new Date() },
  unreadBuyer: { type: Number, default: 0 },
  unreadSeller: { type: Number, default: 0 },
  readAtBuyer: { type: Date, default: null },
  readAtSeller: { type: Date, default: null },
  typingBuyerAt: { type: Date, default: null },
  typingSellerAt: { type: Date, default: null },
  clearedBuyerAt: { type: Date, default: null },
  clearedSellerAt: { type: Date, default: null },
});
conversationSchema.index({ seller: 1, buyer: 1 }, { unique: true });
conversationSchema.index({ seller: 1, lastAt: -1 });
conversationSchema.index({ buyer: 1, lastAt: -1 });

const messageSchema = new Schema<MessageDoc>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "", maxlength: 2000 },
    image: { type: String, default: "", maxlength: 500 },
    order: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    product: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, updatedAt: -1 });

export const Conversation: Model<ConversationDoc> =
  (mongoose.models.Conversation as Model<ConversationDoc>) ?? mongoose.model<ConversationDoc>("Conversation", conversationSchema);
export const Message: Model<MessageDoc> = (mongoose.models.Message as Model<MessageDoc>) ?? mongoose.model<MessageDoc>("Message", messageSchema);
