import clsx from "clsx";
import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import { buttonBase, buttonVariants } from "./Button";

/** Tugma ko'rinishidagi havola (Button bilan bir xil uslub). */
export function LinkButton({ variant = "primary", className, children, ...rest }: LinkProps & { variant?: "primary" | "secondary"; className?: string; children: ReactNode }) {
  return (
    <Link {...rest} className={clsx(buttonBase, buttonVariants[variant], "h-10 px-4 text-[14px]", className)}>
      {children}
    </Link>
  );
}
