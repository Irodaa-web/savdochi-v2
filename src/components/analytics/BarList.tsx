import Link from "next/link";

export type BarRow = { key: string; label: string; sub?: string; value: number; display: string; href?: string };

/**
 * Gorizontal ustunli ro'yxat (kattalik): bitta rang, qiymat matni — oddiy siyohda, ustun yonida.
 * Ulush foizi ham yoziladi — rangga tayanilmaydi, jadvaldek o'qiladi.
 */
export function BarList({ rows, total, empty, label }: { rows: BarRow[]; total?: number; empty: string; label: string }) {
  if (!rows.length) return <p className="text-[13px] text-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const sum = total ?? rows.reduce((s, r) => s + r.value, 0);
  return (
    <ul aria-label={label} className="flex flex-col gap-3">
      {rows.map((r) => {
        const share = sum ? Math.round((r.value / sum) * 100) : 0;
        const name = r.href ? (
          <Link href={r.href} className="truncate font-medium hover:text-accent hover:underline">
            {r.label}
          </Link>
        ) : (
          <span className="truncate font-medium">{r.label}</span>
        );
        return (
          <li key={r.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 flex-col">
                {name}
                {r.sub && <span className="truncate text-[12px] text-muted">{r.sub}</span>}
              </span>
              <span className="shrink-0 text-right tabular-nums">
                <b>{r.display}</b>
                <span className="ml-1.5 text-[12px] text-muted">{share}%</span>
              </span>
            </div>
            <span className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <span className="block h-full rounded-full bg-[var(--c-chart)]" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
