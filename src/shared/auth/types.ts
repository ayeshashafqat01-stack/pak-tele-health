export type UserRole = "HEALTHCARE_WORKER" | "DOCTOR" | "ADMIN";

export interface UserFacility {
  id: string;
  code: string;
  name: string;
  isPrimary: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  permissions: string[];
  facilities: UserFacility[];
}

export interface AuthorizationContext {
  userId: string;
  roles: UserRole[];
  permissions: string[];
  facilityIds: string[];
}

export const PERMISSIONS = {
  // Patient
  PATIENT_CREATE: "patient:create",
  PATIENT_READ: "patient:read",
  PATIENT_UPDATE: "patient:update",

  // Observations
  OBSERVATION_CREATE: "observation:create",
  OBSERVATION_READ: "observation:read",
  OBSERVATION_AMEND: "observation:amend",

  // Screenings
  SCREENING_CREATE: "screening:create",
  SCREENING_READ_OWN: "screening:read_own",
  SCREENING_READ_PRIVATE: "screening:read_private", // Restricted

  // Alerts
  ALERT_READ: "alert:read",
  ALERT_REVIEW: "alert:review",

  // Consultations
  CONSULTATION_CREATE: "consultation:create",
  CONSULTATION_READ: "consultation:read",

  // Referrals
  REFERRAL_CREATE: "referral:create",
  REFERRAL_TRANSITION: "referral:transition",
  REFERRAL_READ: "referral:read",

  // Admin
  ADMIN_USERS: "admin:users",
  ADMIN_FACILITIES: "admin:facilities",
  ADMIN_CONFIG: "admin:config",
  ADMIN_AUDIT: "admin:audit",
} as const;
