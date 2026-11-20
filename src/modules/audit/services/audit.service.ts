import { prisma } from "@/shared/db/client";

export interface AuditEventInput {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  facilityId?: string | null;
  outcome: "SUCCESS" | "DENIED" | "ERROR";
  metadata?: Record<string, unknown>;
  requestId?: string | null;
  ipAddress?: string | null;
}

export async function createAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    // Strip sensitive fields from metadata
    const safeMetadata = input.metadata
      ? sanitizeMetadata(input.metadata)
      : undefined;

    await prisma.auditEvent.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        facilityId: input.facilityId ?? null,
        outcome: input.outcome,
        metadata: safeMetadata ? JSON.parse(JSON.stringify(safeMetadata)) : undefined,
        requestId: input.requestId ?? null,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (error) {
    // Audit logging must never crash the main operation
    console.error("[AUDIT] Failed to write audit event:", error);
  }
}

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "sessionToken",
  "secret",
  "answers", // screening answers
  "notes", // consultation notes
  "medicalInfo",
]);

function sanitizeMetadata(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
