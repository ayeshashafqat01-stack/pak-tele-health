import { type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  wide?: boolean;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  wide,
  required,
  children,
  className,
}: FieldProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        wide && "col-span-full",
        className
      )}
    >
      <label htmlFor={htmlFor} className="font-bold text-[0.92rem]">
        {label}
        {required && (
          <span className="text-[var(--color-danger)] ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <span className="text-[0.8rem] text-[var(--color-text-muted)]">
          {hint}
        </span>
      )}
      {error && (
        <span
          className="text-[0.8rem] text-[var(--color-danger)]"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}
