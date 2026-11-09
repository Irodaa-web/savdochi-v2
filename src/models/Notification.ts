import mongoose, { Schema, type Model, type Types } from "mongoose";

export const NOTIFICATION_TYPES = [
  "partnerRequest",
  "partnerAccepted",
  "partnerRejected",
  "orderNew",
  "orderStatus",
  "orderPayment",
  "paymentReceived",
  "stockLow",
  "ticketReply",
  "verified",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Matn saqlanmaydi — tur va parametrlar; mijoz o'z tilida ko'rsatadi. */
export interface NotificationDoc {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: NotificationType;
  params: Record<string, string | number>;
  link: string;
  read: boolean;
  createdAt: Date;
}

const schema = new Schema<NotificationDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    params: { type: Schema.Types.Mixed, default: {} },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ user: 1, createdAt: -1 });
// 90 kundan eski bildirishnomalar o'chadi.
schema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const Notification: Model<NotificationDoc> =
  (mongoose.models.Notification as Model<NotificationDoc>) ?? mongoose.model<NotificationDoc>("Notification", schema);
