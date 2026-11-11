import { NextResponse } from "next/server";
import { handlePayme } from "@/server/onlinePay";

export const dynamic = "force-dynamic";

/**
 * Payme Merchant API endpointi. Har kompaniyaning o'z manzili:
 * /api/v1/pay/payme/<kompaniya ID> — Payme biznes kabinetida shu manzil ko'rsatiladi.
 * Javob har doim HTTP 200 (JSON-RPC xatolari tanada).
 */
export async function POST(request: Request, { params }: { params: Promise<{ sellerId: string }> }) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  return NextResponse.json(await handlePayme((await params).sellerId, request.headers.get("authorization"), body));
}
