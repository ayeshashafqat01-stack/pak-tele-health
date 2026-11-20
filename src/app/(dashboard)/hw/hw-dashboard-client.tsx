"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/ui/components/button";
import { KpiCard } from "@/shared/ui/components/kpi-card";
import { AlertCard } from "@/shared/ui/components/alert-card";
import { Badge } from "@/shared/ui/components/badge";
import { Card, CardTitle, CardContent } from "@/shared/ui/components/card";
import { Skeleton } from "@/shared/ui/components/skeleton";
import { useSyncQueue } from "@/shared/hooks/use-sync-queue";
import { offlineDb, type OfflineMutation } from "@/shared/lib/offline-db";
import { useLiveQuery } from "dexie-react-hooks";
import { formatDateTime } from "@/shared/lib/utils";

interface DashboardData {
  patientCount: number;
  activeAlerts: AlertItem[];
  recentPatients: PatientItem[];
}

interface AlertItem {
  id: string;
  level: string;
  issue: string;
  detail: string;
  rationale: string;
  status: string;
  patient: {
    id: string;
    code: string;
    name: string;
    age: number | null;
  };
}

interface PatientItem {
  id: string;
  code: string;
  name: string;
  age: number | null;
  status: string;
  lastObservation?: string;
  syncStatus: string;
}

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/v1/hw/dashboard");
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}

export function HwDashboardClient({
  facilityName,
}: {
  facilityName: string;
}) {
  const { pendingCount } = useSyncQueue();
  const { data, isLoading, error } = useQuery({
    queryKey: ["hw-dashboard"],
    queryFn: fetchDashboard,
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Healthcare worker dashboard</h1>
          <p className="text-[var(--color-text-muted)]">
            {facilityName} (demo facility)
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/hw/register">
          <Button>+ Register patient</Button>
        </Link>
        <Link href="/hw/record">
          <Button variant="secondary">Record observation</Button>
        </Link>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          <KpiCard label="Patients" value={data?.patientCount ?? 0} />
          <KpiCard
            label="Pending sync"
            value={pendingCount}
            variant={pendingCount > 0 ? "warning" : "default"}
          />
          <KpiCard
            label="Active alerts"
            value={data?.activeAlerts.length ?? 0}
            variant={
              (data?.activeAlerts.length ?? 0) > 0 ? "danger" : "default"
            }
          />
        </div>
      )}

      {/* Active alerts */}
      {data?.activeAlerts && data.activeAlerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[1.15rem] font-bold">
            Needs professional review
          </h2>
          {data.activeAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              level={alert.level as "HIGH" | "REVIEW" | "PRIVATE"}
              status={alert.status}
              patientName={alert.patient.name}
              patientCode={alert.patient.code}
              patientAge={alert.patient.age}
              issue={alert.issue}
              detail={alert.detail}
              rationale={alert.rationale}
              showDetail={alert.level !== "PRIVATE"}
              actions={
                <Link href={`/hw/patients/${alert.patient.id}`}>
                  <Button variant="secondary" size="sm">
                    View patient
                  </Button>
                </Link>
              }
            />
          ))}
        </section>
      )}

      {/* Recent patients table */}
      <Card>
        <CardTitle>Recent patients</CardTitle>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2 mt-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : !data?.recentPatients?.length ? (
            <div className="text-center text-[var(--color-text-muted)] py-4">
              No patients yet. Register a patient to begin.
            </div>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] whitespace-nowrap border-b border-[var(--color-border-default)]">
                      Patient
                    </th>
                    <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] whitespace-nowrap border-b border-[var(--color-border-default)]">
                      Age
                    </th>
                    <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] whitespace-nowrap border-b border-[var(--color-border-default)]">
                      Last observation
                    </th>
                    <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] whitespace-nowrap border-b border-[var(--color-border-default)]">
                      Status
                    </th>
                    <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] whitespace-nowrap border-b border-[var(--color-border-default)]">
                      Sync
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPatients.map((p) => (
                    <tr
                      key={p.id}
                      className="cursor-pointer hover:bg-[var(--color-surface-base)] transition-colors"
                    >
                      <td className="p-2 border-b border-[var(--color-border-default)]">
                        <Link
                          href={`/hw/patients/${p.id}`}
                          className="block"
                        >
                          <span className="font-bold">{p.name}</span>
                          <div className="text-[var(--color-text-muted)] text-sm">
                            {p.code}
                          </div>
                        </Link>
                      </td>
                      <td className="p-2 border-b border-[var(--color-border-default)]">
                        {p.age}
                      </td>
                      <td className="p-2 border-b border-[var(--color-border-default)] text-sm">
                        {p.lastObservation ?? "—"}
                      </td>
                      <td className="p-2 border-b border-[var(--color-border-default)]">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="p-2 border-b border-[var(--color-border-default)]">
                        <SyncBadge status={p.syncStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending sync */}
      <PendingSyncCard />
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "HIGH":
      return <Badge variant="danger">Review required</Badge>;
    case "PRIVATE":
      return <Badge variant="private">Private review</Badge>;
    case "REVIEW":
      return <Badge variant="warning">Alert</Badge>;
    case "SCREENING_PENDING":
      return <Badge variant="info">Screening pending</Badge>;
    default:
      return <Badge variant="success">Normal</Badge>;
  }
}

function SyncBadge({ status }: { status: string }) {
  switch (status) {
    case "SYNCED":
      return <Badge variant="success">Synced</Badge>;
    case "SYNCING":
      return <Badge variant="info">Syncing...</Badge>;
    case "PENDING":
      return <Badge variant="warning">Pending sync</Badge>;
    default:
      return <Badge variant="success">Synced</Badge>;
  }
}

const TYPE_LABELS: Record<string, string> = {
  "patient:create": "Patient registration",
  "observation:create": "Observation",
  "screening:create": "Private screening",
  "consultation:create": "Consultation",
};

function PendingSyncCard() {
  const { retryAll } = useSyncQueue();
  const queueItems = useLiveQuery(
    () => offlineDb.mutations.orderBy("createdAt").toArray(),
    [],
    [] as OfflineMutation[]
  );

  const pending = queueItems.filter((m) => m.status !== "SYNCED");

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Pending sync</CardTitle>
        {pending.some((m) => m.status === "FAILED") && (
          <button
            onClick={retryAll}
            className="text-sm text-[var(--color-action-primary)] font-bold cursor-pointer hover:underline"
          >
            Retry all
          </button>
        )}
      </div>
      <CardContent>
        {pending.length === 0 ? (
          <div className="text-center text-[var(--color-text-muted)] py-4">
            Everything is synced. Switch to Offline above, then save a record to
            see it queue here.
          </div>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] border-b border-[var(--color-border-default)]">
                    Record
                  </th>
                  <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] border-b border-[var(--color-border-default)]">
                    Saved
                  </th>
                  <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] border-b border-[var(--color-border-default)]">
                    Attempts
                  </th>
                  <th className="text-left p-2 text-[0.85rem] text-[var(--color-text-muted)] border-b border-[var(--color-border-default)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {pending.map((m) => (
                  <tr key={m.id}>
                    <td className="p-2 border-b border-[var(--color-border-default)] text-sm">
                      {TYPE_LABELS[m.type] ?? m.type}
                    </td>
                    <td className="p-2 border-b border-[var(--color-border-default)] text-sm">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="p-2 border-b border-[var(--color-border-default)] text-sm">
                      {m.attempts}
                    </td>
                    <td className="p-2 border-b border-[var(--color-border-default)]">
                      {m.status === "FAILED" ? (
                        <span title={m.lastError}>
                          <Badge variant="danger">Failed</Badge>
                        </span>
                      ) : m.status === "SYNCING" ? (
                        <Badge variant="info">Syncing...</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
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
  );
}
