"use client";

import { createContext, useContext } from "react";

interface SyncQueueContextValue {
  pendingCount: number;
  isSyncing: boolean;
  addToQueue: (mutation: SyncMutation) => Promise<void>;
  retryAll: () => Promise<void>;
}

export interface SyncMutation {
  id: string;
  type: string;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH";
  body: Record<string, unknown>;
  idempotencyKey: string;
  dependsOn?: string; // ID of another mutation this depends on
  createdAt: string;
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
  attempts: number;
  lastError?: string;
}

const SyncQueueContext = createContext<SyncQueueContextValue>({
  pendingCount: 0,
  isSyncing: false,
  addToQueue: async () => {},
  retryAll: async () => {},
});

export function useSyncQueue() {
  return useContext(SyncQueueContext);
}

export { SyncQueueContext };
