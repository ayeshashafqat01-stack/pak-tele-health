import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        className={cn(
          "w-full px-[0.65rem] py-[0.55rem] border rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] min-h-[2.6rem] text-[var(--color-text-primary)] transition-colors duration-[var(--motion-duration-fast)]",
          "focus-visible:outline-3 focus-visible:outline-[var(--color-focus-ring)] focus-visible:outline-offset-2",
          error
            ? "border-[var(--color-danger)]"
            : "border-[var(--color-border-strong)]",
          className
        )}
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
