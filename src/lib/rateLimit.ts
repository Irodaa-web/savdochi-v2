import "server-only";
import { RateLimit } from "@/models/RateLimit";

/**
 * Oddiy, bazaga asoslangan cheklov: `key` uchun `windowMs` ichida `limit` ta urinish.
 * true — ruxsat, false — cheklov oshdi.
 */
export async function hit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const doc = await RateLimit.findOneAndUpdate(
    { _id: key, expiresAt: { $gt: new Date(now) } },
    { $inc: { count: 1 } },
    { new: true },
  ).lean();
  if (doc) return doc.count <= limit;
  await RateLimit.updateOne(
    { _id: key },
    { $set: { count: 1, expiresAt: new Date(now + windowMs) } },
    { upsert: true },
  );
  return true;
}

export async function reset(key: string): Promise<void> {
  await RateLimit.deleteOne({ _id: key });
}
