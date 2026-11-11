/** Qarz bilan bog'liq sof hisob-kitoblar (server va testlar uchun). */

export type Unpaid = { id: string; total: number; paid: number };
export type Allocation = { id: string; amount: number };

/**
 * To'lovni eng eski buyurtmadan boshlab taqsimlaydi (`orders` eskidan yangiga tartiblangan bo'lsin).
 * Qarzdan ortiq summa taqsimlanmay qoladi — `rest` da qaytadi.
 */
export function allocateFifo(orders: Unpaid[], amount: number): { allocations: Allocation[]; rest: number } {
  let rest = amount;
  const allocations: Allocation[] = [];
  for (const o of orders) {
    if (rest <= 0) break;
    const left = o.total - o.paid;
    if (left <= 0) continue;
    const part = Math.min(left, rest);
    allocations.push({ id: o.id, amount: part });
    rest -= part;
  }
  return { allocations, rest };
}
