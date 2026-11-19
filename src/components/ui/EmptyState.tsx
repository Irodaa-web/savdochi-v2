import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Bo'sh holat: shisha karta, ko'k gradientli suzuvchi belgi. */
export function EmptyState({ Icon, title, hint, action }: { Icon: LucideIcon; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-dashed border-accent/25 bg-[var(--c-glass-strong)] px-6 py-16 text-center shadow-[var(--c-shadow)]">
      <span aria-hidden className="pointer-events-none absolute -top-16 left-1/2 size-48 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      <span className="btn-primary relative flex size-14 items-center justify-center rounded-2xl motion-safe:animate-[orb-float_6s_ease-in-out_infinite]">
        <Icon size={24} aria-hidden />
      </span>
      <p className="relative text-[15px] font-semibold">{title}</p>
      {hint && <p className="relative max-w-sm text-[14px] text-muted">{hint}</p>}
      {action && <div className="relative">{action}</div>}
    </div>
  );
}
