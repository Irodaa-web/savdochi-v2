import { redirect } from "next/navigation";

/**
 * "Yetkazib beruvchilar" bo'limi olib tashlandi — kompaniyalar endi Katalogda (Kompaniyalar ko'rinishi).
 * Eski havolalar ishlashi uchun qidiruv va viloyat saqlangan holda katalogga yo'naltiriladi.
 * Kompaniya sahifasi (/suppliers/[id]) o'z joyida qoladi.
 */
export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ region?: string; q?: string }> }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (sp.region) params.set("region", sp.region);
  const s = params.toString();
  redirect(s ? `/catalog?${s}` : "/catalog");
}
