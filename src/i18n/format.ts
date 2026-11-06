/** "{name}" kabi joylarni qiymat bilan almashtiradi. Server va mijozda ishlaydi. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
