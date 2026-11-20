import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/shared/auth/authorization";
import { prisma } from "@/shared/db/client";
import { toApiError } from "@/shared/errors";

export async function GET() {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, "DOCTOR");

    const facilityIds = ctx.facilityIds;

    const patients = await prisma.patient.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        facilityAssignments: {
          some: { facilityId: { in: facilityIds } },
        },
      },
      include: {
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
        consultations: {
          include: { referral: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const activeAlerts = patients.flatMap((p) =>
      p.alerts.map((a) => ({
        id: a.id,
        level: a.level,
        issue: a.issue,
        detail: a.detail ?? "",
        rationale: a.rationale ?? "",
        status: a.status,
        evaluatedAt: a.evaluatedAt,
        patient: { id: p.id, code: p.code, name: p.name, age: p.age },
      }))
    );

    const pendingReferrals = patients
      .flatMap((p) =>
        p.consultations
          .filter((c) => c.referral?.status === "PENDING")
          .map((c) => c.referral!)
      ).length;

    const allPatients = patients.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      age: p.age,
      hasOpenAlert: p.alerts.length > 0,
      alertLevel: p.alerts[0]?.level ?? null,
    }));

    return NextResponse.json({
      patientCount: patients.length,
      activeAlerts: activeAlerts.sort(
        (a, b) =>
          new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()
      ),
      pendingReferrals,
      patients: allPatients,
    });
  } catch (error) {
    const { status, body } = toApiError(error);
    return NextResponse.json(body, { status });
  }
}
