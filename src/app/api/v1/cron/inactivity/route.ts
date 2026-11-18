import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runInactivity } from "@/server/inactivity";

export const dynamic = "force-dynamic";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Nofaollik vazifasini qo'lda ishga tushirish (kunlik ishga tushirish — /api/v1/cron/reminders ichida).
 * `Authorization: Bearer <CRON_SECRET>` kerak.
 *
 * Test: 15 kun kutmasdan sinash uchun `?asOf=2026-12-31T12:00:00Z` — vazifa shu vaqtda
 * ishlagandek bajariladi. Faqat INACTIVITY_TEST=1 bo'lgan muhitda (production'da yoqmang).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !same(header, `Bearer ${secret}`)) return NextResponse.json({ ok: false }, { status: 401 });

  const asOf = new URL(request.url).searchParams.get("asOf");
  let now = new Date();
  if (asOf) {
    if (process.env.INACTIVITY_TEST !== "1") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    now = new Date(asOf);
    if (Number.isNaN(now.getTime())) return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, data: await runInactivity(now) });
}
