import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/shared/auth/authorization";
import { createScreening, getQuestionnaireVersion } from "@/modules/screenings/services/screening.service";
import { screeningCreateSchema } from "@/shared/validation/schemas";
import { toApiError } from "@/shared/errors";

export async function GET() {
  try {
    const ctx = await requireAuth();
    const version = await getQuestionnaireVersion(ctx);
    return NextResponse.json(version);
  } catch (error) {
    const { status, body } = toApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();

    const parsed = screeningCreateSchema.safeParse(body);
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

    const result = await createScreening(ctx, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const { status, body } = toApiError(error);
    return NextResponse.json(body, { status });
  }
}
