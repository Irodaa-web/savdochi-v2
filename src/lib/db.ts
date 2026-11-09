import "server-only";
import mongoose from "mongoose";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForMongoose = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = globalForMongoose.__mongoose ?? { conn: null, promise: null };
globalForMongoose.__mongoose = cache;

/** Bitta ulanishni qayta ishlatadi (serverless va dev hot-reload uchun). */
export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI sozlanmagan");
  cache.promise ??= mongoose.connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 8000 });
  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}

/**
 * Bir nechta yozuvni bitta tranzaksiyada bajaradi: hammasi saqlanadi yoki hech biri.
 * MongoDB replica set talab qiladi (Atlas'da bor). Vaqtinchalik ziddiyatda
 * `fn` qayta chaqirilishi mumkin — shuning uchun ichida faqat `session` bilan ishlang
 * va bildirishnoma kabi tashqi ishlarni tranzaksiyadan keyin bajaring.
 */
export async function withTransaction<T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
  await connectDb();
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
