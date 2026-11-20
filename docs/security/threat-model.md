# Threat Model -- Pak-Tele-Health

## 1. System Context

Pak-Tele-Health is a web application handling protected health information (PHI) for patients in rural Pakistan. Healthcare workers access it on mobile devices over unreliable networks. Doctors access it remotely. The system stores patient demographics, vitals, mental-health screening results, and consultation notes.

---

## 2. Trust Boundaries

| Boundary | Description |
|---|---|
| **B1: Browser <-> Server** | HTTPS transport. JWT cookie auth. All API calls cross this boundary. |
| **B2: Server <-> Database** | Internal network. Prisma Client connects to MySQL over TCP 3306. |
| **B3: IndexedDB (client)** | Offline queue persisted on the user's device. Outside server control. |
| **B4: Admin boundary** | Admin role has elevated access to user management, config, and audit. |

---

## 3. Threat Catalog

### T1: Credential Theft

- **Target:** User passwords, JWT tokens.
- **Mitigation:** Passwords hashed with argon2. JWTs stored as HTTP-only cookies (not accessible to JavaScript). 8-hour session TTL. Login page served over HTTPS.

### T2: Unauthorized Access to PHI

- **Target:** Patient records, screening answers, consultation notes.
- **Mitigation:** RBAC enforced at the service layer (`requireRole`, `requirePermission`, `requireFacilityAccess`). Facility-scoped access prevents HWs from seeing patients at other facilities. Screening answers require `screening:read_private` permission. All PHI access is audit-logged.

### T3: Offline Data Exposure

- **Target:** IndexedDB queue on a lost or shared device.
- **Mitigation:** The sync queue stores mutation payloads (not full patient records). Payloads are cleared after successful sync. Browser-level device security (screen lock, encryption) is the user's responsibility. Future: encrypt IndexedDB payloads at rest.

### T4: Replay Attacks / Duplicate Submissions

- **Target:** Observation and screening creation endpoints.
- **Mitigation:** Every mutating request accepts an idempotency key. The server checks `idempotency_receipts` before executing; duplicates return the cached response. Receipts expire after 24 hours.

### T5: Privilege Escalation

- **Target:** A Healthcare Worker accessing Doctor or Admin functions.
- **Mitigation:** Roles and permissions are embedded in the JWT at login and checked on every API call. The middleware redirects unauthenticated requests. Service-layer `requireRole`/`requirePermission` guards reject unauthorized calls with 403. Role assignment is admin-only.

### T6: SQL Injection

- **Target:** Database queries.
- **Mitigation:** All database access goes through Prisma Client, which uses parameterized queries. No raw SQL is used. Input is validated with Zod schemas before reaching the ORM.

### T7: Tampering with Clinical Alerts

- **Target:** Alert thresholds, alert status.
- **Mitigation:** Clinical rule thresholds are stored in versioned `ClinicalRuleVersion` records. Each alert links to the specific rule version that generated it, providing an immutable audit trail. Alert status transitions follow a defined state machine; invalid transitions are rejected. Status history is append-only.

### T8: Screening Data Leakage

- **Target:** Mental-health questionnaire answers.
- **Mitigation:** Screening sessions default to `privacyLevel = PRIVATE`. Alerts generated from screenings use the PRIVATE level and do not include answer content. Only users with `screening:read_private` permission can retrieve answers. Audit events are logged for all screening access.

### T9: Audit Log Tampering

- **Target:** Audit trail integrity.
- **Mitigation:** `AuditEvent` records are append-only. No update or delete operations exist on the audit table in application code. Database-level protections (restricted DELETE grants) should be applied in production.

### T10: Denial of Service

- **Target:** API endpoints.
- **Mitigation:** Not yet addressed. Future: rate limiting at the reverse proxy layer. Health check endpoints (`/api/health/live`, `/api/health/ready`) are unauthenticated but lightweight.

---

## 4. Data Classification Summary

| Level | Examples | Controls |
|---|---|---|
| **PHI** | Patient name, DOB, location, medical info, consultation notes | RBAC, facility scoping, audit logging |
| **Sensitive** | Screening answers | `screening:read_private` permission, PRIVATE alert level |
| **Internal** | Observation values, alert details | Authenticated access, role-based |
| **System** | Passwords, JWT secrets, DB credentials | argon2 hashing, environment variables, never committed |

---

## 5. Residual Risks

| Risk | Status | Plan |
|---|---|---|
| IndexedDB not encrypted at rest | Accepted (MVP) | Evaluate client-side encryption library |
| No rate limiting on API | Accepted (MVP) | Add at reverse proxy before production |
| JWT does not revoke on role change | Accepted | Token expires in 8 hours; force re-login for critical role changes |
| No CSRF token (JWT in cookie) | Low risk (SameSite cookie) | Evaluate if third-party embedding is needed |
