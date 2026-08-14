import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "accent";

const variants: Record<Variant, string> = {
  primary:
    "bg-lc-ink text-[var(--lc-ink-inverse)] hover:bg-[#000] active:scale-[0.98]",
  secondary:
    "bg-lc-surface text-lc-ink border border-[var(--lc-line-strong)] hover:bg-[#f5f5f7]",
  ghost: "bg-transparent text-lc-ink hover:bg-black/[0.04]",
  accent:
    "bg-lc-accent text-white hover:bg-[#0077ed] active:scale-[0.98]",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "xs" | "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] font-medium transition-[background-color,transform,opacity,border-color] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-45",
        size === "xs" && "h-10 min-w-10 px-3 text-[13px]",
        size === "sm" && "h-9 px-3.5 text-[13px]",
        size === "md" && "h-10 px-4 text-[14px]",
        size === "lg" && "h-11 px-5 text-[15px]",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
