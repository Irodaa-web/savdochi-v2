import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Yon ustundagi ma'lumot kartasi: belgi + sarlavha + mazmun (maslahat, tavsiya, holat). */
export function SideCard({ Icon, title, children, className, action }: { Icon: LucideIcon; title: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={clsx("glass-card rounded-2xl p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Icon size={16} aria-hidden />
          </span>
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-3 flex flex-col gap-3 text-[14px] leading-relaxed">{children}</div>
    </section>
  );
}

/** Belgili ro'yxat (afzalliklar, qadamlar). */
export function CheckList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
