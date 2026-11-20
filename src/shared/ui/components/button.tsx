import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-bold text-[0.95rem] transition-all duration-[var(--motion-duration-normal)] focus-visible:outline-3 focus-visible:outline-[var(--color-focus-ring)] focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] border border-[var(--color-action-primary)] hover:brightness-108 shadow-[var(--shadow-sm)] active:shadow-[var(--shadow-xs)]",
        secondary:
          "bg-[var(--color-surface-raised)] text-[var(--color-action-secondary)] border border-[var(--color-action-primary)] hover:bg-[var(--color-surface-base)]",
        ghost:
          "bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-default)] hover:bg-[var(--color-action-ghost-hover)]",
        danger:
          "bg-[var(--color-danger)] text-white border border-[var(--color-danger)] hover:brightness-110",
      },
      size: {
        sm: "px-[0.65rem] py-[0.3rem] text-[0.875rem]",
        md: "px-[0.95rem] py-[0.55rem]",
        lg: "px-6 py-3 text-base",
        icon: "p-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
