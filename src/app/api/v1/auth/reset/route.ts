import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth/token";
import { connectDb } from "@/lib/db";
import { User } from "@/models/User";

/**
 * Yaroqsiz sessiyani tozalab, kirish sahifasiga qaytaradi.
 * (Token imzosi to'g'ri, lekin hisob bloklangan, nofaol yoki paroli o'zgargan holat —
 * aks holda middleware va layout bir-biriga qayta yo'naltirib qolardi.)
 * Hisob nofaollik tufayli to'xtatilgan bo'lsa, kirish sahifasida shu haqda xabar chiqadi.
 */
export async function GET(request: NextRequest) {
  const url = new URL("/login", request.url);
  try {
    const payload = await verifyToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (payload) {
      await connectDb();
      const user = await User.findById(payload.sub, { inactive: 1, blocked: 1 }).lean();
      if (user?.inactive && !user.blocked) url.searchParams.set("reason", "inactive");
    }
  } catch (error) {
    console.error("session reset check failed", error);
  }
  const response = NextResponse.redirect(url);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
