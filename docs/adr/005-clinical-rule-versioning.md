# ADR-005: Versioned Clinical Alert Rules

**Status:** Accepted
**Date:** 2026-11-19
**Deciders:** Engineering team

## Context

The system evaluates clinical rules against patient observations to generate alerts (e.g., "BP systolic >= 160 triggers a HIGH alert"). These thresholds may change over time as clinical guidelines evolve or as the organization adjusts sensitivity. When a threshold changes, we need to know which version of the rule generated each historical alert.

## Decision

We will use a **two-table versioning model** for clinical rules:

- `ClinicalRuleDefinition` -- the stable identity of a rule (e.g., `BP_HIGH_REVIEW`).
- `ClinicalRuleVersion` -- a versioned snapshot of the rule's configuration (thresholds, conditions) stored as JSON in the `config` column. Each version has a monotonically increasing `version` number and an `isActive` flag.

Each `Alert` links to a specific `ClinicalRuleVersion`, not to the definition. This creates an immutable audit trail from alert back to the exact thresholds that produced it.

The `evaluateObservation` function in `src/modules/alerts/domain/alert-rules.ts` accepts a `Thresholds` object (defaulting to `DEFAULT_THRESHOLDS`) that is loaded from the active `ClinicalRuleVersion` at runtime.

## Rationale

- **Auditability.** Linking alerts to a specific rule version means we can always answer: "What threshold generated this alert?" This is critical for clinical decision support systems.
- **Safe updates.** Changing a threshold creates a new version. The old version remains linked to its historical alerts. No data is modified in place.
- **Configurability.** Admins can adjust thresholds without code changes by creating a new version and deactivating the old one.
- **Testability.** The `evaluateObservation` function is a pure function that accepts thresholds as a parameter, making it straightforward to test with different configurations.

## Default Thresholds

| Rule | Condition | Level |
|---|---|---|
| `BP_HIGH_REVIEW` | Systolic >= 160 or Diastolic >= 110 | HIGH |
| `BP_PREGNANCY_SYMPTOMS` | Systolic >= 140 or Diastolic >= 90 (maternal pathway + symptoms) | HIGH |
| `BP_WORSENING_TREND` | Systolic >= 140 and rising across 3 consecutive readings | REVIEW |
| `SPO2_LOW` | SpO2 < 92% | HIGH |
| `GLUCOSE_ABNORMAL` | Glucose >= 250 or < 70 mg/dL | REVIEW |
| `TEMP_HIGH` | Temperature >= 38.5 C | REVIEW |
| `HR_ABNORMAL` | Heart rate > 120 or < 50 bpm | REVIEW |
| `SCREENING_REVIEW` | Any completed mental-health screening | PRIVATE |

## Consequences

- **Positive:** Full traceability from alert to rule version. Safe threshold changes. No historical data mutation.
- **Negative:** Querying "all alerts for rule X" requires joining through the version table. Creating a new version requires deactivating the old one (admin operation).
- **Mitigated by:** Indexes on `[ruleId, version]` and `[patientId, ruleVersionId, status]` for efficient lookups.
