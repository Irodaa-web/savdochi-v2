import clsx from "clsx";
import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";

/** Tugma ko'rinishidagi havola (Button bilan bir xil uslub). */
export function LinkButton({ variant = "primary", className, children, ...rest }: LinkProps & { variant?: "primary" | "secondary"; className?: string; children: ReactNode }) {
  return (
    <Link
      {...rest}
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors",
        variant === "primary" ? "bg-accent text-accent-fg hover:bg-accent-hover" : "border border-line bg-surface text-text hover:bg-surface-2",
        className,
      )}
    >
      {children}
    </Link>
  );
}
