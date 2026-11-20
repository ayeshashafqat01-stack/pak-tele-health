import { cn } from "@/shared/lib/utils";
import { Badge } from "./badge";

interface AlertCardProps {
  level: "HIGH" | "REVIEW" | "PRIVATE";
  status: string;
  patientName: string;
  patientCode: string;
  patientAge?: number | null;
  issue: string;
  detail: string;
  rationale: string;
  showDetail?: boolean;
  actions?: React.ReactNode;
  syncStatus?: "SYNCED" | "PENDING" | "SYNCING";
}

const borderColors: Record<string, string> = {
  HIGH: "border-l-[var(--color-danger)]",
  REVIEW: "border-l-[var(--color-warning)]",
  PRIVATE: "border-l-[var(--color-private)]",
  DONE: "border-l-[var(--color-border-default)]",
};

export function AlertCard({
  level,
  status,
  patientName,
  patientCode,
  patientAge,
  issue,
  detail,
  rationale,
  showDetail = true,
  actions,
  syncStatus,
}: AlertCardProps) {
  const isOpen = status === "OPEN" || status === "IN_REVIEW";
  const borderColor = isOpen ? borderColors[level] : borderColors.DONE;

  const levelBadge = !isOpen ? (
    <Badge variant="success">Reviewed</Badge>
  ) : level === "HIGH" ? (
    <Badge variant="danger">High review</Badge>
  ) : level === "PRIVATE" ? (
    <Badge variant="private">Private</Badge>
  ) : (
    <Badge variant="warning">Review</Badge>
  );

  const syncBadge = syncStatus === "SYNCED" ? (
    <Badge variant="success">Synced</Badge>
  ) : syncStatus === "SYNCING" ? (
    <Badge variant="info">Syncing...</Badge>
  ) : syncStatus === "PENDING" ? (
    <Badge variant="warning">Pending sync</Badge>
  ) : null;

  const headingText =
    level === "HIGH"
      ? "High-risk observation"
      : level === "PRIVATE"
      ? "Private screening completed"
      : "Abnormal pattern";

  return (
    <article
      className={cn(
        "bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] border-l-[6px] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-card)]",
        borderColor
      )}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="font-bold">{patientName}</span>{" "}
          <span className="text-[var(--color-text-muted)] text-sm">
            {patientCode}
            {patientAge ? ` · ${patientAge} y` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {levelBadge}
          {syncBadge}
        </div>
      </div>

      <div className="font-bold mt-1">
        {headingText} — professional review required
      </div>

      {showDetail && detail && (
        <div className="mt-1">{detail}</div>
      )}
      {!showDetail && level === "PRIVATE" && (
        <div className="mt-1 text-[var(--color-text-muted)]">
          Details are private to authorized users.
        </div>
      )}

      <div className="text-[0.85rem] text-[var(--color-text-muted)] mt-1">
        Why flagged: {rationale}
      </div>

      {actions && (
        <div className="flex items-center gap-2 mt-3">{actions}</div>
      )}
    </article>
  );
}
