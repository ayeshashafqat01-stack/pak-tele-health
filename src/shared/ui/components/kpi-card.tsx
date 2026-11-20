import { cn } from "@/shared/lib/utils";

interface KpiCardProps {
  label: string;
  value: number | string;
  variant?: "default" | "warning" | "danger";
}

const borderColors = {
  default: "border-t-[var(--color-action-primary)]",
  warning: "border-t-[var(--color-warning)]",
  danger: "border-t-[var(--color-danger)]",
};

export function KpiCard({ label, value, variant = "default" }: KpiCardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] border-t-4 rounded-[var(--radius-lg)] px-4 py-3 shadow-[var(--shadow-kpi)]",
        borderColors[variant]
      )}
    >
      <div className="text-[1.9rem] font-bold leading-tight">{value}</div>
      <div className="text-[var(--color-text-muted)] text-[0.9rem]">
        {label}
      </div>
    </div>
  );
}
