import mongoose, { Schema, type Model, type Types } from "mongoose";

/** Brauzer/telefonning push obunasi (Web Push). Bitta foydalanuvchida bir nechta qurilma bo'lishi mumkin. */
export interface PushSubDoc {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<PushSubDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, unique: true, maxlength: 1000 },
    p256dh: { type: String, required: true, maxlength: 200 },
    auth: { type: String, required: true, maxlength: 100 },
  },
  { timestamps: true },
);

export const PushSub: Model<PushSubDoc> = (mongoose.models.PushSub as Model<PushSubDoc>) ?? mongoose.model<PushSubDoc>("PushSub", schema);
