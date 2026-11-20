import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/shared/auth/authorization";
import { prisma } from "@/shared/db/client";
import { toApiError } from "@/shared/errors";

export async function GET() {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, "HEALTHCARE_WORKER");

    const facilityIds = ctx.facilityIds;

    // Get patients at assigned facilities
    const patients = await prisma.patient.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        facilityAssignments: {
          some: { facilityId: { in: facilityIds } },
        },
      },
      include: {
        patientPathways: {
          include: { pathway: true },
          where: { isActive: true },
        },
        alerts: {
          where: { status: { in: ["OPEN", "IN_REVIEW"] } },
          include: { ruleVersion: { include: { rule: true } } },
          orderBy: { evaluatedAt: "desc" },
        },
        observations: {
          orderBy: { observedAt: "desc" },
          take: 1,
          include: { type: true },
        },
        screeningSessions: {
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build alerts list
    const activeAlerts = patients.flatMap((p) =>
      p.alerts.map((a) => ({
        id: a.id,
        level: a.level,
        issue: a.issue,
        detail: a.detail ?? "",
        rationale: a.rationale ?? a.ruleVersion.rule.name,
        status: a.status,
        patient: {
          id: p.id,
          code: p.code,
          name: p.name,
          age: p.age,
        },
      }))
    );

    // Build recent patients
    const recentPatients = patients.map((p) => {
      const lastObs = p.observations[0];
      const hasOpenAlert = p.alerts.length > 0;
      const hasHighAlert = p.alerts.some((a) => a.level === "HIGH");
      const hasPrivateAlert = p.alerts.some((a) => a.level === "PRIVATE");
      const pathway = p.patientPathways[0]?.pathway.code;
      const hasScreening = p.screeningSessions.length > 0;

      let status = "NORMAL";
      if (hasHighAlert) status = "HIGH";
      else if (hasPrivateAlert) status = "PRIVATE";
      else if (hasOpenAlert) status = "REVIEW";
      else if (pathway === "mental" && !hasScreening) status = "SCREENING_PENDING";

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        age: p.age,
        status,
        lastObservation: lastObs
          ? `${lastObs.type.name} ${formatObsValue(lastObs.type.code, lastObs.value as Record<string, number>)}`
          : null,
        syncStatus: "SYNCED",
      };
    });

    return NextResponse.json({
      patientCount: patients.length,
      activeAlerts,
      recentPatients,
    });
  } catch (error) {
    const { status, body } = toApiError(error);
    return NextResponse.json(body, { status });
  }
}

function formatObsValue(typeCode: string, value: Record<string, number>): string {
  if (typeCode === "bp") return `${value.systolic}/${value.diastolic} mmHg`;
  if (typeCode === "spo2") return `${value.value} %`;
  if (typeCode === "hr") return `${value.value} bpm`;
  if (typeCode === "temp") return `${value.value} °C`;
  if (typeCode === "glu") return `${value.value} mg/dL`;
  return String(value.value);
}
