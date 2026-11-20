import { redirect } from "next/navigation";
import { auth } from "@/shared/auth/config";
import type { SessionUser } from "@/shared/auth/types";
import { prisma } from "@/shared/db/client";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as SessionUser;
  if (!user.roles.includes("ADMIN")) redirect("/login");

  const [userCount, facilityCount, patientCount, alertCount, auditCount] =
    await Promise.all([
      prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      prisma.facility.count({ where: { isActive: true } }),
      prisma.patient.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.alert.count({ where: { status: "OPEN" } }),
      prisma.auditEvent.count(),
    ]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Administrator dashboard</h1>
        <p className="text-[var(--color-text-muted)]">
          System overview. Minimal admin for MVP.
        </p>
      </div>

      <div className="bg-[var(--color-warning-bg)] text-[var(--color-warning)] rounded-[var(--radius-md)] px-3 py-2 text-sm font-bold">
        All data is synthetic. No real patient data in this environment.
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] border-t-4 border-t-[var(--color-action-primary)] rounded-[var(--radius-lg)] px-4 py-3 shadow-[var(--shadow-kpi)]">
          <div className="text-[1.9rem] font-bold leading-tight">
            {userCount}
          </div>
          <div className="text-[var(--color-text-muted)] text-[0.9rem]">
            Active users
          </div>
        </div>
        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] border-t-4 border-t-[var(--color-action-primary)] rounded-[var(--radius-lg)] px-4 py-3 shadow-[var(--shadow-kpi)]">
          <div className="text-[1.9rem] font-bold leading-tight">
            {facilityCount}
          </div>
          <div className="text-[var(--color-text-muted)] text-[0.9rem]">
            Facilities
          </div>
        </div>
        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] border-t-4 border-t-[var(--color-action-primary)] rounded-[var(--radius-lg)] px-4 py-3 shadow-[var(--shadow-kpi)]">
          <div className="text-[1.9rem] font-bold leading-tight">
            {patientCount}
          </div>
          <div className="text-[var(--color-text-muted)] text-[0.9rem]">
            Patients
          </div>
        </div>
        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] border-t-4 border-t-[var(--color-warning)] rounded-[var(--radius-lg)] px-4 py-3 shadow-[var(--shadow-kpi)]">
          <div className="text-[1.9rem] font-bold leading-tight">
            {alertCount}
          </div>
          <div className="text-[var(--color-text-muted)] text-[0.9rem]">
            Open alerts
          </div>
        </div>
        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] border-t-4 border-t-[var(--color-action-primary)] rounded-[var(--radius-lg)] px-4 py-3 shadow-[var(--shadow-kpi)]">
          <div className="text-[1.9rem] font-bold leading-tight">
            {auditCount}
          </div>
          <div className="text-[var(--color-text-muted)] text-[0.9rem]">
            Audit events
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-info-bg)] text-[var(--color-info)] rounded-[var(--radius-md)] px-3 py-2 text-sm">
        Full admin user/facility/config management is functional but minimal for
        MVP. The seeded accounts and facilities cover the demo scenarios.
      </div>
    </>
  );
}
