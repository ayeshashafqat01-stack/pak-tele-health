"use client";

import { useConnectivity, type ConnectionStatus } from "@/shared/hooks/use-connectivity";
import { useSyncQueue } from "@/shared/hooks/use-sync-queue";
import { cn } from "@/shared/lib/utils";

const bannerConfig: Record<
  string,
  { bg: string; text: string; message: string } | null
> = {
  online: null,
  weak: {
    bg: "bg-[var(--color-warning-bg)]",
    text: "text-[var(--color-warning)]",
    message: "Weak connection — records sync slowly.",
  },
  offline: {
    bg: "bg-[var(--color-danger-bg)]",
    text: "text-[var(--color-danger)]",
    message: "Offline — Records will be saved and synchronized when connection returns.",
  },
};

export function ConnectivityBanner() {
  const { status } = useConnectivity();
  const { pendingCount, isSyncing } = useSyncQueue();

  const config = bannerConfig[status];

  if (!config && !isSyncing) return null;

  if (isSyncing && !config) {
    return (
      <div
        className="px-4 py-2 font-bold bg-[var(--color-info-bg)] text-[var(--color-info)]"
        role="status"
        aria-live="polite"
      >
        Syncing {pendingCount} record{pendingCount !== 1 ? "s" : ""}...
      </div>
    );
  }

  if (!config) return null;

  return (
    <div
      className={cn("px-4 py-2 font-bold", config.bg, config.text)}
      role="status"
      aria-live="polite"
    >
      {config.message}
    </div>
  );
}

export function ConnectivityDot({ status }: { status: ConnectionStatus }) {
  const colors: Record<ConnectionStatus, string> = {
    online: "bg-[#4cc27a]",
    weak: "bg-[#f0a828]",
    offline: "bg-[#ef5a4e]",
  };

  return (
    <span
      className={cn("w-3 h-3 rounded-full inline-block", colors[status])}
      aria-hidden="true"
    />
  );
}
