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
}

export interface MessageDoc {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  text: string;
  /** Xabar biror buyurtma yoki mahsulot haqida bo'lsa. */
  order: Types.ObjectId | null;
  product: Types.ObjectId | null;
  createdAt: Date;
}

const conversationSchema = new Schema<ConversationDoc>({
  seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
  buyer: { type: Schema.Types.ObjectId, ref: "User", required: true },
  lastText: { type: String, default: "" },
  lastAt: { type: Date, default: () => new Date() },
  unreadBuyer: { type: Number, default: 0 },
  unreadSeller: { type: Number, default: 0 },
});
conversationSchema.index({ seller: 1, buyer: 1 }, { unique: true });
conversationSchema.index({ seller: 1, lastAt: -1 });
conversationSchema.index({ buyer: 1, lastAt: -1 });

const messageSchema = new Schema<MessageDoc>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 2000 },
    order: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    product: { type: Schema.Types.ObjectId, ref: "Product", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
messageSchema.index({ conversation: 1, createdAt: -1 });

export const Conversation: Model<ConversationDoc> =
  (mongoose.models.Conversation as Model<ConversationDoc>) ?? mongoose.model<ConversationDoc>("Conversation", conversationSchema);
export const Message: Model<MessageDoc> = (mongoose.models.Message as Model<MessageDoc>) ?? mongoose.model<MessageDoc>("Message", messageSchema);
