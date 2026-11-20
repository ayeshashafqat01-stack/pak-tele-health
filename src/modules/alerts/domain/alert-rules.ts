/**
 * Clinical Alert Rule Evaluation Service
 *
 * IMPORTANT: This is clinical decision SUPPORT, not diagnosis.
 * Every alert must include the rule that produced it and state
 * that a clinician makes the clinical decision.
 */

export type AlertLevel = "HIGH" | "REVIEW" | "PRIVATE";
export type AlertStatus = "OPEN" | "IN_REVIEW" | "REVIEWED" | "DISMISSED";

export interface ObservationInput {
  id: string;
  typeCode: string;
  value: BpValue | SingleValue;
  symptoms: string[]; // symptom codes
  observedAt: Date;
}

export interface BpValue {
  systolic: number;
  diastolic: number;
}

export interface SingleValue {
  value: number;
}

export interface PatientContext {
  id: string;
  pathway: string;
  pregnancyWeeks?: number | null;
}

export interface AlertEvaluation {
  level: AlertLevel;
  issue: string;
  detail: string;
  rationale: string;
  ruleCode: string;
  observationIds: string[];
}

export interface BpHistory {
  systolic: number;
  observedAt: Date;
}

function isBpValue(v: BpValue | SingleValue): v is BpValue {
  return "systolic" in v;
}

function isSingleValue(v: BpValue | SingleValue): v is SingleValue {
  return "value" in v && !("systolic" in v);
}

/**
 * Default thresholds — loaded from clinical_rule_versions config in production.
 * These are safe defaults matching the prototype.
 */
export const DEFAULT_THRESHOLDS = {
  bp_high_systolic: 160,
  bp_high_diastolic: 110,
  bp_pregnancy_systolic: 140,
  bp_pregnancy_diastolic: 90,
  bp_worsening_systolic: 140,
  bp_worsening_readings: 3,
  spo2_low: 92,
  glucose_high: 250,
  glucose_low: 70,
  temp_high: 38.5,
  hr_high: 120,
  hr_low: 50,
} as const;

export type Thresholds = typeof DEFAULT_THRESHOLDS;

/**
 * Evaluate all applicable rules for a new observation.
 * Returns alerts to create (may be empty).
 */
export function evaluateObservation(
  patient: PatientContext,
  observation: ObservationInput,
  recentBpHistory: BpHistory[],
  thresholds: Thresholds = DEFAULT_THRESHOLDS
): AlertEvaluation[] {
  const results: AlertEvaluation[] = [];

  if (observation.typeCode === "bp" && isBpValue(observation.value)) {
    const bpAlerts = evaluateBpRules(
      patient,
      observation,
      observation.value,
      recentBpHistory,
      thresholds
    );
    results.push(...bpAlerts);
  }

  if (observation.typeCode === "spo2" && isSingleValue(observation.value)) {
    const spo2Alert = evaluateSpo2Rule(observation, observation.value, thresholds);
    if (spo2Alert) results.push(spo2Alert);
  }

  if (observation.typeCode === "glu" && isSingleValue(observation.value)) {
    const gluAlert = evaluateGlucoseRule(observation, observation.value, thresholds);
    if (gluAlert) results.push(gluAlert);
  }

  if (observation.typeCode === "temp" && isSingleValue(observation.value)) {
    const tempAlert = evaluateTempRule(observation, observation.value, thresholds);
    if (tempAlert) results.push(tempAlert);
  }

  if (observation.typeCode === "hr" && isSingleValue(observation.value)) {
    const hrAlert = evaluateHrRule(observation, observation.value, thresholds);
    if (hrAlert) results.push(hrAlert);
  }

  return results;
}

function evaluateBpRules(
  patient: PatientContext,
  observation: ObservationInput,
  bp: BpValue,
  history: BpHistory[],
  t: Thresholds
): AlertEvaluation[] {
  const alerts: AlertEvaluation[] = [];
  const symptoms = observation.symptoms;
  const detail = `BP ${bp.systolic}/${bp.diastolic} mmHg${symptoms.length ? ` with symptoms: ${symptoms.join(", ")}` : ""}`;

  // Check rising trend: last 3 chronological systolic readings strictly increasing
  const chronological = [...history].sort(
    (a, b) => a.observedAt.getTime() - b.observedAt.getTime()
  );
  const lastThree = chronological.slice(-t.bp_worsening_readings);
  const isRising =
    lastThree.length === t.bp_worsening_readings &&
    lastThree.every((_, i) => i === 0 || lastThree[i].systolic > lastThree[i - 1].systolic);

  // Rule: BP high review (systolic >= 160 or diastolic >= 110)
  if (bp.systolic >= t.bp_high_systolic || bp.diastolic >= t.bp_high_diastolic) {
    let issue = "Abnormal BP";
    if (symptoms.length) issue += " + symptoms";
    if (isRising) issue += " + worsening trend";

    alerts.push({
      level: "HIGH",
      issue,
      detail,
      rationale: `Systolic ${bp.systolic} >= ${t.bp_high_systolic} or diastolic ${bp.diastolic} >= ${t.bp_high_diastolic} mmHg. This is not a diagnosis. The clinician makes the clinical decision.`,
      ruleCode: "BP_HIGH_REVIEW",
      observationIds: [observation.id],
    });
    return alerts; // Don't double-alert for same BP reading
  }

  // Rule: Pregnancy BP with symptoms
  if (
    patient.pathway === "maternal" &&
    (bp.systolic >= t.bp_pregnancy_systolic || bp.diastolic >= t.bp_pregnancy_diastolic) &&
    symptoms.length > 0
  ) {
    alerts.push({
      level: "HIGH",
      issue: "Abnormal BP + symptoms",
      detail,
      rationale: `BP ${bp.systolic}/${bp.diastolic} >= ${t.bp_pregnancy_systolic}/${t.bp_pregnancy_diastolic} in pregnancy with symptoms. This is not a diagnosis. The clinician makes the clinical decision.`,
      ruleCode: "BP_PREGNANCY_SYMPTOMS",
      observationIds: [observation.id],
    });
    return alerts;
  }

  // Rule: Worsening BP trend
  if (bp.systolic >= t.bp_worsening_systolic && isRising) {
    alerts.push({
      level: "REVIEW",
      issue: "Worsening BP trend",
      detail: `${detail}. Systolic rising: ${lastThree.map((h) => h.systolic).join(" -> ")}`,
      rationale: `Systolic >= ${t.bp_worsening_systolic} and strictly rising across the last ${t.bp_worsening_readings} readings. This is not a diagnosis. The clinician makes the clinical decision.`,
      ruleCode: "BP_WORSENING_TREND",
      observationIds: [observation.id],
    });
  }

  return alerts;
}

function evaluateSpo2Rule(
  observation: ObservationInput,
  v: SingleValue,
  t: Thresholds
): AlertEvaluation | null {
  if (v.value < t.spo2_low) {
    return {
      level: "HIGH",
      issue: "Low SpO2",
      detail: `SpO2 ${v.value}%`,
      rationale: `SpO2 ${v.value}% below ${t.spo2_low}%. This is not a diagnosis. The clinician makes the clinical decision.`,
      ruleCode: "SPO2_LOW",
      observationIds: [observation.id],
    };
  }
  return null;
}

function evaluateGlucoseRule(
  observation: ObservationInput,
  v: SingleValue,
  t: Thresholds
): AlertEvaluation | null {
  if (v.value >= t.glucose_high || v.value < t.glucose_low) {
    return {
      level: "REVIEW",
      issue: "Abnormal glucose",
      detail: `Glucose ${v.value} mg/dL`,
      rationale: `Glucose ${v.value} mg/dL ${v.value >= t.glucose_high ? `>= ${t.glucose_high}` : `< ${t.glucose_low}`} mg/dL. This is not a diagnosis. The clinician makes the clinical decision.`,
      ruleCode: "GLUCOSE_ABNORMAL",
      observationIds: [observation.id],
    };
  }
  return null;
}

function evaluateTempRule(
  observation: ObservationInput,
  v: SingleValue,
  t: Thresholds
): AlertEvaluation | null {
  if (v.value >= t.temp_high) {
    return {
      level: "REVIEW",
      issue: "High temperature",
      detail: `Temperature ${v.value} C`,
      rationale: `Temperature ${v.value} C >= ${t.temp_high} C. This is not a diagnosis. The clinician makes the clinical decision.`,
      ruleCode: "TEMP_HIGH",
      observationIds: [observation.id],
    };
  }
  return null;
}

function evaluateHrRule(
  observation: ObservationInput,
  v: SingleValue,
  t: Thresholds
): AlertEvaluation | null {
  if (v.value > t.hr_high || v.value < t.hr_low) {
    return {
      level: "REVIEW",
      issue: "Abnormal heart rate",
      detail: `Heart rate ${v.value} bpm`,
      rationale: `Heart rate ${v.value} bpm ${v.value > t.hr_high ? `> ${t.hr_high}` : `< ${t.hr_low}`} bpm. This is not a diagnosis. The clinician makes the clinical decision.`,
      ruleCode: "HR_ABNORMAL",
      observationIds: [observation.id],
    };
  }
  return null;
}

/** Valid alert status transitions */
const VALID_TRANSITIONS: Record<AlertStatus, AlertStatus[]> = {
  OPEN: ["IN_REVIEW", "REVIEWED", "DISMISSED"],
  IN_REVIEW: ["REVIEWED", "DISMISSED"],
  REVIEWED: [], // terminal
  DISMISSED: [], // terminal
};

export function validateAlertTransition(
  from: AlertStatus,
  to: AlertStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Valid referral status transitions */
export type ReferralStatus = "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED";

const VALID_REFERRAL_TRANSITIONS: Record<ReferralStatus, ReferralStatus[]> = {
  PENDING: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], // terminal
  CANCELLED: [], // terminal
};

export function validateReferralTransition(
  from: ReferralStatus,
  to: ReferralStatus
): boolean {
  return VALID_REFERRAL_TRANSITIONS[from]?.includes(to) ?? false;
}
