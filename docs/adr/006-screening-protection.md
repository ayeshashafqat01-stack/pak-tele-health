# ADR-006: Restricted Mental-Health Screening Data

**Status:** Accepted
**Date:** 2026-11-19
**Deciders:** Engineering team

## Context

Pak-Tele-Health includes mental-health screening questionnaires (e.g., PHQ-9 analogs). Mental-health data carries heightened sensitivity and stigma risk, particularly in the target communities. We needed to decide how to handle the privacy of screening answers and the alerts they generate.

## Decision

We will apply **multi-layered protection** to screening data:

1. **Privacy level on screening sessions.** Every `ScreeningSession` has a `privacyLevel` field that defaults to `PRIVATE`. This is set at creation time and cannot be downgraded.

2. **Dedicated permission for answer access.** Viewing screening answers requires the `screening:read_private` permission, which is distinct from `screening:read_own`. Healthcare Workers can see that a screening was administered (session metadata) but cannot see the answers or scores unless explicitly granted `screening:read_private`.

3. **PRIVATE alert level.** Completed screenings generate an alert with `level = PRIVATE`. These alerts appear on the Doctor dashboard for professional review but do not expose answer content in the alert detail. The alert text reads: "Private screening completed."

4. **Audit logging.** All access to screening sessions and answers is logged in the audit trail, including the accessor's identity and the outcome.

## Rationale

- **Stigma reduction.** In many rural Pakistani communities, mental-health conditions carry significant social stigma. Limiting access to screening answers reduces the risk of inadvertent disclosure by field staff or through shared devices.
- **Need-to-know basis.** The HW's role is to administer the questionnaire, not to interpret results. The Doctor reviews the answers to make clinical decisions. This separation of duties is enforced by distinct permissions.
- **Alert without exposure.** The PRIVATE alert level notifies the Doctor that a screening needs review without embedding sensitive content in a potentially broader-visibility alert list.
- **Regulatory alignment.** Even though Pakistan's data protection framework is evolving, treating mental-health data with elevated controls aligns with international best practices (HIPAA, GDPR special categories).

## Implementation Details

- `ScreeningSession.privacyLevel` defaults to `PRIVATE` in the Prisma schema.
- The screening service (`src/modules/screenings/services/screening.service.ts`) enforces `requirePermission(ctx, PERMISSIONS.SCREENING_CREATE)` for creation and would enforce `PERMISSIONS.SCREENING_READ_PRIVATE` for answer retrieval.
- The alert created on screening completion uses `level: "PRIVATE"` and generic detail text.
- The `QuestionnaireDefinition` model also carries a `privacyLevel` field, allowing future questionnaires to have different visibility defaults.

## Consequences

- **Positive:** Mental-health data has defense-in-depth protection. The permission model is granular enough to support different organizational policies. Audit trail provides accountability.
- **Negative:** Adds complexity to the permission model. HWs cannot review past screening answers for a patient they are treating (by design, but may cause friction).
- **Mitigated by:** Clear UI messaging that screening data is under professional review. The Doctor can share relevant guidance through consultation notes visible to the HW.
