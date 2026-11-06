import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("rounded-xl border border-line bg-surface p-5", className)}>{children}</div>;
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
      {action}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "danger" | "success" | "accent" }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-[13px] text-muted">{label}</div>
      <div className={clsx("mt-1 text-2xl font-bold tabular-nums", tone === "danger" && "text-danger", tone === "success" && "text-success", tone === "accent" && "text-accent")}>{value}</div>
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
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold", pillTones[tone])}>{children}</span>;
}
