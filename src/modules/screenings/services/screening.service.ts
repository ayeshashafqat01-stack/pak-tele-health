import { prisma } from "@/shared/db/client";
import type { AuthorizationContext } from "@/shared/auth/types";
import { requirePermission } from "@/shared/auth/authorization";
import { PERMISSIONS } from "@/shared/auth/types";
import { createAuditEvent } from "@/modules/audit/services/audit.service";
import { NotFoundError, ValidationError } from "@/shared/errors";

interface CreateScreeningInput {
  patientId: string;
  versionId: string;
  answers: Array<{ questionId: string; optionId: string }>;
  idempotencyKey?: string;
}

export async function createScreening(
  ctx: AuthorizationContext,
  input: CreateScreeningInput
) {
  requirePermission(ctx, PERMISSIONS.SCREENING_CREATE);

  // Check idempotency
  if (input.idempotencyKey) {
    const existing = await prisma.idempotencyReceipt.findUnique({
      where: { key: input.idempotencyKey },
    });
    if (existing) {
      return existing.response as Record<string, unknown>;
    }
  }

  // Validate patient
  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId, deletedAt: null },
  });
  if (!patient) throw new NotFoundError("Patient", input.patientId);

  // Validate version and questions
  const version = await prisma.questionnaireVersion.findUnique({
    where: { id: input.versionId },
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
        include: { options: true },
      },
    },
  });
  if (!version) throw new NotFoundError("Questionnaire version", input.versionId);

  // Validate all required questions are answered
  const requiredQuestions = version.questions.filter((q) => q.isRequired);
  const answeredQuestionIds = new Set(input.answers.map((a) => a.questionId));
  for (const q of requiredQuestions) {
    if (!answeredQuestionIds.has(q.id)) {
      throw new ValidationError(`All questions must be answered. Missing: ${q.text}`);
    }
  }

  // Validate each answer option belongs to its question
  for (const answer of input.answers) {
    const question = version.questions.find((q) => q.id === answer.questionId);
    if (!question) throw new ValidationError(`Invalid question: ${answer.questionId}`);
    const option = question.options.find((o) => o.id === answer.optionId);
    if (!option) throw new ValidationError(`Invalid option for question: ${answer.questionId}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.screeningSession.create({
      data: {
        patientId: input.patientId,
        versionId: input.versionId,
        recordedById: ctx.userId,
        privacyLevel: "PRIVATE",
        status: "COMPLETED",
        completedAt: new Date(),
        idempotencyKey: input.idempotencyKey,
        answers: {
          create: input.answers.map((a) => ({
            questionId: a.questionId,
            optionId: a.optionId,
          })),
        },
      },
    });

    // Create private review alert
    const screeningRule = await tx.clinicalRuleVersion.findFirst({
      where: {
        rule: { code: "SCREENING_REVIEW" },
        isActive: true,
      },
    });

    let alert = null;
    if (screeningRule) {
      // Check no existing open alert for same rule
      const existingOpen = await tx.alert.findFirst({
        where: {
          patientId: input.patientId,
          ruleVersionId: screeningRule.id,
          status: { in: ["OPEN", "IN_REVIEW"] },
        },
      });

      if (!existingOpen) {
        alert = await tx.alert.create({
          data: {
            patientId: input.patientId,
            ruleVersionId: screeningRule.id,
            level: "PRIVATE",
            issue: "Mental-health screening",
            detail: "Private screening completed.",
            rationale:
              "Every completed screening requires professional review. This is not a diagnosis.",
            evaluatedAt: new Date(),
          },
        });
      }
    }

    if (input.idempotencyKey) {
      await tx.idempotencyReceipt.create({
        data: {
          key: input.idempotencyKey,
          userId: ctx.userId,
          endpoint: "POST /api/v1/screenings",
          statusCode: 201,
          response: { id: session.id, alertId: alert?.id },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }

    return { id: session.id, alertId: alert?.id };
  });

  await createAuditEvent({
    actorId: ctx.userId,
    action: "screening:create",
    resourceType: "screening_session",
    resourceId: result.id,
    outcome: "SUCCESS",
    metadata: { patientId: input.patientId },
  });

  return result;
}

export async function getQuestionnaireVersion(ctx: AuthorizationContext) {
  // Get the active mental health screening questionnaire
  const version = await prisma.questionnaireVersion.findFirst({
    where: { isActive: true },
    include: {
      questionnaire: true,
      questions: {
        orderBy: { sortOrder: "asc" },
        include: { options: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!version) throw new NotFoundError("Active questionnaire version");
  return version;
}
