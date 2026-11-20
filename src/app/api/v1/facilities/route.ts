import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/shared/auth/authorization";
import { prisma } from "@/shared/db/client";
import { toApiError } from "@/shared/errors";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const type = request.nextUrl.searchParams.get("type");

    const where = type === "destination"
      ? { type: { in: ["THQ", "DHQ", "SPECIALIST", "MENTAL_HEALTH"] }, isActive: true }
      : { isActive: true };

    const facilities = await prisma.facility.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(facilities);
  } catch (error) {
    const { status, body } = toApiError(error);
    return NextResponse.json(body, { status });
  }
}
