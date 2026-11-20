import { NextResponse } from "next/server";
import { requireAuth } from "@/shared/auth/authorization";
import { prisma } from "@/shared/db/client";
import { toApiError } from "@/shared/errors";

export async function GET() {
  try {
    await requireAuth();
    const symptoms = await prisma.symptomCatalog.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(symptoms);
  } catch (error) {
    const { status, body } = toApiError(error);
    return NextResponse.json(body, { status });
  }
}
