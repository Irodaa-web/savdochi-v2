/**
 * Diagrammalar uchun sof yordamchilar. Intl ishlatilmaydi — server va brauzerda natija bir xil
 * (hydration mos keladi). Sana matnlari serverda tayyorlanadi (formatDay).
 */

export type Scale = { top: number; step: number; ticks: number[] };

/**
 * Y o'qi uchun toza shkala: 0 dan boshlanadi, qadam 1 / 2 / 2,5 / 5 × 10ⁿ (butun son).
 * Eng kichik mos qadam tanlanadi — ko'pi bilan `maxIntervals` ta oraliq, ustunlar balandlikdan to'liq foydalanadi.
 */
export function niceScale(max: number, maxIntervals = 5): Scale {
  if (!(max > 0)) return { top: 1, step: 1, ticks: [0, 1] };
  const raw = max / maxIntervals;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const factors = mag >= 10 ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10];
  const step = Math.max(1, (factors.find((f) => f * mag >= raw) ?? 10) * mag);
  const count = Math.max(1, Math.ceil(max / step - 1e-9));
  return { top: count * step, step, ticks: Array.from({ length: count + 1 }, (_, i) => i * step) };
}

/** Ixcham yozuv shablonlari: "{n} ming", "{n} mln", "{n} mlrd" (lug'atdan). */
export type CompactUnits = { thousand: string; million: string; billion: string };

const DIVISORS = [
  [1e9, "billion"],
  [1e6, "million"],
  [1e3, "thousand"],
] as const;

/**
 * Ixcham summa: 4 300 000 → "4,3 mln". 10 000 dan kichik bo'lsa — to'liq ("2 500").
 * `base` — birlik shu qiymat bo'yicha tanlanadi: o'qdagi barcha yozuvlar bitta uslubda bo'lishi uchun
 * eng katta belgi beriladi (0 / 0,5 mln / 1 mln).
 */
export function compactAmount(value: number, locale: string, units: CompactUnits, base = value, digits = 1): string {
  if (value === 0) return "0";
  const scale = Math.abs(base);
  if (scale < 10_000) return groupDigits(Math.round(value));
  const [divisor, key] = DIVISORS.find(([d]) => scale >= d) ?? DIVISORS[2];
  const n = String(Number((value / divisor).toFixed(digits)));
  return units[key].replace("{n}", locale === "en" ? n : n.replace(".", ","));
}

function groupDigits(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * X o'qidagi sana yorliqlari: oxirgi kundan (bugun) orqaga teng qadam bilan, bir-biriga tegmasligi uchun.
 * `narrow: false` — tor ekranda yashiriladi (u yerda yorliqlar ikki baravar siyrak).
 */
export function dayTicks(n: number): { index: number; narrow: boolean }[] {
  if (n <= 0) return [];
  const step = n <= 10 ? 1 : n <= 40 ? 5 : n <= 100 ? 15 : Math.ceil(n / 7);
  const out: { index: number; narrow: boolean }[] = [];
  for (let k = 0, j = 0; k <= n - 1; k += step, j++) out.push({ index: n - 1 - k, narrow: j % 2 === 0 });
  return out.reverse();
}

const DAY_MS = 86_400_000;
/** Toshkent vaqti: UTC+5, yozgi vaqt yo'q. */
const TASHKENT_OFFSET_MS = 5 * 3_600_000;

/**
 * Hisobot davri boshi — to'liq kalendar kunlar: bugun va undan oldingi (days − 1) kun,
 * Toshkent yarim tunidan boshlab. "7 kun" — aynan 7 ta ustun, oxirgisi bugun.
 */
export function periodStart(now: number, days: number): Date {
  const today = Math.floor((now + TASHKENT_OFFSET_MS) / DAY_MS) * DAY_MS - TASHKENT_OFFSET_MS;
  return new Date(today - (days - 1) * DAY_MS);
}

/** Davrdagi har bir kun (savdo bo'lmagan kunlar — 0). `rows._id` — Toshkent sanasi (YYYY-MM-DD). */
export function fillDays(since: Date, days: number, rows: { _id: string; value: number; orders: number }[]): { day: string; value: number; orders: number }[] {
  const by = new Map(rows.map((r) => [r._id, r]));
  return Array.from({ length: days }, (_, i) => {
    // since — Toshkent yarim tuni; +5 soat → o'sha sananing UTC yarim tuni.
    const day = new Date(since.getTime() + i * DAY_MS + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
    const row = by.get(day);
    return { day, value: row?.value ?? 0, orders: row?.orders ?? 0 };
  });
}

export type LabeledDay = { day: string; value: number; orders: number; label: string; full: string };

/**
 * Kunlarni haftalarga jamlash (tor ekranda 90 kun: ustunlar 1–2 px bo'lib qolmasligi uchun).
 * Bugundan orqaga 7 kunlik bo'laklar; yorliq — haftaning oxirgi kuni (o'ng chekka — bugun),
 * to'liq matn — oraliq ("12-noy – 18-noy").
 */
export function toWeeks(days: LabeledDay[]): LabeledDay[] {
  const out: LabeledDay[] = [];
  for (let end = days.length; end > 0; end -= 7) {
    const chunk = days.slice(Math.max(0, end - 7), end);
    const first = chunk[0]!;
    const last = chunk[chunk.length - 1]!;
    out.push({
      day: first.day,
      value: chunk.reduce((s, x) => s + x.value, 0),
      orders: chunk.reduce((s, x) => s + x.orders, 0),
      label: last.label,
      full: chunk.length === 1 ? last.label : `${first.label} – ${last.label}`,
    });
  }
  return out.reverse();
}

/** Eng yuqori savdo kuni (teng bo'lsa — eng so'nggisi); savdo bo'lmasa -1. */
export function peakIndex(values: number[]): number {
  let peak = -1;
  values.forEach((v, i) => {
    if (v > 0 && (peak < 0 || v >= values[peak]!)) peak = i;
  });
  return peak;
}
