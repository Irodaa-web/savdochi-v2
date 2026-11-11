import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runDebtReminders } from "@/server/reminders";

export const dynamic = "force-dynamic";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Kunlik qarz eslatmalari. Vercel Cron (vercel.json) har kuni chaqiradi va
 * `Authorization: Bearer <CRON_SECRET>` yuboradi — CRON_SECRET sozlanmagan bo'lsa ishlamaydi.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !same(header, `Bearer ${secret}`)) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, data: await runDebtReminders() });
}
