import type { RegionCode } from "./regions";

/**
 * Viloyat bo'yicha alohida yetkazish sharti. null — umumiy sozlama amal qiladi.
 * Masalan: Toshkent shahri — har kuni, bepul; Samarqand — faqat seshanba va juma, 50 000 so'm.
 */
export type RegionRule = { region: RegionCode; days: number[]; fee: number | null; minOrderTotal: number | null };

export type DeliverySchedule = { deliveryDays: number[]; deliveryFee: number; minOrderTotal: number; leadDays: number; regionRules?: RegionRule[] };

export type RegionTerms = { days: number[]; fee: number; minOrderTotal: number; leadDays: number; custom: boolean };

/** Tanlangan viloyat uchun amaldagi shartlar: viloyat qoidasi bo'lsa — o'sha, bo'lmasa umumiy. */
export function termsForRegion(s: DeliverySchedule, region: string | null | undefined): RegionTerms {
  const rule = s.regionRules?.find((r) => r.region === region);
  return {
    days: rule?.days.length ? rule.days : s.deliveryDays,
    fee: rule?.fee ?? s.deliveryFee,
    minOrderTotal: rule?.minOrderTotal ?? s.minOrderTotal,
    leadDays: s.leadDays,
    custom: Boolean(rule),
  };
}

/** "2026-11-24" → hafta kuni (1 = dushanba … 7 = yakshanba) va "24.11" — matnni Intl'siz yasash uchun. */
export function dayParts(day: string): { weekday: number; short: string } {
  const d = new Date(`${day}T00:00:00Z`);
  return { weekday: ((d.getUTCDay() + 6) % 7) + 1, short: `${day.slice(8, 10)}.${day.slice(5, 7)}` };
}

const TASHKENT_MS = 5 * 3_600_000;

/**
 * Eng yaqin yetkazish kuni (Toshkent vaqti, "YYYY-MM-DD"): bugundan `leadDays` kun keyin
 * va yetkazish kunlaridan biriga to'g'ri keladigan birinchi sana. Kunlar: 1 = dushanba … 7 = yakshanba.
 * Kunlar belgilanmagan bo'lsa — faqat `leadDays` hisobga olinadi.
 */
export function nextDeliveryDay(days: number[], leadDays: number, now: Date = new Date()): string {
  const local = new Date(now.getTime() + TASHKENT_MS);
  const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + Math.max(0, leadDays) * 86_400_000;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start + i * 86_400_000);
    const weekday = ((d.getUTCDay() + 6) % 7) + 1;
    if (!days.length || days.includes(weekday)) return d.toISOString().slice(0, 10);
  }
  return new Date(start).toISOString().slice(0, 10);
}
