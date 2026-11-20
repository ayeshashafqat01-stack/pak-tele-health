import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/shared/auth/authorization";
import { createPatient } from "@/modules/patients/services/patient.service";
import { PERMISSIONS } from "@/shared/auth/types";
import { patientCreateSchema } from "@/shared/validation/schemas";
import { prisma } from "@/shared/db/client";
import { toApiError } from "@/shared/errors";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    requirePermission(ctx, PERMISSIONS.PATIENT_READ);

    const facilityIds = ctx.facilityIds;
    const selectParam = request.nextUrl.searchParams.get("select");

    const patients = await prisma.patient.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        ...(ctx.roles.includes("ADMIN")
          ? {}
          : {
              facilityAssignments: {
                some: { facilityId: { in: facilityIds } },
              },
            }),
      },
      include: {
        patientPathways: {
          include: { pathway: true },
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // If select=id,code,name,pathway return slim format
    if (selectParam) {
      return NextResponse.json(
        patients.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          pathway: p.patientPathways[0]?.pathway.code ?? null,
        }))
      );
    }

    return NextResponse.json(patients);
  } catch (error) {
    const { status, body } = toApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();

    const input = {
      ...body,
      facilityId: body.facilityId ?? ctx.facilityIds[0],
    };

    const parsed = patientCreateSchema.safeParse(input);
    if (!parsed.success) {
      return NextResponse.json(
        {
          type: "urn:pak-tele-health:error:validation",
          title: "Validation Error",
          status: 400,
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await createPatient(ctx, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const { status, body } = toApiError(error);
    return NextResponse.json(body, { status });
  }
}
