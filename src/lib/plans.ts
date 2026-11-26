/**
 * Kompaniya tariflari. Narx, chegara va imkoniyatlar faqat shu yerda —
 * server tekshiruvi ham, sahifalar ham shu ro'yxatdan foydalanadi.
 * Do'konlar uchun platforma bepul (tariflar faqat kompaniyalarga).
 */
export const PLAN_CODES = ["free", "standard", "premium"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const PLAN_FEATURES = ["analytics", "telegram", "excel", "sale", "boost"] as const;
export type PlanFeature = (typeof PLAN_FEATURES)[number];

export type PlanSpec = {
  /** Oylik narx, so'm. */
  price: number;
  /** Faol mahsulotlar soni chegarasi (null — cheksiz). */
  products: number | null;
  /** Xodimlar soni chegarasi (null — cheksiz). */
  staff: number | null;
  features: readonly PlanFeature[];
};

export const PLANS: Record<PlanCode, PlanSpec> = {
  free: { price: 0, products: 10, staff: 0, features: [] },
  standard: { price: 99_000, products: 100, staff: 2, features: ["analytics", "telegram"] },
  premium: { price: 249_000, products: null, staff: null, features: ["analytics", "telegram", "excel", "sale", "boost"] },
};

/** Yangi kompaniyaga bepul Premium sinov muddati. */
export const TRIAL_DAYS = 14;
/** Tugashiga shuncha kun qolganda kompaniyaga eslatiladi. */
export const PLAN_WARN_DAYS = 3;

export type PlanState = { plan?: string | null; subscriptionUntil?: Date | string | null; role?: string };

/**
 * Amaldagi tarif. Pullik tarif muddati tugasa — Bepul.
 * `plan` maydoni yo'q eski kompaniya hisoblari: avvalgi obuna (to'liq imkoniyat) — Premium deb olinadi;
 * obunasi tugagan bo'lsa — Bepul. subscriptionUntil null — muddatsiz.
 */
export function effectivePlan(u: PlanState): PlanCode {
  const raw = (PLAN_CODES as readonly string[]).includes(u.plan ?? "") ? (u.plan as PlanCode) : u.role === "seller" || u.role === undefined ? "premium" : "free";
  if (raw === "free") return "free";
  if (u.subscriptionUntil && new Date(u.subscriptionUntil).getTime() <= Date.now()) return "free";
  return raw;
}

export function planHas(plan: PlanCode, feature: PlanFeature): boolean {
  return PLANS[plan].features.includes(feature);
}

/** Shu imkoniyat qaysi eng arzon tarifdan boshlanadi (yangilash taklifida ko'rsatiladi). */
export function planFor(feature: PlanFeature): PlanCode {
  return PLAN_CODES.find((p) => planHas(p, feature)) ?? "premium";
}

/** Chegaraga yetdimi: count — hozirgi soni. */
export function atLimit(limit: number | null, count: number): boolean {
  return limit !== null && count >= limit;
}

/** Pullik tarif tugashiga necha kun qoldi (muddatsiz yoki bepul bo'lsa — null). */
export function daysLeft(u: PlanState): number | null {
  if (effectivePlan(u) === "free" || !u.subscriptionUntil) return null;
  return Math.max(0, Math.ceil((new Date(u.subscriptionUntil).getTime() - Date.now()) / 86_400_000));
}
