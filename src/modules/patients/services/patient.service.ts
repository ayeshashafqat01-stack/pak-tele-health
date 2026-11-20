import { prisma } from "@/shared/db/client";
import type { AuthorizationContext } from "@/shared/auth/types";
import { requireFacilityAccess, requirePermission } from "@/shared/auth/authorization";
import { PERMISSIONS } from "@/shared/auth/types";
import { createAuditEvent } from "@/modules/audit/services/audit.service";
import { NotFoundError, ConflictError, DuplicateError } from "@/shared/errors";
import { generatePatientCode } from "@/shared/lib/utils";

interface CreatePatientInput {
  name: string;
  age?: number;
  dateOfBirth?: string;
  sex: string;
  location: string;
  pathway: string;
  pregnancyWeeks?: number;
  medicalInfo?: string;
  consentGiven: boolean;
  facilityId?: string;
  idempotencyKey?: string;
}

export async function createPatient(
  ctx: AuthorizationContext,
  input: CreatePatientInput
) {
  requirePermission(ctx, PERMISSIONS.PATIENT_CREATE);

  const facilityId = input.facilityId ?? ctx.facilityIds[0];
  if (!facilityId) throw new Error("No facility assigned");
  requireFacilityAccess(ctx, facilityId);

  // Check idempotency
  if (input.idempotencyKey) {
    const existing = await prisma.idempotencyReceipt.findUnique({
      where: { key: input.idempotencyKey },
    });
    if (existing) {
      return existing.response as Record<string, unknown>;
    }
  }

  // Generate patient code using a sequence approach
  const lastPatient = await prisma.patient.findFirst({
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const lastSeq = lastPatient
    ? parseInt(lastPatient.code.replace("PT-", ""), 10)
    : 100;
  const code = generatePatientCode(lastSeq + 1);

  // Check for potential duplicate
  const duplicate = await prisma.patient.findFirst({
    where: {
      name: input.name,
      sex: input.sex,
      age: input.age,
      deletedAt: null,
    },
  });
  if (duplicate) {
    // Warn but don't block — user may intend to register a different person
    // with the same name
  }

  // Get pathway
  const pathway = await prisma.carePathway.findUnique({
    where: { code: input.pathway },
  });
  if (!pathway) throw new NotFoundError("Care pathway", input.pathway);

  const patient = await prisma.$transaction(async (tx) => {
    const p = await tx.patient.create({
      data: {
        code,
        name: input.name,
        age: input.age,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        sex: input.sex,
        location: input.location,
        medicalInfo: input.medicalInfo,
        consentGiven: input.consentGiven,
        createdBy: ctx.userId,
      },
    });

    await tx.patientFacilityAssignment.create({
      data: {
        patientId: p.id,
        facilityId,
        isPrimary: true,
      },
    });

    await tx.patientPathway.create({
      data: {
        patientId: p.id,
        pathwayId: pathway.id,
        pregnancyWeeks:
          input.pathway === "maternal" ? input.pregnancyWeeks : null,
      },
    });

    // Store idempotency receipt
    if (input.idempotencyKey) {
      await tx.idempotencyReceipt.create({
        data: {
          key: input.idempotencyKey,
          userId: ctx.userId,
          endpoint: "POST /api/v1/patients",
          statusCode: 201,
          response: { id: p.id, code: p.code, name: p.name },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      });
    }

    return p;
  });

  await createAuditEvent({
    actorId: ctx.userId,
    action: "patient:create",
    resourceType: "patient",
    resourceId: patient.id,
    facilityId,
    outcome: "SUCCESS",
    metadata: { code: patient.code, pathway: input.pathway },
  });

  return { id: patient.id, code: patient.code, name: patient.name };
}

export async function getPatient(ctx: AuthorizationContext, patientId: string) {
  requirePermission(ctx, PERMISSIONS.PATIENT_READ);

  const patient = await prisma.patient.findUnique({
    where: { id: patientId, deletedAt: null },
    include: {
      facilityAssignments: { include: { facility: true } },
      patientPathways: {
        include: { pathway: true },
        where: { isActive: true },
      },
      observations: {
        orderBy: { observedAt: "desc" },
        include: {
          type: true,
          symptoms: { include: { symptom: true } },
        },
      },
      alerts: {
        orderBy: { evaluatedAt: "desc" },
        include: {
          ruleVersion: { include: { rule: true } },
          statusHistory: true,
        },
      },
      consultations: {
        orderBy: { createdAt: "desc" },
        include: {
          doctor: { select: { name: true } },
          referral: {
            include: {
              destFacility: true,
              statusHistory: true,
            },
          },
        },
      },
      screeningSessions: {
        orderBy: { createdAt: "desc" },
        include: {
          version: {
            include: {
              questions: {
                orderBy: { sortOrder: "asc" },
                include: { options: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
          answers: {
            include: {
              question: true,
              option: true,
            },
          },
        },
      },
    },
  });

  if (!patient) throw new NotFoundError("Patient", patientId);

  // Check facility access
  const patientFacilityIds = patient.facilityAssignments.map(
    (fa) => fa.facilityId
  );
  const hasAccess =
    ctx.roles.includes("ADMIN") ||
    patientFacilityIds.some((fid) => ctx.facilityIds.includes(fid));
  if (!hasAccess) {
    throw new NotFoundError("Patient", patientId); // Don't reveal existence
  }

  return patient;
}
