-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(36) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" VARCHAR(36) NOT NULL,
    "permission_id" VARCHAR(36) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" VARCHAR(36) NOT NULL,
    "role_id" VARCHAR(36) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_account_id" VARCHAR(255) NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" VARCHAR(50),
    "scope" VARCHAR(255),
    "id_token" TEXT,
    "session_state" VARCHAR(255),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" VARCHAR(36) NOT NULL,
    "session_token" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" VARCHAR(36) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "location" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_facility_assignments" (
    "user_id" VARCHAR(36) NOT NULL,
    "facility_id" VARCHAR(36) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_facility_assignments_pkey" PRIMARY KEY ("user_id","facility_id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" VARCHAR(36) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "date_of_birth" DATE,
    "age" INTEGER,
    "sex" VARCHAR(20) NOT NULL,
    "location" VARCHAR(500),
    "medical_info" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" VARCHAR(36),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_facility_assignments" (
    "id" VARCHAR(36) NOT NULL,
    "patient_id" VARCHAR(36) NOT NULL,
    "facility_id" VARCHAR(36) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_facility_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_pathways" (
    "id" VARCHAR(36) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),

    CONSTRAINT "care_pathways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_pathways" (
    "id" VARCHAR(36) NOT NULL,
    "patient_id" VARCHAR(36) NOT NULL,
    "pathway_id" VARCHAR(36) NOT NULL,
    "pregnancy_weeks" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "patient_pathways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observation_types" (
    "id" VARCHAR(36) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "unit" VARCHAR(30) NOT NULL,
    "min_value" DECIMAL(10,2),
    "max_value" DECIMAL(10,2),
    "components" JSONB,

    CONSTRAINT "observation_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" VARCHAR(36) NOT NULL,
    "patient_id" VARCHAR(36) NOT NULL,
    "type_id" VARCHAR(36) NOT NULL,
    "value" JSONB NOT NULL,
    "unit" VARCHAR(30) NOT NULL,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "notes" TEXT,
    "facility_id" VARCHAR(36),
    "recorded_by_id" VARCHAR(36),
    "idempotency_key" VARCHAR(36),
    "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
    "is_amended" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_catalog" (
    "id" VARCHAR(36) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "symptom_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observation_symptoms" (
    "observation_id" VARCHAR(36) NOT NULL,
    "symptom_id" VARCHAR(36) NOT NULL,

    CONSTRAINT "observation_symptoms_pkey" PRIMARY KEY ("observation_id","symptom_id")
);

-- CreateTable
CREATE TABLE "observation_amendments" (
    "id" VARCHAR(36) NOT NULL,
    "observation_id" VARCHAR(36) NOT NULL,
    "previous_value" JSONB NOT NULL,
    "new_value" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "amended_by_id" VARCHAR(36) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observation_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_definitions" (
    "id" VARCHAR(36) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "privacy_level" VARCHAR(30) NOT NULL DEFAULT 'PRIVATE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_versions" (
    "id" VARCHAR(36) NOT NULL,
    "questionnaire_id" VARCHAR(36) NOT NULL,
    "version_number" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_questions" (
    "id" VARCHAR(36) NOT NULL,
    "version_id" VARCHAR(36) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "questionnaire_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_options" (
    "id" VARCHAR(36) NOT NULL,
    "question_id" VARCHAR(36) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "text" VARCHAR(255) NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "questionnaire_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_sessions" (
    "id" VARCHAR(36) NOT NULL,
    "patient_id" VARCHAR(36) NOT NULL,
    "version_id" VARCHAR(36) NOT NULL,
    "recorded_by_id" VARCHAR(36),
    "privacy_level" VARCHAR(30) NOT NULL DEFAULT 'PRIVATE',
    "status" VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    "completed_at" TIMESTAMP(3),
    "idempotency_key" VARCHAR(36),
    "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screening_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_answers" (
    "id" VARCHAR(36) NOT NULL,
    "session_id" VARCHAR(36) NOT NULL,
    "question_id" VARCHAR(36) NOT NULL,
    "option_id" VARCHAR(36) NOT NULL,

    CONSTRAINT "screening_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_rule_definitions" (
    "id" VARCHAR(36) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_rule_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_rule_versions" (
    "id" VARCHAR(36) NOT NULL,
    "rule_id" VARCHAR(36) NOT NULL,
    "version" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(36),

    CONSTRAINT "clinical_rule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" VARCHAR(36) NOT NULL,
    "patient_id" VARCHAR(36) NOT NULL,
    "rule_version_id" VARCHAR(36) NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "issue" VARCHAR(255) NOT NULL,
    "detail" TEXT,
    "rationale" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "evaluated_at" TIMESTAMP(3) NOT NULL,
    "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_observations" (
    "alert_id" VARCHAR(36) NOT NULL,
    "observation_id" VARCHAR(36) NOT NULL,

    CONSTRAINT "alert_observations_pkey" PRIMARY KEY ("alert_id","observation_id")
);

-- CreateTable
CREATE TABLE "alert_status_history" (
    "id" VARCHAR(36) NOT NULL,
    "alert_id" VARCHAR(36) NOT NULL,
    "from_status" VARCHAR(20) NOT NULL,
    "to_status" VARCHAR(20) NOT NULL,
    "reason" TEXT,
    "actor_id" VARCHAR(36) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" VARCHAR(36) NOT NULL,
    "patient_id" VARCHAR(36) NOT NULL,
    "doctor_id" VARCHAR(36) NOT NULL,
    "kind" VARCHAR(30) NOT NULL,
    "notes" TEXT,
    "recommendation" VARCHAR(500),
    "idempotency_key" VARCHAR(36),
    "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" VARCHAR(36) NOT NULL,
    "consultation_id" VARCHAR(36) NOT NULL,
    "patient_id" VARCHAR(36) NOT NULL,
    "source_facility_id" VARCHAR(36) NOT NULL,
    "dest_facility_id" VARCHAR(36) NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "cancel_reason" TEXT,
    "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_status_history" (
    "id" VARCHAR(36) NOT NULL,
    "referral_id" VARCHAR(36) NOT NULL,
    "from_status" VARCHAR(20) NOT NULL,
    "to_status" VARCHAR(20) NOT NULL,
    "reason" TEXT,
    "actor_id" VARCHAR(36) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_receipts" (
    "key" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "endpoint" VARCHAR(255) NOT NULL,
    "status_code" INTEGER NOT NULL,
    "response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_receipts_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" VARCHAR(36) NOT NULL,
    "actor_id" VARCHAR(36),
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "resource_id" VARCHAR(36),
    "facility_id" VARCHAR(36),
    "outcome" VARCHAR(20) NOT NULL,
    "metadata" JSONB,
    "request_id" VARCHAR(36),
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_code_key" ON "facilities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "patients_code_key" ON "patients"("code");

-- CreateIndex
CREATE INDEX "patients_code_idx" ON "patients"("code");

-- CreateIndex
CREATE INDEX "patients_name_idx" ON "patients"("name");

-- CreateIndex
CREATE INDEX "patients_status_idx" ON "patients"("status");

-- CreateIndex
CREATE INDEX "patient_facility_assignments_facility_id_patient_id_idx" ON "patient_facility_assignments"("facility_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_facility_assignments_patient_id_facility_id_key" ON "patient_facility_assignments"("patient_id", "facility_id");

-- CreateIndex
CREATE UNIQUE INDEX "care_pathways_code_key" ON "care_pathways"("code");

-- CreateIndex
CREATE INDEX "patient_pathways_patient_id_idx" ON "patient_pathways"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_pathways_patient_id_pathway_id_key" ON "patient_pathways"("patient_id", "pathway_id");

-- CreateIndex
CREATE UNIQUE INDEX "observation_types_code_key" ON "observation_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "observations_idempotency_key_key" ON "observations"("idempotency_key");

-- CreateIndex
CREATE INDEX "observations_patient_id_type_id_observed_at_idx" ON "observations"("patient_id", "type_id", "observed_at");

-- CreateIndex
CREATE INDEX "observations_patient_id_observed_at_idx" ON "observations"("patient_id", "observed_at");

-- CreateIndex
CREATE INDEX "observations_facility_id_idx" ON "observations"("facility_id");

-- CreateIndex
CREATE UNIQUE INDEX "symptom_catalog_code_key" ON "symptom_catalog"("code");

-- CreateIndex
CREATE INDEX "observation_amendments_observation_id_idx" ON "observation_amendments"("observation_id");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_definitions_code_key" ON "questionnaire_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_versions_questionnaire_id_version_number_key" ON "questionnaire_versions"("questionnaire_id", "version_number");

-- CreateIndex
CREATE INDEX "questionnaire_questions_version_id_sort_order_idx" ON "questionnaire_questions"("version_id", "sort_order");

-- CreateIndex
CREATE INDEX "questionnaire_options_question_id_sort_order_idx" ON "questionnaire_options"("question_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "screening_sessions_idempotency_key_key" ON "screening_sessions"("idempotency_key");

-- CreateIndex
CREATE INDEX "screening_sessions_patient_id_idx" ON "screening_sessions"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "screening_answers_session_id_question_id_key" ON "screening_answers"("session_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_rule_definitions_code_key" ON "clinical_rule_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_rule_versions_rule_id_version_key" ON "clinical_rule_versions"("rule_id", "version");

-- CreateIndex
CREATE INDEX "alerts_patient_id_status_idx" ON "alerts"("patient_id", "status");

-- CreateIndex
CREATE INDEX "alerts_status_level_idx" ON "alerts"("status", "level");

-- CreateIndex
CREATE INDEX "alerts_patient_id_rule_version_id_status_idx" ON "alerts"("patient_id", "rule_version_id", "status");

-- CreateIndex
CREATE INDEX "alert_status_history_alert_id_idx" ON "alert_status_history"("alert_id");

-- CreateIndex
CREATE UNIQUE INDEX "consultations_idempotency_key_key" ON "consultations"("idempotency_key");

-- CreateIndex
CREATE INDEX "consultations_patient_id_idx" ON "consultations"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_consultation_id_key" ON "referrals"("consultation_id");

-- CreateIndex
CREATE INDEX "referrals_patient_id_status_idx" ON "referrals"("patient_id", "status");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE INDEX "referral_status_history_referral_id_idx" ON "referral_status_history"("referral_id");

-- CreateIndex
CREATE INDEX "idempotency_receipts_user_id_idx" ON "idempotency_receipts"("user_id");

-- CreateIndex
CREATE INDEX "idempotency_receipts_expires_at_idx" ON "idempotency_receipts"("expires_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_id_idx" ON "audit_events"("actor_id");

-- CreateIndex
CREATE INDEX "audit_events_resource_type_resource_id_idx" ON "audit_events"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_events_action_idx" ON "audit_events"("action");

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

-- CreateIndex
CREATE INDEX "audit_events_facility_id_created_at_idx" ON "audit_events"("facility_id", "created_at");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_facility_assignments" ADD CONSTRAINT "user_facility_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_facility_assignments" ADD CONSTRAINT "user_facility_assignments_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_facility_assignments" ADD CONSTRAINT "patient_facility_assignments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_facility_assignments" ADD CONSTRAINT "patient_facility_assignments_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_pathways" ADD CONSTRAINT "patient_pathways_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_pathways" ADD CONSTRAINT "patient_pathways_pathway_id_fkey" FOREIGN KEY ("pathway_id") REFERENCES "care_pathways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "observation_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_symptoms" ADD CONSTRAINT "observation_symptoms_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_symptoms" ADD CONSTRAINT "observation_symptoms_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "symptom_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_amendments" ADD CONSTRAINT "observation_amendments_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_versions" ADD CONSTRAINT "questionnaire_versions_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaire_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "questionnaire_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_options" ADD CONSTRAINT "questionnaire_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questionnaire_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_sessions" ADD CONSTRAINT "screening_sessions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_sessions" ADD CONSTRAINT "screening_sessions_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "questionnaire_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_sessions" ADD CONSTRAINT "screening_sessions_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_answers" ADD CONSTRAINT "screening_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "screening_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_answers" ADD CONSTRAINT "screening_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questionnaire_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_answers" ADD CONSTRAINT "screening_answers_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "questionnaire_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_rule_versions" ADD CONSTRAINT "clinical_rule_versions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "clinical_rule_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_rule_version_id_fkey" FOREIGN KEY ("rule_version_id") REFERENCES "clinical_rule_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_observations" ADD CONSTRAINT "alert_observations_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_observations" ADD CONSTRAINT "alert_observations_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "observations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_status_history" ADD CONSTRAINT "alert_status_history_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_status_history" ADD CONSTRAINT "alert_status_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_source_facility_id_fkey" FOREIGN KEY ("source_facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_dest_facility_id_fkey" FOREIGN KEY ("dest_facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_status_history" ADD CONSTRAINT "referral_status_history_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_status_history" ADD CONSTRAINT "referral_status_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
