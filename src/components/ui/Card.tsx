import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("rounded-2xl border border-line bg-surface p-5 shadow-[var(--c-shadow)]", className)}>{children}</div>;
}

/** Sahifa sarlavhasi: nom, qisqa izoh va amallar tugmalari. */
export function PageTitle({ children, action, lead }: { children: ReactNode; action?: ReactNode; lead?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[26px] leading-tight font-bold tracking-tight sm:text-[30px]">{children}</h1>
        {lead && <p className="max-w-2xl text-[14px] text-muted">{lead}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "danger" | "success" | "accent" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--c-shadow)]">
      <div className="text-[12px] font-medium tracking-wide text-muted uppercase">{label}</div>
      <div className={clsx("mt-1.5 text-[22px] leading-none font-bold tabular-nums", tone === "danger" && "text-danger", tone === "success" && "text-success", tone === "accent" && "text-accent")}>
        {value}
      </div>
    </div>
  );
}

const pillTones = {
  neutral: "bg-surface-2 text-muted",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

export function Pill({ tone = "neutral", children }: { tone?: keyof typeof pillTones; children: ReactNode }) {
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-[12px] leading-none font-semibold", pillTones[tone])}>{children}</span>;
}
