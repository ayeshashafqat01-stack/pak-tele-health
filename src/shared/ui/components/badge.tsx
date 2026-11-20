import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center px-[0.55rem] py-[0.1rem] rounded-[var(--radius-sm)] text-[0.82rem] font-bold whitespace-nowrap",
  {
    variants: {
      variant: {
        success: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
        warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
        danger: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]",
        info: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
        private: "bg-[var(--color-private-bg)] text-[var(--color-private)]",
        neutral:
          "bg-[var(--color-surface-base)] text-[var(--color-text-muted)] border border-[var(--color-border-default)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}
