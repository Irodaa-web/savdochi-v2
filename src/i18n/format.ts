/** "{name}" kabi joylarni qiymat bilan almashtiradi. Server va mijozda ishlaydi. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

const LOCALE_TAG: Record<string, string> = { uz: "uz-UZ", ru: "ru-RU", en: "en-GB" };

/** Sana va vaqt: 06.11.2026, 14:05 */
export function formatDateTime(iso: string | Date, locale: string, withTime = true): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? "uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}
