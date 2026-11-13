import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth/token";

/**
 * Ilova kabi: kirmagan foydalanuvchi faqat landing (/welcome), kirish va ro'yxatdan o'tish sahifalarini ko'radi.
 * Bu yerda faqat token imzosi tekshiriladi; bloklangan hisob va hokazo
 * sahifa ichida getSessionUser() orqali tekshiriladi.
 */
const AUTH_PAGES = ["/login", "/register"];
/** Kirmaganlar uchun ochiq sahifa (landing). */
const PUBLIC_PAGES = ["/welcome"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifyToken(request.cookies.get(SESSION_COOKIE)?.value);
  const isAuthPage = AUTH_PAGES.includes(pathname) || PUBLIC_PAGES.includes(pathname);

  if (!session && pathname === "/") return NextResponse.rewrite(new URL("/welcome", request.url));
  if (!session && !isAuthPage) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // API, Next ichki fayllari va statik fayllardan tashqari hamma sahifalar.
  matcher: ["/((?!api/|_next/|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
