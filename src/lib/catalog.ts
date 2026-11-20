export const CATEGORY_CODES = ["food", "drinks", "household", "construction", "electronics", "other"] as const;
export type CategoryCode = (typeof CATEGORY_CODES)[number];

export const UNIT_CODES = ["piece", "pack", "box", "block", "bag", "kg", "litre"] as const;
export type UnitCode = (typeof UNIT_CODES)[number];

/** 98000 → "98 000" (bo'sh joy bilan, O'zbekistonda odatiy ko'rinish). */
export function formatAmount(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export type PriceTier = { min: number; price: number };

/**
 * Miqdorga mos narx: eng katta mos pog'ona, bo'lmasa asosiy narx.
 * Aksiya bo'lsa — aksiya narxi va pog'ona narxining arzonrog'i (xaridor hech qachon ko'proq to'lamaydi).
 */
export function unitPriceFor(quantity: number, basePrice: number, tiers: PriceTier[], salePrice: number | null = null): number {
  let price = basePrice;
  for (const tier of [...tiers].sort((a, b) => a.min - b.min)) {
    if (quantity >= tier.min) price = tier.price;
  }
  return salePrice != null ? Math.min(price, salePrice) : price;
}

/** Amaldagi aksiya narxi: narx qo'yilgan va muddati tugamagan bo'lsa, aks holda null. */
export function activeSalePrice(p: { salePrice?: number | null; saleUntil?: Date | string | null }, now: Date = new Date()): number | null {
  if (p.salePrice == null || !p.saleUntil) return null;
  return new Date(p.saleUntil).getTime() > now.getTime() ? p.salePrice : null;
}

/** Aksiya tugash kuni qisqa ko'rinishda: "2026-11-25T18:59:59Z" → "25.11" (Toshkent vaqti). */
export function saleDay(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5 * 3_600_000);
  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Chegirma foizi: 100 000 → 85 000 = 15. */
export function salePercent(price: number, salePrice: number): number {
  return Math.max(1, Math.round((1 - salePrice / price) * 100));
}

/** Mahsulot rasmlari: 4 tomondan, shu tartibda. Birinchisi katalogda ko'rinadi. */
export const PRODUCT_ANGLES = ["front", "back", "side", "top"] as const;
export type ProductAngle = (typeof PRODUCT_ANGLES)[number];
export const PRODUCT_IMAGES = PRODUCT_ANGLES.length;
