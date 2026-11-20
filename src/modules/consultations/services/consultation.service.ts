import { prisma } from "@/shared/db/client";
import type { AuthorizationContext } from "@/shared/auth/types";
import { requirePermission, requireRole } from "@/shared/auth/authorization";
import { PERMISSIONS } from "@/shared/auth/types";
import { createAuditEvent } from "@/modules/audit/services/audit.service";
import { NotFoundError, ValidationError } from "@/shared/errors";
import { validateAlertTransition, validateReferralTransition } from "@/modules/alerts/domain/alert-rules";

interface CreateConsultationInput {
  patientId: string;
  kind: string;
  notes: string;
  recommendation?: string;
  referral?: {
    destFacilityId: string;
    priority: string;
  };
  alertIds?: string[];
  idempotencyKey?: string;
}

export async function createConsultation(
  ctx: AuthorizationContext,
  input: CreateConsultationInput
) {
  // For counselling requests from HW, only need basic permission
  if (input.kind === "consultation") {
    requireRole(ctx, "DOCTOR");
    requirePermission(ctx, PERMISSIONS.CONSULTATION_CREATE);
  }

  // Check idempotency
  if (input.idempotencyKey) {
    const existing = await prisma.idempotencyReceipt.findUnique({
      where: { key: input.idempotencyKey },
    });
    if (existing) {
      return existing.response as Record<string, unknown>;
    }
  }

  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId, deletedAt: null },
    include: { facilityAssignments: true },
  });
  if (!patient) throw new NotFoundError("Patient", input.patientId);

  const sourceFacilityId = patient.facilityAssignments[0]?.facilityId;

  const result = await prisma.$transaction(async (tx) => {
    const consultation = await tx.consultation.create({
      data: {
        patientId: input.patientId,
        doctorId: ctx.userId,
        kind: input.kind,
        notes: input.notes,
        recommendation: input.recommendation,
        idempotencyKey: input.idempotencyKey,
      },
    });

    let referral = null;
    if (input.referral && sourceFacilityId) {
      requirePermission(ctx, PERMISSIONS.REFERRAL_CREATE);

      referral = await tx.referral.create({
        data: {
          consultationId: consultation.id,
          patientId: input.patientId,
          sourceFacilityId,
          destFacilityId: input.referral.destFacilityId,
          priority: input.referral.priority,
          status: "PENDING",
          statusHistory: {
            create: {
              fromStatus: "NONE",
              toStatus: "PENDING",
              actorId: ctx.userId,
            },
          },
        },
      });
    }

    // Mark alerts as reviewed
    if (input.alertIds?.length) {
      for (const alertId of input.alertIds) {
        const alert = await tx.alert.findUnique({
          where: { id: alertId },
        });
        if (!alert) continue;

        if (validateAlertTransition(alert.status as "OPEN" | "IN_REVIEW" | "REVIEWED" | "DISMISSED", "REVIEWED")) {
          await tx.alert.update({
            where: { id: alertId },
            data: { status: "REVIEWED" },
          });
          await tx.alertStatusHistory.create({
            data: {
              alertId,
              fromStatus: alert.status,
              toStatus: "REVIEWED",
              reason: `Reviewed during consultation ${consultation.id}`,
              actorId: ctx.userId,
            },
          });
        }
      }
    }

    if (input.idempotencyKey) {
      await tx.idempotencyReceipt.create({
        data: {
          key: input.idempotencyKey,
          userId: ctx.userId,
          endpoint: "POST /api/v1/consultations",
          statusCode: 201,
          response: {
            id: consultation.id,
            referralId: referral?.id,
          },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }

    return { id: consultation.id, referralId: referral?.id };
  });

  await createAuditEvent({
    actorId: ctx.userId,
    action: "consultation:create",
    resourceType: "consultation",
    resourceId: result.id,
    outcome: "SUCCESS",
    metadata: {
      patientId: input.patientId,
      kind: input.kind,
      hasReferral: !!result.referralId,
    },
  });

  return result;
}

export async function transitionReferral(
  ctx: AuthorizationContext,
  referralId: string,
  toStatus: string,
  reason?: string
) {
  requirePermission(ctx, PERMISSIONS.REFERRAL_TRANSITION);

  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
  });
  if (!referral) throw new NotFoundError("Referral", referralId);

  const currentStatus = referral.status as "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED";
  const targetStatus = toStatus as "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED";

  if (!validateReferralTransition(currentStatus, targetStatus)) {
    throw new ValidationError(
      `Invalid transition from ${currentStatus} to ${toStatus}`
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.referral.update({
      where: { id: referralId },
      data: {
        status: toStatus,
        cancelReason: toStatus === "CANCELLED" ? reason : undefined,
      },
    });

    await tx.referralStatusHistory.create({
      data: {
        referralId,
        fromStatus: currentStatus,
        toStatus,
        reason,
        actorId: ctx.userId,
      },
    });
  });

  await createAuditEvent({
    actorId: ctx.userId,
    action: "referral:transition",
    resourceType: "referral",
    resourceId: referralId,
    outcome: "SUCCESS",
    metadata: { from: currentStatus, to: toStatus },
  });

  return { status: toStatus };
}
