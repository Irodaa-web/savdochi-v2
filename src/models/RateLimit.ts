import mongoose, { Schema, type Model } from "mongoose";

type RateLimitDoc = { _id: string; count: number; expiresAt: Date };

const rateLimitSchema = new Schema<RateLimitDoc>({
  _id: { type: String },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit: Model<RateLimitDoc> =
  (mongoose.models.RateLimit as Model<RateLimitDoc>) ?? mongoose.model<RateLimitDoc>("RateLimit", rateLimitSchema);
