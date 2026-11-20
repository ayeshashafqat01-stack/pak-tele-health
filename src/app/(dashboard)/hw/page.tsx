import { redirect } from "next/navigation";
import { auth } from "@/shared/auth/config";
import type { SessionUser } from "@/shared/auth/types";
import { HwDashboardClient } from "./hw-dashboard-client";

export default async function HwDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  if (!user.roles.includes("HEALTHCARE_WORKER")) redirect("/login");

  const facilityName =
    user.facilities.find((f) => f.isPrimary)?.name ?? "Assigned facility";

  return <HwDashboardClient facilityName={facilityName} />;
}
