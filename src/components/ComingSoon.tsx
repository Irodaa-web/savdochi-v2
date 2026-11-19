import { Hourglass } from "lucide-react";
import { getDictionary, getLocale } from "@/i18n/server";

/** Keyingi bosqichlarda to'ldiriladigan sahifalar uchun vaqtinchalik bo'sh holat. */
export async function ComingSoon({ title }: { title: string }) {
  const t = getDictionary(await getLocale());
  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-accent/25 bg-[var(--c-glass-strong)] px-6 py-16 text-center shadow-[var(--c-shadow)]">
        <span className="btn-primary flex size-12 items-center justify-center rounded-2xl">
          <Hourglass size={22} aria-hidden />
        </span>
        <p className="max-w-sm text-muted">{t.common.soon}</p>
      </div>
    </section>
  );
}
