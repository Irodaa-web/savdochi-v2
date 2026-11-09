import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Holat tekshiruvi: server qaysi regionda va bazagacha borib-kelish (ping) necha ms.
 * Sekinlikni aniqlash uchun: dbPingMs katta (50+) bo'lsa — Vercel regioni Atlas'dan uzoq.
 */
export async function GET() {
  const started = Date.now();
  try {
    await connectDb();
    const connectMs = Date.now() - started;
    const pings: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t = Date.now();
      await mongoose.connection.db!.admin().ping();
      pings.push(Date.now() - t);
    }
    return NextResponse.json({ ok: true, region: process.env.VERCEL_REGION ?? null, connectMs, dbPingMs: Math.min(...pings) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, region: process.env.VERCEL_REGION ?? null }, { status: 503 });
  }
}
