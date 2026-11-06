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

/** Miqdorga mos narx: eng katta mos pog'ona, bo'lmasa asosiy narx. */
export function unitPriceFor(quantity: number, basePrice: number, tiers: PriceTier[]): number {
  let price = basePrice;
  for (const tier of [...tiers].sort((a, b) => a.min - b.min)) {
    if (quantity >= tier.min) price = tier.price;
  }
  return price;
}
