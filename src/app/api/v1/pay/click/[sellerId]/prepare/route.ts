import { NextResponse } from "next/server";
import { handleClick } from "@/server/onlinePay";

export const dynamic = "force-dynamic";

/** Click SHOP API: prepare (action=0). Click so'rovni application/x-www-form-urlencoded ko'rinishida yuboradi. */
export async function POST(request: Request, { params }: { params: Promise<{ sellerId: string }> }) {
  const fields: Record<string, string> = {};
  try {
    const form = await request.formData();
    form.forEach((v, k) => (fields[k] = String(v)));
  } catch {
    // bo'sh yoki noto'g'ri tana — handleClick -8 qaytaradi
  }
  return NextResponse.json(await handleClick((await params).sellerId, "0", fields));
}
