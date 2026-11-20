import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/shared/auth/authorization";
import { transitionReferral } from "@/modules/consultations/services/consultation.service";
import { referralTransitionSchema } from "@/shared/validation/schemas";
import { toApiError } from "@/shared/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const parsed = referralTransitionSchema.safeParse(body);
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

    const result = await transitionReferral(
      ctx,
      id,
      parsed.data.toStatus,
      parsed.data.reason
    );
    return NextResponse.json(result);
  } catch (error) {
    const { status, body } = toApiError(error);
    return NextResponse.json(body, { status });
  }
}
