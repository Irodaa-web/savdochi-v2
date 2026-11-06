import "server-only";
import { NextResponse } from "next/server";

/**
 * Barcha API javoblari bir xil shaklda:
 *   muvaffaqiyat: { ok: true, data }
 *   xato:        { ok: false, error: "KOD", fields?: { maydon: "kalit" } }
 * Xato kodlari tarjimada (errors.*) — veb va mobil ilova o'zi tarjima qiladi.
 */
export type ApiErrorCode =
  | "INVALID_INPUT"
  | "PHONE_TAKEN"
  | "INVALID_CREDENTIALS"
  | "TOO_MANY_ATTEMPTS"
  | "UNAUTHORIZED"
  | "SERVER_ERROR";

const STATUS: Record<ApiErrorCode, number> = {
  INVALID_INPUT: 400,
  PHONE_TAKEN: 409,
  INVALID_CREDENTIALS: 401,
  TOO_MANY_ATTEMPTS: 429,
  UNAUTHORIZED: 401,
  SERVER_ERROR: 500,
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: ApiErrorCode, fields?: Record<string, string>) {
  return NextResponse.json({ ok: false, error, ...(fields ? { fields } : {}) }, { status: STATUS[error] });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
