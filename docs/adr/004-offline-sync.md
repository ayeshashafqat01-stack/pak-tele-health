# ADR-004: Offline Sync with IndexedDB and Idempotency Keys

**Status:** Accepted
**Date:** 2026-11-19
**Deciders:** Engineering team

## Context

Healthcare workers at rural BHUs frequently lose internet connectivity. They must be able to register patients, record vitals, and administer screenings without interruption. When connectivity returns, locally stored data must sync to the server without creating duplicates.

## Decision

We will implement a **client-side mutation queue** persisted to **IndexedDB** (via Dexie) paired with **server-side idempotency receipts** to ensure exactly-once semantics.

### Client Side

- The `useSyncQueue` hook manages a queue of `SyncMutation` objects.
- Each mutation is assigned a UUID `idempotencyKey` at creation time (before any network attempt).
- Mutations are persisted to IndexedDB immediately, surviving browser crashes and page reloads.
- The `useConnectivity` hook tracks `online | weak | offline` status.
- When online, the queue drains in FIFO order, respecting `dependsOn` for ordered mutations (e.g., register patient, then record observation for that patient).
- Successful syncs (`2xx` or `409 duplicate`) mark the mutation as SYNCED and remove it from the queue.
- Failed syncs increment `attempts` and store `lastError` for user visibility.

### Server Side

- Every mutating API endpoint accepts an `Idempotency-Key` header.
- Before executing a mutation, the service checks the `idempotency_receipts` table for an existing receipt with that key.
- If found, the cached response is returned immediately (no re-execution).
- If not found, the mutation executes within a transaction that also inserts the receipt.
- Receipts expire after 24 hours.

## Rationale

- **Dexie + IndexedDB** is the most robust client-side storage for structured data. It survives page reloads, browser crashes, and is available in all target browsers.
- **Idempotency keys** are the simplest pattern for exactly-once delivery. They avoid the complexity of conflict resolution, CRDTs, or bidirectional sync.
- **UUID generation on the client** means IDs are assigned offline and remain stable through sync. No server round trip is needed to obtain an ID.

## Alternatives Considered

- **Service Worker with Background Sync API:** More elegant but browser support is inconsistent and debugging is difficult. The queue approach is simpler and more transparent.
- **CRDTs / conflict-free sync:** Powerful but significantly more complex. Our data model (append-mostly vitals) does not require conflict resolution -- the HW is the sole writer for their facility's patients.
- **Optimistic server-side dedup by content hash:** Fragile if the same vitals are legitimately recorded twice at different times.

## Consequences

- **Positive:** HWs can work uninterrupted during connectivity loss. Data is not lost. Exactly-once semantics prevent duplicate records. The pending badge gives users confidence their data is queued.
- **Negative:** IndexedDB data is not encrypted at rest (see threat model T3). The 24-hour receipt expiry means very old offline data could theoretically create duplicates if the idempotency key expires before sync -- unlikely given the 8-hour session TTL.
- **Mitigated by:** Clearing synced mutations promptly. The sync queue UI shows pending count so HWs know when data has not yet been uploaded.
