# Architecture -- Pak-Tele-Health

## 1. Architectural Style

Pak-Tele-Health is a **modular monolith** built on Next.js 16 with the App Router. All domain logic is organized into discrete modules under `src/modules/`, while shared infrastructure lives in `src/shared/`. The Next.js App Router provides both the UI (React Server Components + Client Components) and the API layer (Route Handlers under `src/app/api/`).

This architecture was chosen because:

- A single deployable unit simplifies operations for a small team targeting low-resource environments.
- Module boundaries enforce separation of concerns without the operational overhead of microservices.
- The App Router's file-system routing co-locates pages with their data requirements.

---

## 2. Module Structure

```
src/modules/
  alerts/           # Clinical rule evaluation, alert CRUD, status transitions
  audit/            # Append-only audit event logging
  consultations/    # Doctor consultation records
  facilities/       # Facility registry
  identity/         # User identity (future: profile management)
  observations/     # Vital-sign recording, amendment history
  patients/         # Patient registry, pathway assignment
  referrals/        # Referral state machine
  screenings/       # Questionnaire versioning, session recording
  sync/             # Offline sync coordination
```

Each module exposes a **service layer** (`services/*.service.ts`) that encapsulates business logic and database access. Modules communicate through direct service imports -- there is no event bus. The dependency direction is:

```
API Route Handlers
  -> Module Services
    -> Shared (db, auth, errors, validation)
    -> Prisma Client
```

### Key dependency rules

- Modules may import from `shared/` but never from another module's internal files.
- Cross-module calls go through exported service functions.
- The `alerts` module depends on `observations` data (passed as arguments, not imported).
- The `screenings` module creates alerts via direct Prisma transaction, co-located in the same service call.

---

## 3. Shared Infrastructure

```
src/shared/
  auth/             # NextAuth config, JWT callbacks, RBAC helpers, permission constants
  db/               # Prisma client singleton
  errors/           # Typed error classes (NotFoundError, ValidationError, AuthorizationError)
  hooks/            # Client-side React hooks (connectivity, sync queue)
  lib/              # General utilities
  validation/       # Zod schemas reused across modules
```

---

## 4. API Design

All API routes live under `src/app/api/v1/` and follow REST conventions:

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/v1/patients` | GET, POST | List and create patients |
| `/api/v1/patients/[id]` | GET, PATCH | Read and update a patient |
| `/api/v1/observations` | GET, POST | List and create observations |
| `/api/v1/symptoms` | GET | List symptom catalog |
| `/api/v1/screenings` | POST | Create a screening session |
| `/api/v1/consultations` | POST | Create a consultation |
| `/api/v1/referrals/[id]/transition` | POST | Transition referral status |
| `/api/v1/facilities` | GET | List facilities |
| `/api/v1/hw/dashboard` | GET | HW dashboard aggregates |
| `/api/v1/doctor/dashboard` | GET | Doctor dashboard aggregates |
| `/api/health/live` | GET | Liveness probe |
| `/api/health/ready` | GET | Readiness probe (checks DB) |

Every mutating endpoint accepts an optional `Idempotency-Key` header (UUID v4). The server stores a receipt in the `idempotency_receipts` table and returns the cached response for duplicate keys.

---

## 5. Offline-First Sync Model

Healthcare workers operate in areas with intermittent connectivity. The offline strategy has three layers:

### 5.1 Connectivity Detection

The `useConnectivity` hook (`src/shared/hooks/use-connectivity.ts`) tracks connection status as `online`, `weak`, or `offline`. A development simulator allows toggling status for testing.

### 5.2 Client-Side Queue

The `useSyncQueue` hook (`src/shared/hooks/use-sync-queue.ts`) manages a queue of `SyncMutation` objects persisted to IndexedDB via Dexie. Each mutation captures:

- `endpoint` and `method` (POST, PUT, PATCH)
- `body` (the payload)
- `idempotencyKey` (UUID generated at creation time)
- `dependsOn` (optional, for ordering dependent mutations)
- `status` (PENDING -> SYNCING -> SYNCED | FAILED)
- `attempts` and `lastError`

### 5.3 Server-Side Idempotency

The `IdempotencyReceipt` table stores a mapping from idempotency key to the original HTTP response. When a replayed request arrives with a key that already has a receipt, the server returns the cached response without re-executing the mutation. Receipts expire after 24 hours.

### Sync Flow

```
1. User submits form
2. If online  -> POST to API directly
   If offline -> Write to IndexedDB queue, show pending badge
3. When connectivity returns -> Replay queue in order, respecting dependsOn
4. For each mutation:
   a. Set status = SYNCING
   b. POST with Idempotency-Key header
   c. If 2xx -> status = SYNCED, remove from queue
   d. If 409 (duplicate) -> status = SYNCED (already applied)
   e. If 4xx/5xx -> status = FAILED, increment attempts, store error
```

---

## 6. Database Design

### Engine and Encoding

- Supabase PostgreSQL for hosted environments; PostgreSQL 17 in local Docker development
- UTF-8/Unicode text storage for English and future Urdu content
- Vercel runtime traffic uses the transaction pooler; migrations use the direct/session connection
- All timestamps stored in UTC (`TIMESTAMP(3)` with millisecond precision)

### Key Design Decisions

- **UUIDs as primary keys** (`VarChar(36)`) -- avoids sequential ID leakage and supports offline ID generation.
- **Soft deletes** -- `deletedAt` on `users` and `patients`; queries filter by `deletedAt IS NULL`.
- **Optimistic concurrency** -- `patients.version` column incremented on update; stale writes are rejected.
- **Synthetic flag** -- `isSynthetic` on data-bearing tables marks seeded demo data.
- **Versioned clinical rules** -- `ClinicalRuleDefinition` + `ClinicalRuleVersion` allows threshold changes without altering historical alerts. Each alert links to the specific rule version that produced it.
- **Versioned questionnaires** -- `QuestionnaireDefinition` + `QuestionnaireVersion` + questions/options. Screening sessions link to a specific version so historical sessions remain valid if questions change.

### Entity Relationships (summary)

```
User -< UserRole >- Role -< RolePermission >- Permission
User -< UserFacilityAssignment >- Facility
Patient -< PatientFacilityAssignment >- Facility
Patient -< PatientPathway >- CarePathway
Patient -< Observation -< ObservationSymptom >- SymptomCatalog
Observation -< ObservationAmendment
Patient -< ScreeningSession -< ScreeningAnswer
Patient -< Alert -< AlertObservation >- Observation
Alert -< AlertStatusHistory
Patient -< Consultation - Referral -< ReferralStatusHistory
Facility <- Referral (source + destination)
```

---

## 7. Authentication and RBAC

### Auth Flow

1. User submits email + password on `/login`.
2. NextAuth Credentials provider looks up the user, verifies argon2 hash.
3. On success, a JWT is issued containing `id`, `roles`, `permissions`, and `facilities`.
4. The JWT is stored as an HTTP-only cookie with an 8-hour TTL.
5. Next.js middleware (`src/middleware.ts`) runs the `authorized` callback on every request, redirecting unauthenticated users to `/login`.

### RBAC Model

```
User --many-to-many--> Role --many-to-many--> Permission
User --many-to-many--> Facility
```

Three roles: `HEALTHCARE_WORKER`, `DOCTOR`, `ADMIN`.

Authorization is enforced at the service layer via:

- `requireAuth()` -- ensures a valid session exists.
- `requireRole(ctx, ...roles)` -- checks the user has at least one of the specified roles.
- `requirePermission(ctx, permission)` -- checks for a specific permission string.
- `requireFacilityAccess(ctx, facilityId)` -- ensures the user is assigned to the facility (admins bypass).

### Permission Catalog

| Domain | Permissions |
|---|---|
| Patient | `patient:create`, `patient:read`, `patient:update` |
| Observation | `observation:create`, `observation:read`, `observation:amend` |
| Screening | `screening:create`, `screening:read_own`, `screening:read_private` |
| Alert | `alert:read`, `alert:review` |
| Consultation | `consultation:create`, `consultation:read` |
| Referral | `referral:create`, `referral:transition`, `referral:read` |
| Admin | `admin:users`, `admin:facilities`, `admin:config`, `admin:audit` |

---

## 8. Audit

Every significant action writes an `AuditEvent` with:

- `actorId` -- the user who performed the action
- `action` -- e.g., `patient:create`, `observation:create`, `alert:transition`
- `resourceType` and `resourceId` -- what was affected
- `facilityId` -- facility context (if applicable)
- `outcome` -- SUCCESS, DENIED, or ERROR
- `metadata` -- JSON payload with action-specific details
- `requestId` and `ipAddress`

Audit events are append-only. There is no update or delete operation on the audit table.
