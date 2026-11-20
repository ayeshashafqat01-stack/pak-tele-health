import { z } from "zod";

// ---- Patient ----
export const patientCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  age: z.number().int().min(0).max(150).optional(),
  dateOfBirth: z.string().datetime().optional(),
  sex: z.enum(["Male", "Female"]),
  location: z.string().min(1, "Location is required").max(500),
  pathway: z.enum(["maternal", "chronic", "mental"]),
  pregnancyWeeks: z.number().int().min(1).max(45).optional(),
  medicalInfo: z.string().max(5000).optional(),
  consentGiven: z.boolean().default(false),
  facilityId: z.string().uuid(),
  idempotencyKey: z.string().uuid().optional(),
}).refine(
  (data) => data.age !== undefined || data.dateOfBirth !== undefined,
  { message: "Either age or date of birth is required", path: ["age"] }
).refine(
  (data) => data.pathway !== "maternal" || data.pregnancyWeeks !== undefined,
  { message: "Pregnancy weeks required for maternal pathway", path: ["pregnancyWeeks"] }
);

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;

// ---- Observation ----
const bpValueSchema = z.object({
  systolic: z.number().int().min(40, "Systolic too low").max(300, "Systolic too high"),
  diastolic: z.number().int().min(20, "Diastolic too low").max(200, "Diastolic too high"),
});

const singleValueSchema = z.object({
  value: z.number().min(0),
});

export const observationCreateSchema = z.object({
  patientId: z.string().uuid(),
  typeCode: z.enum(["bp", "hr", "spo2", "temp", "glu"]),
  value: z.union([bpValueSchema, singleValueSchema]),
  source: z.string().min(1).max(100),
  symptoms: z.array(z.string().uuid()).optional(),
  notes: z.string().max(2000).optional(),
  observedAt: z.string().datetime().optional(),
  facilityId: z.string().uuid(),
  idempotencyKey: z.string().uuid().optional(),
});

export type ObservationCreateInput = z.infer<typeof observationCreateSchema>;

// Physiologically plausible ranges (wider than alert thresholds)
export const PLAUSIBLE_RANGES: Record<string, { min: number; max: number }> = {
  bp_systolic: { min: 40, max: 300 },
  bp_diastolic: { min: 20, max: 200 },
  hr: { min: 20, max: 250 },
  spo2: { min: 30, max: 100 },
  temp: { min: 25, max: 45 },
  glu: { min: 10, max: 800 },
};

// ---- Screening ----
export const screeningCreateSchema = z.object({
  patientId: z.string().uuid(),
  versionId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      optionId: z.string().uuid(),
    })
  ).min(1, "All questions must be answered"),
  idempotencyKey: z.string().uuid().optional(),
});

export type ScreeningCreateInput = z.infer<typeof screeningCreateSchema>;

// ---- Consultation ----
export const consultationCreateSchema = z.object({
  patientId: z.string().uuid(),
  kind: z.enum(["consultation", "counselling"]),
  notes: z.string().min(1, "Notes are required").max(10000),
  recommendation: z.string().max(500).optional(),
  referral: z
    .object({
      destFacilityId: z.string().uuid(),
      priority: z.enum(["HIGH", "MEDIUM", "ROUTINE"]),
    })
    .optional(),
  alertIds: z.array(z.string().uuid()).optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export type ConsultationCreateInput = z.infer<typeof consultationCreateSchema>;

// ---- Referral transition ----
export const referralTransitionSchema = z.object({
  toStatus: z.enum(["ACCEPTED", "COMPLETED", "CANCELLED"]),
  reason: z.string().max(1000).optional(),
});

export type ReferralTransitionInput = z.infer<typeof referralTransitionSchema>;

// ---- Login ----
export const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});
