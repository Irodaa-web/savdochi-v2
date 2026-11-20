import clsx from "clsx";
import { Star } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import { fmt } from "@/i18n/format";

/** Yulduzlar (o'qish uchun): kasr qism ham ko'rinadi (4.5 → 4 ta to'liq + yarimta). */
export function Stars({ value, size = 16, className, label }: { value: number; size?: number; className?: string; label?: string }) {
  const row = (filled: boolean) =>
    Array.from({ length: 5 }, (_, i) => <Star key={i} size={size} strokeWidth={1.5} aria-hidden className={filled ? "shrink-0 fill-amber-400 text-amber-400" : "shrink-0 fill-line/60 text-line"} />);
  return (
    <span role="img" aria-label={label ?? `${value.toFixed(1)} / 5`} className={clsx("relative inline-flex w-fit", className)}>
      <span className="flex gap-0.5">{row(false)}</span>
      <span className="absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden" style={{ width: `${(Math.max(0, Math.min(5, value)) / 5) * 100}%` }}>
        {row(true)}
      </span>
    </span>
  );
}

/** Ixcham reyting: ★ 4.6 (12). Baho bo'lmasa — "Hali baho yo'q". */
export function RatingBadge({ average, count, t, className }: { average: number; count: number; t: Dictionary; className?: string }) {
  if (!count) return <span className={clsx("text-[12px] text-muted", className)}>{t.reviews.none}</span>;
  return (
    <span className={clsx("inline-flex items-center gap-1 text-[13px]", className)} aria-label={fmt(t.reviews.ratingLabel, { avg: average.toFixed(1), n: count })}>
      <Star size={14} aria-hidden className="fill-amber-400 text-amber-400" />
      <b className="tabular-nums">{average.toFixed(1)}</b>
      <span className="text-muted">({count})</span>
    </span>
  );
}
