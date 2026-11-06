import type { Dictionary } from "@/i18n/dictionaries/uz";

/** Server qaytargan xato kodi yoki maydon kalitini foydalanuvchi tilidagi matnga aylantiradi. */
export function errorText(t: Dictionary, code: string): string {
  const errors = t.errors as Record<string, string>;
  return errors[code] ?? t.errors.SERVER_ERROR;
}

/** Faqat sayt ichidagi manzilga qaytaradi (ochiq redirect'dan himoya). */
export function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
