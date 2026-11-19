import clsx from "clsx";
import type { ReactNode } from "react";

/** Shisha karta: yarim shaffof yuza, yumshoq chegara va soya. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("glass-card rounded-2xl p-5", className)}>{children}</div>;
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

/** Ko'rsatkich kartasi: ustiga olib borilsa yengil ko'tariladi, tepasida ko'k nur chizig'i. */
export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "danger" | "success" | "accent" }) {
  return (
    <div className="glass-card group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--c-shadow-lg)]">
      <span
        aria-hidden
        className={clsx(
          "absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100",
          tone === "danger" ? "via-danger" : tone === "success" ? "via-success" : "via-accent",
        )}
      />
      <span
        aria-hidden
        className={clsx(
          "absolute -top-10 -right-10 size-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-60",
          tone === "danger" ? "bg-danger/30" : tone === "success" ? "bg-success/30" : "bg-accent/30",
        )}
      />
      <div className="relative text-[12px] font-medium tracking-wide text-muted uppercase">{label}</div>
      <div className={clsx("relative mt-1.5 text-[22px] leading-none font-bold", tone === "danger" && "text-danger", tone === "success" && "text-success", tone === "accent" && "text-accent")}>
        {value}
      </div>
    </div>
  );
}

const pillTones = {
  neutral: "bg-surface-2 text-muted ring-line",
  accent: "bg-accent-soft text-accent ring-accent/20",
  success: "bg-success-soft text-success ring-success/20",
  danger: "bg-danger-soft text-danger ring-danger/20",
};

export function Pill({ tone = "neutral", children }: { tone?: keyof typeof pillTones; children: ReactNode }) {
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-[12px] leading-none font-semibold ring-1 ring-inset", pillTones[tone])}>{children}</span>;
}
