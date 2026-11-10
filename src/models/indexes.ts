import "server-only";
import mongoose from "mongoose";
// Barcha modellar ro'yxatdan o'tishi uchun (har biri o'z indekslarini e'lon qiladi).
import "./AuditLog";
import "./Cart";
import "./Chat";
import "./Counter";
import "./Notification";
import "./Order";
import "./Partnership";
import "./Payment";
import "./Product";
import "./RateLimit";
import "./StoreStock";
import "./Ticket";
import "./User";

/**
 * Production'da Mongoose `autoIndex` o'chiq: aks holda har yangi serverless instance
 * barcha modellar uchun ~20 ta createIndex buyrug'ini yuborardi (sovuq startni sekinlashtirardi).
 * O'rniga indekslar har deployda bir marta yaratiladi: birinchi instance belgi qo'yadi
 * va fonda createIndexes ishlatadi; qolganlari bitta tekshiruv bilan o'tib ketadi.
 */
export async function ensureIndexesOncePerDeploy(): Promise<void> {
  const deploy = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
  const marker = await mongoose.connection.collection<{ _id: string }>("deploymarkers").updateOne({ _id: `indexes:${deploy}` }, { $setOnInsert: { at: new Date() } }, { upsert: true });
  if (!marker.upsertedCount) return;
  for (const name of mongoose.modelNames()) {
    try {
      await mongoose.model(name).createIndexes();
    } catch (error) {
      console.error("createIndexes", name, error);
    }
  }
}
