import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/shared/auth/authorization";
import { createConsultation } from "@/modules/consultations/services/consultation.service";
import { consultationCreateSchema } from "@/shared/validation/schemas";
import { toApiError } from "@/shared/errors";

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await request.json();

    const parsed = consultationCreateSchema.safeParse(body);
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

    const result = await createConsultation(ctx, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const { status, body } = toApiError(error);
    return NextResponse.json(body, { status });
  }
}
