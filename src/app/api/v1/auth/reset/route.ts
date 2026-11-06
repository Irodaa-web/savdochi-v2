import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/token";

/**
 * Yaroqsiz sessiyani tozalab, kirish sahifasiga qaytaradi.
 * (Token imzosi to'g'ri, lekin hisob bloklangan yoki paroli o'zgargan holat —
 * aks holda middleware va layout bir-biriga qayta yo'naltirib qolardi.)
 */
export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
