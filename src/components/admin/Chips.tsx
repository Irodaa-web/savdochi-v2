import clsx from "clsx";
import Link from "next/link";

/** Filtr tugmalari (havolalar) — admin ro'yxatlari ustida bitta qatorda. */
export function Chips({ items, label }: { items: { href: string; label: string; active: boolean; count?: number }[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          aria-current={c.active ? "page" : undefined}
          className={clsx(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors",
            c.active ? "border-accent bg-accent text-accent-fg shadow-[var(--c-glow)]" : "border-line bg-[var(--c-glass-strong)] hover:border-accent/40 hover:text-accent",
          )}
        >
          {c.label}
          {c.count !== undefined && <span className={clsx("rounded-full px-1.5 text-[11px] leading-5 tabular-nums", c.active ? "bg-white/20" : "bg-surface-2")}>{c.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** Sahifalash: oldingi / keyingi. */
export function Pager({ page, pages, href, prev, next }: { page: number; pages: number; href: (p: number) => string; prev: string; next: string }) {
  if (pages <= 1) return null;
  const cls = "rounded-lg border border-line bg-surface px-3.5 py-2 text-[14px] font-medium hover:bg-surface-2";
  return (
    <nav className="flex items-center justify-center gap-3" aria-label="pagination">
      {page > 1 && (
        <Link href={href(page - 1)} className={cls}>
          {prev}
        </Link>
      )}
      <span className="text-[13px] text-muted tabular-nums">
        {page} / {pages}
      </span>
      {page < pages && (
        <Link href={href(page + 1)} className={cls}>
          {next}
        </Link>
      )}
    </nav>
  );
}
