import mongoose, { Schema, model, models, type Model } from "mongoose";

const globalForMongo = globalThis as unknown as { mongoConn?: Promise<typeof mongoose> };

export function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI sozlanmagan");
  globalForMongo.mongoConn ??= mongoose.connect(uri);
  return globalForMongo.mongoConn;
}

export interface MessageLog {
  senderName: string; // yuboruvchi o'zi yozgan ism
  from: string; // xat qaysi pochtadan ketgani (SMTP_USER)
  to: string;
  message: string;
  ip: string; // yuboruvchining IP manzili
  userAgent: string; // yuboruvchining brauzeri/qurilmasi
  status: "sent" | "failed";
  error?: string;
  sentAt: Date;
}

const messageLogSchema = new Schema<MessageLog>({
  senderName: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true, index: true },
  message: { type: String, required: true },
  ip: { type: String, index: true },
  userAgent: String,
  status: { type: String, enum: ["sent", "failed"], required: true },
  error: String,
  sentAt: { type: Date, default: Date.now },
});

export const MessageLogModel: Model<MessageLog> =
  (models.MessageLog as Model<MessageLog>) ?? model<MessageLog>("MessageLog", messageLogSchema);
