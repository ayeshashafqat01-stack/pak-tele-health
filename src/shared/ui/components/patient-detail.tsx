"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/shared/ui/components/button";
import { Card, CardTitle, CardContent } from "@/shared/ui/components/card";
import { AlertCard } from "@/shared/ui/components/alert-card";
import { Badge } from "@/shared/ui/components/badge";
import { Skeleton } from "@/shared/ui/components/skeleton";
import { BpTrendChart } from "@/shared/ui/components/bp-trend-chart";
import { cn } from "@/shared/lib/utils";
import { formatDateTime } from "@/shared/lib/utils";

type Role = "hw" | "doctor";

export function PatientDetail({
  patientId,
  role,
}: {
  patientId: string;
  role: Role;
}) {
  const { data: patient, isLoading, error } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/patients/${patientId}`);
      if (!res.ok) throw new Error("Failed to load patient");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center text-[var(--color-text-muted)] py-8">
        Patient not found.
      </div>
    );
  }

  const pathway = patient.patientPathways?.[0]?.pathway?.code;
  const openAlerts =
    patient.alerts?.filter(
      (a: { status: string }) =>
        a.status === "OPEN" || a.status === "IN_REVIEW"
    ) ?? [];

  const patientBasePath = role === "doctor" ? "/doctor/patients" : "/hw/patients";
  const reviewPath = role === "doctor" ? `/doctor/review/${patientId}` : null;

  return (
    <>
      {/* Patient header */}
      <Card>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{patient.name}</h1>
              <Badge variant="success">Synced</Badge>
            </div>
            <div className="flex gap-6 flex-wrap mt-2">
              <div>
                <span className="block text-[0.8rem] text-[var(--color-text-muted)]">Patient ID</span>
                <strong>{patient.code}</strong>
              </div>
              <div>
                <span className="block text-[0.8rem] text-[var(--color-text-muted)]">Age</span>
                <strong>{patient.age}</strong>
              </div>
              <div>
                <span className="block text-[0.8rem] text-[var(--color-text-muted)]">Sex</span>
                <strong>{patient.sex}</strong>
              </div>
              <div>
                <span className="block text-[0.8rem] text-[var(--color-text-muted)]">Location</span>
                <strong>{patient.location}</strong>
              </div>
              {patient.patientPathways?.[0]?.pregnancyWeeks && (
                <div>
                  <span className="block text-[0.8rem] text-[var(--color-text-muted)]">Pregnancy</span>
                  <strong>{patient.patientPathways[0].pregnancyWeeks} weeks</strong>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {role === "doctor" && reviewPath && (
              <Link href={reviewPath}>
                <Button>Review case</Button>
              </Link>
            )}
            {role === "hw" && (
              <>
                <Link href={`/hw/record?patientId=${patientId}`}>
                  <Button>Record observation</Button>
                </Link>
                {pathway === "mental" && (
                  <Link href={`/hw/screenings/${patientId}`}>
                    <Button variant="secondary">Private screening</Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
        {patient.medicalInfo && (
          <p className="text-sm text-[var(--color-text-muted)] mt-3">{patient.medicalInfo}</p>
        )}
      </Card>

      {/* Alerts */}
      {openAlerts.length > 0 && (
        <div className="space-y-3">
          {openAlerts.map(
            (a: { id: string; level: string; status: string; issue: string; detail: string; rationale: string }) => (
              <AlertCard
                key={a.id}
                level={a.level as "HIGH" | "REVIEW" | "PRIVATE"}
                status={a.status}
                patientName={patient.name}
                patientCode={patient.code}
                patientAge={patient.age}
                issue={a.issue}
                detail={a.level === "PRIVATE" && role === "hw" ? "" : a.detail ?? ""}
                rationale={a.rationale ?? ""}
                showDetail={a.level !== "PRIVATE" || role === "doctor"}
                actions={
                  role === "doctor" && reviewPath ? (
                    <Link href={reviewPath}>
                      <Button size="sm">Review case</Button>
                    </Link>
                  ) : (
                    <Link href={`${patientBasePath}/${patientId}`}>
                      <Button variant="secondary" size="sm">View patient</Button>
                    </Link>
                  )
                }
              />
            )
          )}
        </div>
      )}

      {/* Current readings */}
      <Card>
        <CardTitle>Current readings</CardTitle>
        <CardContent>
          <VitalsGrid observations={patient.observations} />
          <SymptomsLine observations={patient.observations} />
        </CardContent>
      </Card>

      {/* BP trend chart */}
      <Card>
        <CardTitle>Historical readings</CardTitle>
        <CardContent>
          <BpTrendChart
            readings={
              patient.observations
                ?.filter((o: { type: { code: string } }) => o.type.code === "bp")
                .map((o: { observedAt: string; value: Record<string, number> }) => ({
                  observedAt: o.observedAt,
                  systolic: o.value.systolic,
                  diastolic: o.value.diastolic,
                })) ?? []
            }
          />
        </CardContent>
      </Card>

      {/* Private screening */}
      {pathway === "mental" && (
        <Card>
          <CardTitle>Private screening</CardTitle>
          <CardContent>
            <div className="bg-[var(--color-private-bg)] text-[var(--color-private)] rounded-[var(--radius-md)] px-3 py-2 text-sm mt-2">
              Mental-health information is private and only available to authorized users.
            </div>
            {patient.screeningSessions?.length > 0 ? (
              patient.screeningSessions[0].hasPrivateData ? (
                <p className="text-[var(--color-text-muted)] mt-3">
                  Screening completed. Details restricted to authorized users.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {patient.screeningSessions[0].answers?.map(
                    (a: { question: { text: string }; option: { text: string } }, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-[var(--color-border-default)]">
                        <span>{a.question.text}</span>
                        <strong>{a.option.text}</strong>
                      </div>
                    )
                  )}
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Demo questions only. Completed {formatDateTime(patient.screeningSessions[0].completedAt)}.
                  </p>
                </div>
              )
            ) : (
              <p className="text-[var(--color-text-muted)] mt-3">No screening completed yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Consultations and referrals */}
      <Card>
        <CardTitle>Consultations and referral</CardTitle>
        <CardContent>
          {!patient.consultations?.length ? (
            <div className="text-center text-[var(--color-text-muted)] py-4">
              No consultations or referrals yet.
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border-default)] mt-2">
              {patient.consultations.map(
                (c: {
                  id: string;
                  kind: string;
                  notes: string;
                  recommendation: string;
                  createdAt: string;
                  doctor: { name: string };
                  referral: { id: string; status: string; priority: string; destFacility: { name: string } } | null;
                }) => (
                  <div key={c.id} className="py-3">
                    <div className="font-bold">
                      {c.kind === "counselling" ? "Counselling request" : "Consultation"} · {formatDateTime(c.createdAt)}
                    </div>
                    {c.notes && <p className="mt-1">{c.notes}</p>}
                    {c.recommendation && (
                      <p className="text-sm">
                        <strong>Recommendation:</strong> {c.recommendation}
                      </p>
                    )}
                    {c.referral && (
                      <div className="mt-2">
                        <p className="text-sm">
                          <strong>Referral:</strong> → {c.referral.destFacility.name} · {c.referral.priority} priority
                        </p>
                        <div className="flex gap-1 my-2">
                          {["PENDING", "ACCEPTED", "COMPLETED"].map((s, i) => {
                            const steps = ["PENDING", "ACCEPTED", "COMPLETED"];
                            const currentIdx = steps.indexOf(c.referral!.status);
                            return (
                              <span
                                key={s}
                                className={cn(
                                  "flex-1 text-center py-1 text-[0.82rem] rounded-[var(--radius-sm)] border",
                                  i < currentIdx
                                    ? "bg-[var(--color-success-bg)] text-[var(--color-success)] border-transparent"
                                    : i === currentIdx
                                    ? "bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] font-bold border-[var(--color-action-primary)]"
                                    : "bg-[var(--color-surface-base)] text-[var(--color-text-muted)] border-[var(--color-border-default)]"
                                )}
                              >
                                {s.charAt(0) + s.slice(1).toLowerCase()}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

/* ---- Sub-components ---- */

function VitalsGrid({ observations }: { observations: Array<{ type: { code: string; name?: string }; value: Record<string, number>; unit: string; observedAt: string }> | undefined }) {
  const types = [
    { code: "bp", name: "Blood pressure", unit: "mmHg" },
    { code: "hr", name: "Heart rate", unit: "bpm" },
    { code: "spo2", name: "SpO2", unit: "%" },
    { code: "temp", name: "Temperature", unit: "°C" },
    { code: "glu", name: "Glucose", unit: "mg/dL" },
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 mt-2">
      {types.map(({ code, name, unit }) => {
        const obs = observations?.find((o) => o.type.code === code);
        const val = obs
          ? code === "bp"
            ? `${obs.value.systolic}/${obs.value.diastolic}`
            : String(obs.value.value)
          : "—";
        const isFlagged =
          obs &&
          ((code === "bp" && (obs.value.systolic >= 160 || obs.value.diastolic >= 110)) ||
            (code === "spo2" && obs.value.value < 92));

        return (
          <div
            key={code}
            className={cn(
              "border rounded-[var(--radius-lg)] p-3",
              isFlagged
                ? "border-[var(--color-danger)] bg-[var(--color-danger-bg)]"
                : "border-[var(--color-border-default)] bg-[var(--color-surface-raised)]"
            )}
          >
            <div className="text-[0.85rem] text-[var(--color-text-muted)]">{name}</div>
            <div className="text-[1.4rem] font-bold leading-tight">
              {val} <span className="text-sm text-[var(--color-text-muted)]">{unit}</span>
            </div>
            <div className="text-[0.78rem] text-[var(--color-text-muted)]">
              {obs ? formatDateTime(obs.observedAt) : "No reading"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SymptomsLine({ observations }: { observations: Array<{ symptoms: Array<{ symptom: { name: string } }> }> | undefined }) {
  const allSymptoms = observations
    ?.filter((o) => o.symptoms?.length > 0)
    .flatMap((o) => o.symptoms.map((s) => s.symptom.name))
    .filter((v, i, a) => a.indexOf(v) === i);

  if (!allSymptoms?.length) return null;

  return (
    <p className="text-sm mt-3">
      <strong>Symptoms:</strong> {allSymptoms.join(", ")}
    </p>
  );
}
