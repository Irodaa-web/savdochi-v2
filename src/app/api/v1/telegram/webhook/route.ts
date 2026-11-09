import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { handleUpdate, telegramConfig } from "@/server/telegram";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Telegram webhook. Telegram setWebhook'dagi secret_token ni sarlavhada yuboradi —
 * u TELEGRAM_WEBHOOK_SECRET ga mos kelmasa so'rov rad etiladi.
 */
export async function POST(request: Request) {
  const cfg = telegramConfig();
  const header = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!cfg.enabled || !cfg.secret || !same(header, cfg.secret)) return NextResponse.json({ ok: false }, { status: 403 });
  try {
    await handleUpdate(await request.json());
  } catch (error) {
    console.error("telegram webhook", error);
  }
  // Telegram qayta yubormasligi uchun har doim 200.
  return NextResponse.json({ ok: true });
}
