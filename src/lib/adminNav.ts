/**
 * Administrator rejimi: admin savdo qilmaydi — unga faqat boshqaruv bo'limlari ochiq.
 * Kompaniya/mahsulot sahifalari faqat ko'rish (tekshirish) uchun ochiq, xarid tugmalari yashiriladi.
 */
const ADMIN_PAGES = ["/admin", "/settings", "/catalog/", "/suppliers/"];

export function adminPageAllowed(path: string): boolean {
  return ADMIN_PAGES.some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p || path.startsWith(`${p}/`)));
}
