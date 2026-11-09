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
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SERVER_ERROR"
  | "OUT_OF_STOCK"
  | "BELOW_MIN_ORDER"
  | "CART_EMPTY"
  | "INVALID_STATE"
  | "SUBSCRIPTION_EXPIRED"
  | "NOT_PARTNER"
  | "UPLOAD_DISABLED"
  | "DEMO_DISABLED"
  | "CREDIT_LIMIT";

const STATUS: Record<ApiErrorCode, number> = {
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_INPUT: 400,
  PHONE_TAKEN: 409,
  INVALID_CREDENTIALS: 401,
  TOO_MANY_ATTEMPTS: 429,
  UNAUTHORIZED: 401,
  SERVER_ERROR: 500,
  OUT_OF_STOCK: 409,
  BELOW_MIN_ORDER: 400,
  CART_EMPTY: 400,
  INVALID_STATE: 409,
  SUBSCRIPTION_EXPIRED: 402,
  NOT_PARTNER: 403,
  UPLOAD_DISABLED: 503,
  DEMO_DISABLED: 404,
  CREDIT_LIMIT: 409,
};

/** Biznes qoidasi buzilganda server funksiyalari tashlaydigan xato. */
export class AppError extends Error {
  constructor(
    public code: ApiErrorCode,
    public fields?: Record<string, string>,
  ) {
    super(code);
  }
}

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
