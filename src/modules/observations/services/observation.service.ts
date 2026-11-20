import { prisma } from "@/shared/db/client";
import type { AuthorizationContext } from "@/shared/auth/types";
import { requirePermission, requireFacilityAccess } from "@/shared/auth/authorization";
import { PERMISSIONS } from "@/shared/auth/types";
import { createAuditEvent } from "@/modules/audit/services/audit.service";
import { evaluateObservation, type BpHistory } from "@/modules/alerts/domain/alert-rules";
import { NotFoundError } from "@/shared/errors";

interface CreateObservationInput {
  patientId: string;
  typeCode: string;
  value: Record<string, number>;
  source: string;
  symptoms?: string[];
  notes?: string;
  observedAt?: string;
  facilityId: string;
  idempotencyKey?: string;
}

export async function createObservation(
  ctx: AuthorizationContext,
  input: CreateObservationInput
) {
  requirePermission(ctx, PERMISSIONS.OBSERVATION_CREATE);
  requireFacilityAccess(ctx, input.facilityId);

  // Check idempotency
  if (input.idempotencyKey) {
    const existing = await prisma.idempotencyReceipt.findUnique({
      where: { key: input.idempotencyKey },
    });
    if (existing) {
      return existing.response as Record<string, unknown>;
    }
  }

  // Validate patient exists and is accessible
  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId, deletedAt: null },
    include: {
      facilityAssignments: true,
      patientPathways: { include: { pathway: true }, where: { isActive: true } },
    },
  });
  if (!patient) throw new NotFoundError("Patient", input.patientId);

  // Validate observation type
  const obsType = await prisma.observationType.findUnique({
    where: { code: input.typeCode },
  });
  if (!obsType) throw new NotFoundError("Observation type", input.typeCode);

  // Validate symptoms exist
  let symptomRecords: { id: string; code: string; name: string }[] = [];
  if (input.symptoms?.length) {
    symptomRecords = await prisma.symptomCatalog.findMany({
      where: { id: { in: input.symptoms } },
    });
  }

  const observedAt = input.observedAt ? new Date(input.observedAt) : new Date();

  const result = await prisma.$transaction(async (tx) => {
    // Create observation
    const observation = await tx.observation.create({
      data: {
        patientId: input.patientId,
        typeId: obsType.id,
        value: input.value,
        unit: obsType.unit,
        observedAt,
        source: input.source,
        notes: input.notes,
        facilityId: input.facilityId,
        recordedById: ctx.userId,
        idempotencyKey: input.idempotencyKey,
        symptoms: {
          create: symptomRecords.map((s) => ({
            symptomId: s.id,
          })),
        },
      },
    });

    // Evaluate alert rules
    const pathway = patient.patientPathways[0]?.pathway.code ?? "chronic";
    const pregnancyWeeks = patient.patientPathways[0]?.pregnancyWeeks;

    // Get recent BP history for trend detection
    let recentBpHistory: BpHistory[] = [];
    if (input.typeCode === "bp") {
      const recentBp = await tx.observation.findMany({
        where: {
          patientId: input.patientId,
          type: { code: "bp" },
        },
        orderBy: { observedAt: "asc" },
        take: 10,
        select: { value: true, observedAt: true },
      });
      recentBpHistory = recentBp.map((o) => ({
        systolic: (o.value as Record<string, number>).systolic,
        observedAt: o.observedAt,
      }));
    }

    const alertEvals = evaluateObservation(
      { id: patient.id, pathway, pregnancyWeeks },
      {
        id: observation.id,
        typeCode: input.typeCode,
        value: input.value as { systolic: number; diastolic: number } | { value: number },
        symptoms: symptomRecords.map((s) => s.name),
        observedAt,
      },
      recentBpHistory
    );

    // Create alerts (avoid duplicates for same rule/episode)
    const createdAlerts = [];
    for (const alertEval of alertEvals) {
      // Check for existing open alert with same rule for this patient
      const ruleVersion = await tx.clinicalRuleVersion.findFirst({
        where: {
          rule: { code: alertEval.ruleCode },
          isActive: true,
        },
        include: { rule: true },
      });

      if (!ruleVersion) continue;

      const existingOpen = await tx.alert.findFirst({
        where: {
          patientId: patient.id,
          ruleVersionId: ruleVersion.id,
          status: { in: ["OPEN", "IN_REVIEW"] },
        },
      });

      if (existingOpen) continue; // Don't duplicate

      const alert = await tx.alert.create({
        data: {
          patientId: patient.id,
          ruleVersionId: ruleVersion.id,
          level: alertEval.level,
          issue: alertEval.issue,
          detail: alertEval.detail,
          rationale: alertEval.rationale,
          evaluatedAt: new Date(),
          observations: {
            create: alertEval.observationIds.map((obsId) => ({
              observationId: obsId,
            })),
          },
        },
      });

      createdAlerts.push(alert);
    }

    // Store idempotency receipt
    if (input.idempotencyKey) {
      await tx.idempotencyReceipt.create({
        data: {
          key: input.idempotencyKey,
          userId: ctx.userId,
          endpoint: "POST /api/v1/observations",
          statusCode: 201,
          response: {
            id: observation.id,
            alerts: createdAlerts.map((a) => ({ id: a.id, level: a.level, issue: a.issue })),
          },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }

    return {
      observation: {
        id: observation.id,
        typeCode: input.typeCode,
        value: input.value,
        unit: obsType.unit,
        observedAt: observation.observedAt,
      },
      alerts: createdAlerts.map((a) => ({
        id: a.id,
        level: a.level,
        issue: a.issue,
        detail: a.detail,
        rationale: a.rationale,
      })),
    };
  });

  await createAuditEvent({
    actorId: ctx.userId,
    action: "observation:create",
    resourceType: "observation",
    resourceId: result.observation.id,
    facilityId: input.facilityId,
    outcome: "SUCCESS",
    metadata: {
      patientId: input.patientId,
      typeCode: input.typeCode,
      alertsCreated: result.alerts.length,
    },
  });

  return result;
}
