import clsx from "clsx";
import type { ReactNode } from "react";

export function Alert({ tone = "danger", children }: { tone?: "danger" | "info" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={clsx(
        "rounded-2xl px-4 py-3 text-[13px] leading-relaxed ring-1 ring-inset backdrop-blur-sm",
        tone === "danger" && "bg-danger-soft text-danger ring-danger/20",
        tone === "info" && "bg-accent-soft/90 text-text ring-accent/20",
        tone === "success" && "bg-success-soft text-success ring-success/20",
      )}
    >
      {children}
    </div>
  );
}
