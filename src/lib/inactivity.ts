/**
 * Avtomatik nofaollik qoidalari. Sof funksiyalar — bazaga murojaat qilmaydi, test qilish oson.
 *
 * Oxirgi faollik (`lastActiveAt`) — oxirgi muvaffaqiyatli kirish vaqti.
 * - 12-kun: ogohlantirish;
 * - 14-kun: oxirgi ogohlantirish;
 * - 15-kun: hisob nofaol bo'ladi, eski sessiyalar bekor qilinadi.
 * Admin bloklagan, demo va allaqachon nofaol hisoblarga tegilmaydi.
 */
export const DAY_MS = 86_400_000;
export const INACTIVITY_DAYS = { warn: 12, finalWarn: 14, inactive: 15 } as const;

export type InactivityState = {
  lastActiveAt: Date;
  inactive: boolean;
  blocked: boolean;
  demo: boolean;
  warned12At: Date | null;
  warned14At: Date | null;
};

export type InactivityAction = "none" | "warn" | "finalWarn" | "deactivate";

/** Hozir shu foydalanuvchi uchun bajariladigan bitta amal. */
export function planInactivity(s: InactivityState, now: Date): InactivityAction {
  if (s.inactive || s.blocked || s.demo) return "none";
  const idle = now.getTime() - s.lastActiveAt.getTime();
  if (idle >= INACTIVITY_DAYS.inactive * DAY_MS) return "deactivate";
  if (idle >= INACTIVITY_DAYS.finalWarn * DAY_MS) return s.warned14At ? "none" : "finalWarn";
  if (idle >= INACTIVITY_DAYS.warn * DAY_MS) return s.warned12At ? "none" : "warn";
  return "none";
}

/**
 * Bazadagi so'rovlar uchun chegaralar: `lastActiveAt` shu sanadan oldin yoki teng bo'lsa — mos.
 * planInactivity bilan bir xil qoida (idle >= N kun  <=>  lastActiveAt <= now - N kun).
 */
export function inactivityThresholds(now: Date): { warn: Date; finalWarn: Date; inactive: Date } {
  const at = (days: number) => new Date(now.getTime() - days * DAY_MS);
  return { warn: at(INACTIVITY_DAYS.warn), finalWarn: at(INACTIVITY_DAYS.finalWarn), inactive: at(INACTIVITY_DAYS.inactive) };
}
