/**
 * O'zbekiston raqamlarini yagona ko'rinishga keltiradi: +998XXXXXXXXX.
 * "90 123 45 67", "+998 (90) 123-45-67", "998901234567" — hammasi qabul qilinadi.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("998") ? digits.slice(3) : digits;
  if (!/^\d{9}$/.test(local)) return null;
  return `+998${local}`;
}

/** +998901234567 → +998 90 123 45 67 */
export function formatPhone(phone: string): string {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}
