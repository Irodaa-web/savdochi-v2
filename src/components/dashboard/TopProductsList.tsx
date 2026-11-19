import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt } from "@/i18n/format";
import { formatAmount } from "@/lib/catalog";

export type TopProduct = { name: string; quantity: number; value: number; unit: string };

/**
 * Eng ko'p sotilganlar: nom, summa, sotilgan miqdor va eng yaxshisiga nisbatan ingichka ustun.
 * Qiymatlar yozib qo'yilgan — ustun faqat taqqoslash uchun (o'qish uchun hover shart emas).
 */
export function TopProductsList({ items, t, empty }: { items: TopProduct[]; t: Dictionary; empty: string }) {
  if (items.length === 0) return <p className="text-[14px] text-muted">{empty}</p>;
  const max = Math.max(1, ...items.map((p) => p.value));
  return (
    <ol className="flex flex-col gap-3.5">
      {items.map((p) => (
        <li key={p.name}>
          <div className="flex items-baseline justify-between gap-3 text-[14px]">
            <span className="min-w-0 truncate">{p.name}</span>
            <b className="shrink-0 tabular-nums">{formatAmount(p.value)}</b>
          </div>
          <div className="text-[12px] text-muted">{fmt(t.dashboard.topQuantity, { n: formatAmount(p.quantity), unit: t.units[p.unit as keyof typeof t.units] ?? p.unit })}</div>
          <div aria-hidden className="mt-1.5 h-1.5 rounded-r-[4px] bg-chart" style={{ width: `${Math.max(2, (p.value / max) * 100)}%` }} />
        </li>
      ))}
    </ol>
  );
}
