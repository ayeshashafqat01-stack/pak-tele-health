import { NextRequest, NextResponse } from "next/server";
import { requireAuth, hasPermission } from "@/shared/auth/authorization";
import { PERMISSIONS } from "@/shared/auth/types";
import { getPatient } from "@/modules/patients/services/patient.service";
import { toApiError } from "@/shared/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const patient = await getPatient(ctx, id);

    // Strip private screening data if user lacks permission
    const canSeePrivate = hasPermission(ctx, PERMISSIONS.SCREENING_READ_PRIVATE);

    const response = {
      ...patient,
      screeningSessions: canSeePrivate
        ? patient.screeningSessions
        : patient.screeningSessions.map((s) => ({
            id: s.id,
            status: s.status,
            completedAt: s.completedAt,
            privacyLevel: s.privacyLevel,
            // Don't include answers
            answers: undefined,
            hasPrivateData: true,
          })),
    };

    return NextResponse.json(response);
  } catch (error) {
    const { status, body } = toApiError(error);
    return NextResponse.json(body, { status });
  }
}
