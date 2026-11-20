import Dexie, { type EntityTable } from "dexie";

/**
 * IndexedDB schema for offline mutation queue.
 * Only stores the minimum needed for sync — not a full clinical cache.
 */

export interface OfflineMutation {
  id: string;
  type: "patient:create" | "observation:create" | "screening:create" | "consultation:create";
  endpoint: string;
  method: "POST";
  body: string; // JSON stringified
  idempotencyKey: string;
  dependsOn?: string; // id of another mutation this depends on
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
  attempts: number;
  lastError?: string;
  createdAt: string;
  syncedAt?: string;
}

class OfflineDatabase extends Dexie {
  mutations!: EntityTable<OfflineMutation, "id">;

  constructor() {
    super("pak-tele-health-offline");
    this.version(1).stores({
      mutations: "id, status, createdAt, dependsOn, idempotencyKey",
    });
  }
}

export const offlineDb = new OfflineDatabase();

export async function addOfflineMutation(
  mutation: Omit<OfflineMutation, "status" | "attempts" | "createdAt">
): Promise<string> {
  const record: OfflineMutation = {
    ...mutation,
    status: "PENDING",
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  await offlineDb.mutations.add(record);
  return record.id;
}

export async function getPendingMutations(): Promise<OfflineMutation[]> {
  return offlineDb.mutations
    .where("status")
    .anyOf(["PENDING", "FAILED"])
    .sortBy("createdAt");
}

export async function getAllMutations(): Promise<OfflineMutation[]> {
  return offlineDb.mutations.orderBy("createdAt").toArray();
}

export async function updateMutationStatus(
  id: string,
  status: OfflineMutation["status"],
  error?: string
): Promise<void> {
  await offlineDb.mutations.update(id, {
    status,
    lastError: error,
    attempts: (await offlineDb.mutations.get(id))!.attempts + 1,
    ...(status === "SYNCED" ? { syncedAt: new Date().toISOString() } : {}),
  });
}

export async function clearSyncedMutations(): Promise<void> {
  await offlineDb.mutations.where("status").equals("SYNCED").delete();
}

export async function clearAllMutations(): Promise<void> {
  await offlineDb.mutations.clear();
}
