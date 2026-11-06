import { Package } from "lucide-react";
import clsx from "clsx";

export function Logo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
        <Package size={17} strokeWidth={2} aria-hidden />
      </span>
      <span className={clsx("text-[17px] font-bold tracking-tight", tone === "light" ? "text-header-text" : "text-text")}>Savdochi</span>
    </span>
  );
}
