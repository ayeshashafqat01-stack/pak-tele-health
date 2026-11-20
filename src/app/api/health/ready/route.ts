import { NextResponse } from "next/server";
import { prisma } from "@/shared/db/client";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready", db: "connected" });
  } catch {
    return NextResponse.json(
      { status: "not_ready", db: "disconnected" },
      { status: 503 }
    );
  }
}
