import "server-only";
import mongoose from "mongoose";
// Barcha modellar ro'yxatdan o'tishi uchun (har biri o'z indekslarini e'lon qiladi).
import "./AuditLog";
import "./Cart";
import "./Chat";
import "./Counter";
import "./Notification";
import "./OnlinePayment";
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
 *
 * Muhim: unique indekslar (takroriy buyurtma, to'lov tranzaksiyasi) to'g'rilik uchun kerak —
 * shuning uchun instance indekslar borligiga ishonch hosil qilmaguncha so'rov qabul qilmaydi:
 * - belgi (deploymarkers) faqat indekslar MUVAFFAQIYATLI yaratilgandan KEYIN qo'yiladi;
 * - belgi bo'lsa — bitta tez tekshiruv; bo'lmasa — instance indekslarni o'zi yaratadi (parallel).
 * Oldingi versiyada belgi oldin qo'yilib, indekslar fonda qurilardi — yangi bazada birinchi
 * parallel buyurtmalar unique indekssiz o'tib ketishi mumkin edi (CI integratsiya testi ushladi).
 */
export async function ensureIndexesOncePerDeploy(): Promise<void> {
  const deploy = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
  const markers = mongoose.connection.collection<{ _id: string; at: Date }>("deploymarkers");
  const id = `indexes:${deploy}`;
  if (await markers.findOne({ _id: id }, { projection: { _id: 1 } })) return;
  const results = await Promise.allSettled(mongoose.modelNames().map((name) => mongoose.model(name).createIndexes()));
  const failed = results.flatMap((r, i) => (r.status === "rejected" ? [`${mongoose.modelNames()[i]}: ${String(r.reason)}`] : []));
  if (failed.length) {
    // Belgi qo'yilmaydi — keyingi sovuq startda qayta uriniladi.
    console.error("createIndexes failed", failed);
    return;
  }
  await markers.updateOne({ _id: id }, { $setOnInsert: { at: new Date() } }, { upsert: true });
}
