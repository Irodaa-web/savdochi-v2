import clsx from "clsx";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

/**
 * Ko'rsatkich kartasi + oldingi teng davrga nisbatan o'zgarish.
 * Yaxshi/yomon rangi o'zgarish yo'nalishiga qarab (masalan, bekor qilinganlar o'sishi — yomon);
 * rang hech qachon yolg'iz emas — belgi va matn bilan birga.
 */
export function DeltaStat({
  label,
  value,
  delta,
  upIsGood = true,
  versus,
  hint,
  unit = "%",
}: {
  label: string;
  value: string;
  /** Foiz; null — oldingi davrda ma'lumot yo'q. */
  delta: number | null;
  upIsGood?: boolean;
  /** "oldingi davrga nisbatan" kabi izoh. */
  versus: string;
  hint?: string;
  /** "%" — nisbiy o'zgarish; boshqasi (masalan, "p.p.") — ulushlar uchun foiz punkti farqi. */
  unit?: string;
}) {
  const good = delta === null || delta === 0 ? null : delta > 0 === upIsGood;
  const Icon = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  return (
    <div className="glass-card flex flex-col gap-1.5 rounded-2xl p-4">
      <span className="text-[12px] font-semibold tracking-wide text-muted uppercase">{label}</span>
      <span className="text-[22px] leading-tight font-bold tabular-nums">{value}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
        <span
          className={clsx(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold tabular-nums",
            good === true && "bg-success-soft text-success",
            good === false && "bg-danger-soft text-danger",
            good === null && "bg-surface-2 text-muted",
          )}
        >
          {delta !== null && <Icon size={13} aria-hidden />}
          {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}${unit === "%" ? "%" : ` ${unit}`}`}
        </span>
        {versus}
      </span>
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </div>
  );
}
