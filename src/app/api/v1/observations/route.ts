import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/shared/auth/authorization";
import { createObservation } from "@/modules/observations/services/observation.service";
import { observationCreateSchema } from "@/shared/validation/schemas";
import { toApiError } from "@/shared/errors";

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();

    const input = {
      ...body,
      facilityId: body.facilityId ?? ctx.facilityIds[0],
    };

    const parsed = observationCreateSchema.safeParse(input);
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

    const result = await createObservation(ctx, {
      ...parsed.data,
      symptoms: parsed.data.symptoms ?? [],
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const { status, body } = toApiError(error);
    return NextResponse.json(body, { status });
  }
}
