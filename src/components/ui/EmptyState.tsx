import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ Icon, title, hint, action }: { Icon: LucideIcon; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-surface-2 text-muted">
        <Icon size={22} aria-hidden />
      </span>
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}
