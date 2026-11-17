import mongoose, { Schema, type Model } from "mongoose";

export const SMS_PURPOSES = ["register", "reset"] as const;
export type SmsPurpose = (typeof SMS_PURPOSES)[number];

/** Bir martalik SMS kod. Kodning o'zi saqlanmaydi — faqat xeshi. Muddati o'tgach o'zi o'chadi (TTL). */
export interface SmsCodeDoc {
  _id: string; // `${purpose}:${phone}` — har telefon va maqsad uchun bitta faol kod
  codeHash: string;
  attempts: number;
  expiresAt: Date;
}

const schema = new Schema<SmsCodeDoc>({
  _id: String,
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SmsCode: Model<SmsCodeDoc> = (mongoose.models.SmsCode as Model<SmsCodeDoc>) ?? mongoose.model<SmsCodeDoc>("SmsCode", schema);
