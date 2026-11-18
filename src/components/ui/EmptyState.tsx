import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ Icon, title, hint, action }: { Icon: LucideIcon; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon size={24} aria-hidden />
      </span>
      <p className="text-[15px] font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-[14px] text-muted">{hint}</p>}
      {action}
    </div>
  );
}
