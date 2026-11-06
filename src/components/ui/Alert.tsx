import clsx from "clsx";
import type { ReactNode } from "react";

export function Alert({ tone = "danger", children }: { tone?: "danger" | "info" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={clsx(
        "rounded-lg px-3.5 py-3 text-[13px] leading-relaxed",
        tone === "danger" && "bg-danger-soft text-danger",
        tone === "info" && "bg-accent-soft text-text",
        tone === "success" && "bg-success-soft text-success",
      )}
    >
      {children}
    </div>
  );
}
