"use client";

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { ConnectivityContext, type ConnectionStatus } from "@/shared/hooks/use-connectivity";
import { SyncQueueContext, type SyncMutation } from "@/shared/hooks/use-sync-queue";
import {
  offlineDb,
  addOfflineMutation,
  getPendingMutations,
  updateMutationStatus,
  clearSyncedMutations,
  type OfflineMutation,
} from "@/shared/lib/offline-db";
import { useLiveQuery } from "dexie-react-hooks";

const IS_DEV = process.env.NODE_ENV === "development";

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [status, setStatusState] = useState<ConnectionStatus>("online");
  const [isDevSimulator, setIsDevSimulator] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);

  // Live query: reactive count from IndexedDB
  const pendingMutations = useLiveQuery(
    () =>
      offlineDb.mutations
        .where("status")
        .anyOf(["PENDING", "SYNCING", "FAILED"])
        .count(),
    [],
    0
  );

  // Detect real connectivity: browser events + periodic health check
  useEffect(() => {
    if (isDevSimulator) return;

    const goOnline = () => {
      setStatusState("online");
      processQueue();
    };
    const goOffline = () => setStatusState("offline");

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    if (!navigator.onLine) setStatusState("offline");

    // Periodic health check every 30s — catches "connected but no internet" cases
    const healthCheck = setInterval(async () => {
      if (isDevSimulator) return;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("/api/health/live", {
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeout);
        if (res.ok) {
          setStatusState((prev) => (prev === "offline" ? "online" : prev));
          processQueue();
        } else {
          setStatusState("weak");
        }
      } catch {
        setStatusState("offline");
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(healthCheck);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDevSimulator]);

  const setStatus = useCallback(
    (s: ConnectionStatus) => {
      if (IS_DEV) setIsDevSimulator(true);
      setStatusState(s);
      if (s !== "offline") {
        processQueue();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Send one mutation to the server
  async function sendMutation(m: OfflineMutation): Promise<boolean> {
    try {
      await updateMutationStatus(m.id, "SYNCING");

      const res = await fetch(m.endpoint, {
        method: m.method,
        headers: { "Content-Type": "application/json" },
        body: m.body,
      });

      if (res.ok) {
        await updateMutationStatus(m.id, "SYNCED");
        return true;
      }

      // 409 with idempotency = already synced, treat as success
      if (res.status === 409) {
        await updateMutationStatus(m.id, "SYNCED");
        return true;
      }

      const err = await res.text();
      await updateMutationStatus(m.id, "FAILED", `HTTP ${res.status}: ${err.slice(0, 200)}`);
      return false;
    } catch (e) {
      await updateMutationStatus(
        m.id,
        "FAILED",
        e instanceof Error ? e.message : "Network error"
      );
      return false;
    }
  }

  // Process the queue in dependency order
  async function processQueue() {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      const pending = await getPendingMutations();
      if (pending.length === 0) {
        setIsSyncing(false);
        syncInProgress.current = false;
        return;
      }

      // Build dependency graph: items without dependsOn go first
      const noDeps = pending.filter((m) => !m.dependsOn);
      const withDeps = pending.filter((m) => m.dependsOn);

      // Send items without dependencies first
      for (const m of noDeps) {
        const ok = await sendMutation(m);
        if (!ok) continue; // skip but don't block others
      }

      // Then send dependent items (e.g., observation after patient)
      for (const m of withDeps) {
        // Check if dependency was synced
        const dep = await offlineDb.mutations.get(m.dependsOn!);
        if (dep && dep.status !== "SYNCED") {
          // Dependency not yet synced, skip for now
          continue;
        }
        await sendMutation(m);
      }

      // Clean up synced items after a delay
      setTimeout(() => {
        clearSyncedMutations();
      }, 3000);
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  }

  const addToQueue = useCallback(
    async (mutation: SyncMutation) => {
      await addOfflineMutation({
        id: mutation.id,
        type: mutation.type as OfflineMutation["type"],
        endpoint: mutation.endpoint,
        method: mutation.method as "POST",
        body: JSON.stringify(JSON.parse(JSON.stringify(mutation.body))),
        idempotencyKey: mutation.idempotencyKey,
        dependsOn: mutation.dependsOn,
      });

      // If online, start sync immediately
      if (status !== "offline") {
        processQueue();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status]
  );

  const retryAll = useCallback(async () => {
    // Reset FAILED items to PENDING
    const failed = await offlineDb.mutations
      .where("status")
      .equals("FAILED")
      .toArray();
    for (const m of failed) {
      await updateMutationStatus(m.id, "PENDING");
    }
    processQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ConnectivityContext.Provider
      value={{ status, setStatus, isDevSimulator }}
    >
      <SyncQueueContext.Provider
        value={{
          pendingCount: pendingMutations,
          isSyncing,
          addToQueue,
          retryAll,
        }}
      >
        {children}
      </SyncQueueContext.Provider>
    </ConnectivityContext.Provider>
  );
}
