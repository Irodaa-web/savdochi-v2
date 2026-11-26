import { Crown } from "lucide-react";

/** Premium tarifdagi kompaniya belgisi (katalogda va kompaniya sahifasida). */
export function PremiumBadge({ label, onDark = false }: { label: string; onDark?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] leading-none font-semibold ring-1 ring-inset ${onDark ? "bg-amber-300/20 text-amber-200 ring-amber-200/40" : "bg-amber-100 text-amber-800 ring-amber-300/70 dark:bg-amber-400/15 dark:text-amber-200 dark:ring-amber-300/30"}`}
    >
      <Crown size={12} aria-hidden />
      {label}
    </span>
  );
}
