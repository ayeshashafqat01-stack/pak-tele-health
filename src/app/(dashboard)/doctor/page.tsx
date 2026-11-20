"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/shared/ui/components/kpi-card";
import { Badge } from "@/shared/ui/components/badge";
import { Button } from "@/shared/ui/components/button";
import { Card, CardTitle, CardContent } from "@/shared/ui/components/card";
import { Skeleton } from "@/shared/ui/components/skeleton";

interface DoctorDashboardData {
  patientCount: number;
  activeAlerts: Array<{
    id: string;
    level: string;
    issue: string;
    detail: string;
    rationale: string;
    status: string;
    patient: { id: string; code: string; name: string; age: number | null };
  }>;
  pendingReferrals: number;
  patients: Array<{
    id: string;
    code: string;
    name: string;
    age: number | null;
    hasOpenAlert: boolean;
    alertLevel: string | null;
  }>;
}

export default function DoctorDashboardPage() {
  const { data, isLoading, error } = useQuery<DoctorDashboardData>({
    queryKey: ["doctor-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/v1/doctor/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
  });

  if (error) {
    return (
      <div className="bg-[var(--color-danger-bg)] text-[var(--color-danger)] rounded-[var(--radius-lg)] p-4">
        Failed to load dashboard. Please try again.
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Doctor dashboard</h1>
        <p className="text-[var(--color-text-muted)]">Remote review</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <KpiCard label="Patients assigned" value={data?.patientCount ?? 0} />
          <KpiCard
            label="Active alerts"
            value={data?.activeAlerts.length ?? 0}
            variant={
              (data?.activeAlerts.length ?? 0) > 0 ? "danger" : "default"
            }
          />
          <KpiCard
            label="Pending referrals"
            value={data?.pendingReferrals ?? 0}
            variant={
              (data?.pendingReferrals ?? 0) > 0 ? "warning" : "default"
            }
          />
        </div>
      )}

      {/* Alerts table */}
      <Card>
        <CardTitle>Alerts to review</CardTitle>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2 mt-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : !data?.activeAlerts?.length ? (
            <div className="text-center text-[var(--color-text-muted)] py-4">
              No open alerts. Flagged cases appear here once synced.
            </div>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] border-b border-[var(--color-border-default)]">
                      Patient
                    </th>
                    <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] border-b border-[var(--color-border-default)]">
                      Issue
                    </th>
                    <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] border-b border-[var(--color-border-default)]">
                      Status
                    </th>
                    <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] border-b border-[var(--color-border-default)]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.activeAlerts.map((a) => (
                    <tr key={a.id}>
                      <td className="p-2 border-b border-[var(--color-border-default)]">
                        <span className="font-bold">{a.patient.name}</span>
                        <div className="text-[var(--color-text-muted)] text-sm">
                          {a.patient.code}
                          {a.patient.age ? ` · ${a.patient.age} y` : ""}
                        </div>
                      </td>
                      <td className="p-2 border-b border-[var(--color-border-default)]">
                        {a.issue}
                      </td>
                      <td className="p-2 border-b border-[var(--color-border-default)]">
                        {a.level === "HIGH" ? (
                          <Badge variant="danger">High review</Badge>
                        ) : a.level === "PRIVATE" ? (
                          <Badge variant="private">Private</Badge>
                        ) : (
                          <Badge variant="warning">Review</Badge>
                        )}
                      </td>
                      <td className="p-2 border-b border-[var(--color-border-default)]">
                        <Link href={`/doctor/review/${a.patient.id}`}>
                          <Button size="sm">Review case</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All patients */}
      <Card>
        <CardTitle>All patients</CardTitle>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 mt-3" />
          ) : !data?.patients?.length ? (
            <div className="text-center text-[var(--color-text-muted)] py-4">
              No patients assigned.
            </div>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] border-b border-[var(--color-border-default)]">
                      Patient
                    </th>
                    <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] border-b border-[var(--color-border-default)]">
                      Age
                    </th>
                    <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] border-b border-[var(--color-border-default)]">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.patients.map((p) => (
                    <tr
                      key={p.id}
                      className="cursor-pointer hover:bg-[var(--color-surface-base)]"
                    >
                      <td className="p-2 border-b border-[var(--color-border-default)]">
                        <Link href={`/doctor/review/${p.id}`} className="block">
                          <span className="font-bold">{p.name}</span>
                          <div className="text-[var(--color-text-muted)] text-sm">
                            {p.code}
                          </div>
                        </Link>
                      </td>
                      <td className="p-2 border-b border-[var(--color-border-default)]">
                        {p.age}
                      </td>
                      <td className="p-2 border-b border-[var(--color-border-default)]">
                        {p.hasOpenAlert ? (
                          p.alertLevel === "HIGH" ? (
                            <Badge variant="danger">High review</Badge>
                          ) : p.alertLevel === "PRIVATE" ? (
                            <Badge variant="private">Private review</Badge>
                          ) : (
                            <Badge variant="warning">Alert</Badge>
                          )
                        ) : (
                          <Badge variant="success">Normal</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
