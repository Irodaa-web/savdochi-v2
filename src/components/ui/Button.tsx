import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

/** Tugma uslublari: asosiy — ko'k gradient + yorug'lik o'tishi; ikkilamchi — shisha. */
export const buttonVariants: Record<Variant, string> = {
  primary: "btn-primary sheen hover:-translate-y-px hover:brightness-110",
  secondary:
    "border border-[var(--c-glass-border)] bg-[var(--c-glass-strong)] text-text shadow-[var(--c-shadow)] hover:-translate-y-px hover:border-accent/40 hover:text-accent",
  ghost: "text-text hover:bg-surface-2/80",
  danger: "bg-danger text-danger-fg shadow-sm hover:-translate-y-px hover:brightness-110",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-4 text-[14px]",
  lg: "h-12 px-6 text-[15px]",
};

export const buttonBase =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, block, className, disabled, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(buttonBase, buttonVariants[variant], sizes[size], block && "w-full", className)}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  );
}
