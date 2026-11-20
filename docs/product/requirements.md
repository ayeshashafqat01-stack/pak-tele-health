# Product Requirements -- Pak-Tele-Health

> All example data referenced in this document is **SYNTHETIC**.

## 1. Purpose

Pak-Tele-Health enables rural healthcare delivery in Pakistan by connecting field-based Healthcare Workers (HWs) at Basic Health Units with remote Doctors over intermittent internet connections. The platform supports patient registration, vital-sign collection, mental-health screening, clinical alerting, teleconsultation, and facility-to-facility referral.

---

## 2. Actors

| Actor | Description |
|---|---|
| **Healthcare Worker (HW)** | Field staff at a BHU. Registers patients, records vitals/symptoms, administers mental-health screenings, views own patient panels. |
| **Doctor** | Remote clinician. Reviews flagged alerts, records consultations/counselling notes, creates referrals to higher-level facilities. |
| **Admin** | System administrator. Manages users, facilities, clinical rule configuration, and views audit logs. |

---

## 3. Functional Requirements

### Patient Management

| ID | Requirement | Actor |
|---|---|---|
| FR-001 | Register a new patient with name, sex, DOB or age, location, and care pathway. | HW |
| FR-002 | Assign a patient to a facility on registration. | HW |
| FR-003 | View a patient list filtered by the HW's assigned facility. | HW |
| FR-004 | View patient detail including demographics, pathway, observations, alerts, and referrals. | HW, Doctor |
| FR-005 | Record informed consent before collecting data. | HW |
| FR-006 | Support optimistic concurrency on patient record updates (version field). | System |
| FR-007 | Soft-delete patients (set `deletedAt`); never hard-delete. | Admin |

### Observations

| ID | Requirement | Actor |
|---|---|---|
| FR-008 | Record a vital-sign observation (BP, heart rate, SpO2, temperature, glucose) with timestamp, source, and optional notes. | HW |
| FR-009 | Attach zero or more symptoms from the symptom catalog to an observation. | HW |
| FR-010 | Support multi-component observation types (e.g., BP = systolic + diastolic). | System |
| FR-011 | Amend an observation with reason; preserve original value and amendment history. | HW |
| FR-012 | Automatically evaluate clinical alert rules when an observation is created. | System |
| FR-013 | Accept an idempotency key per observation to support offline replay. | System |

### Mental-Health Screenings

| ID | Requirement | Actor |
|---|---|---|
| FR-014 | Administer a versioned questionnaire (e.g., PHQ-9 analog) with scored options. | HW |
| FR-015 | Mark every screening session as PRIVATE by default. | System |
| FR-016 | Auto-generate a PRIVATE-level alert for doctor review on screening completion. | System |
| FR-017 | Restrict screening answer visibility -- only users with `screening:read_private` can see answers. | System |

### Clinical Alerts

| ID | Requirement | Actor |
|---|---|---|
| FR-018 | Evaluate configurable, versioned clinical rules against new observations. | System |
| FR-019 | Generate alerts at levels: HIGH, REVIEW, PRIVATE. | System |
| FR-020 | Display open alerts on the Doctor dashboard, ordered by level (HIGH first). | Doctor |
| FR-021 | Transition alert status through OPEN -> IN_REVIEW -> REVIEWED or DISMISSED. | Doctor |
| FR-022 | Record status transition history with actor and reason. | System |

### Consultations and Referrals

| ID | Requirement | Actor |
|---|---|---|
| FR-023 | Create a consultation (type: consultation or counselling) with notes and recommendation. | Doctor |
| FR-024 | Create a referral tied to a consultation, specifying source facility, destination facility, and priority. | Doctor |
| FR-025 | Transition referral status: PENDING -> ACCEPTED -> COMPLETED or CANCELLED. | Doctor, HW |
| FR-026 | Record referral status history with actor and reason. | System |

### Offline and Sync

| ID | Requirement | Actor |
|---|---|---|
| FR-027 | Queue mutations locally (IndexedDB) when the device is offline. | System |
| FR-028 | Replay queued mutations in order when connectivity returns, using idempotency keys. | System |
| FR-029 | Display pending sync count and connectivity status to the user. | System |

### Administration

| ID | Requirement | Actor |
|---|---|---|
| FR-030 | View system summary dashboard (patient counts, alert counts, facility stats). | Admin |
| FR-031 | Manage users: create, deactivate, assign roles and facilities. | Admin |
| FR-032 | Manage facilities: create, update, deactivate. | Admin |
| FR-033 | View audit log with filters (actor, action, resource, date range). | Admin |

---

## 4. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-001 | The HW interface must be usable on low-end Android devices over 2G/3G connections. |
| NFR-002 | Offline-queued data must not be lost on browser close or crash (persisted to IndexedDB). |
| NFR-003 | All API mutations must be idempotent; replayed requests must not create duplicates. |
| NFR-004 | Passwords must be hashed with argon2. |
| NFR-005 | JWT session tokens expire after 8 hours. |
| NFR-006 | All audit events are append-only and include actor, action, resource, outcome, and timestamp. |
| NFR-007 | The system must render the HW dashboard within 3 seconds on a 3G connection (target). |
| NFR-008 | Database timestamps are stored in UTC. |

---

## 5. Business Rules

### Alert Thresholds (defaults, configurable via clinical rule versions)

| Vital | Condition | Alert Level |
|---|---|---|
| BP | Systolic >= 160 or Diastolic >= 110 | HIGH |
| BP (maternal) | Systolic >= 140 or Diastolic >= 90 **with symptoms** | HIGH |
| BP | Systolic >= 140 and rising across 3 consecutive readings | REVIEW |
| SpO2 | < 92% | HIGH |
| Glucose | >= 250 mg/dL or < 70 mg/dL | REVIEW |
| Temperature | >= 38.5 C | REVIEW |
| Heart Rate | > 120 bpm or < 50 bpm | REVIEW |
| Screening | Any completed mental-health screening | PRIVATE |

### Referral States

```
PENDING -> ACCEPTED -> COMPLETED
PENDING -> CANCELLED
ACCEPTED -> CANCELLED
```

### Alert States

```
OPEN -> IN_REVIEW -> REVIEWED
OPEN -> IN_REVIEW -> DISMISSED
OPEN -> REVIEWED
OPEN -> DISMISSED
```

### Screening Privacy

- Screening sessions default to `privacyLevel = PRIVATE`.
- Screening answers are only accessible to users with the `screening:read_private` permission.
- Alerts generated from screenings use the PRIVATE level and do not expose questionnaire answers.

---

## 6. Privacy Classifications

| Classification | Fields | Access |
|---|---|---|
| PHI (Protected Health Information) | Patient name, DOB, location, medical info, consultation notes | Role-restricted; audit-logged on access |
| Sensitive | Screening answers and scores | Requires `screening:read_private`; PRIVATE alert level |
| Internal | Observation values, alert details | Accessible to assigned HW and reviewing Doctor |
| Public | Facility names, observation type catalogs, symptom catalogs | All authenticated users |

---

## 7. Scope

### In Scope

- Patient registration and management
- Vital-sign observation recording with symptom tagging
- Versioned mental-health screening questionnaires
- Configurable, versioned clinical alert rules
- Teleconsultation notes and recommendations
- Facility-to-facility referral workflow
- Offline-first data entry with sync queue
- Role-based access control (HW, Doctor, Admin)
- Audit logging
- Synthetic data seeding for development

### Out of Scope

- Video/audio teleconsultation
- SMS/WhatsApp notifications
- Integration with external EMR/EHR systems
- Multi-language UI (Urdu localization deferred)
- Prescription management
- Lab order management
- Billing and insurance
- Mobile native app (PWA only)
