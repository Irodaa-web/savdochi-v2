import mongoose, { Schema, model, models, type Model } from "mongoose";

const globalForMongo = globalThis as unknown as { mongoConn?: Promise<typeof mongoose> };

export function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI sozlanmagan");
  globalForMongo.mongoConn ??= mongoose.connect(uri);
  return globalForMongo.mongoConn;
}

export interface MessageLog {
  senderName: string;
  fromEmail: string; // login qilingan foydalanuvchining emaili (Google'dan)
  to: string;
  message: string;
  status: "sent" | "failed";
  error?: string;
  sentAt: Date;
}

const messageLogSchema = new Schema<MessageLog>({
  senderName: { type: String, required: true },
  fromEmail: { type: String, required: true, index: true },
  to: { type: String, required: true, index: true },
  message: { type: String, required: true },
  status: { type: String, enum: ["sent", "failed"], required: true },
  error: String,
  sentAt: { type: Date, default: Date.now },
});

export const MessageLogModel: Model<MessageLog> =
  (models.MessageLog as Model<MessageLog>) ?? model<MessageLog>("MessageLog", messageLogSchema);
