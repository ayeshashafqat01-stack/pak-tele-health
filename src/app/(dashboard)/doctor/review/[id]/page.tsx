"use client";

import { useState, use } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/shared/ui/components/button";
import { Card, CardTitle, CardContent } from "@/shared/ui/components/card";
import { AlertCard } from "@/shared/ui/components/alert-card";
import { Badge } from "@/shared/ui/components/badge";
import { Field } from "@/shared/ui/components/field";
import { Select } from "@/shared/ui/components/select";
import { Skeleton } from "@/shared/ui/components/skeleton";
import { BpTrendChart } from "@/shared/ui/components/bp-trend-chart";
import { cn } from "@/shared/lib/utils";
import { formatDateTime } from "@/shared/lib/utils";

const RECOMMENDATIONS = [
  "Continue monitoring",
  "Follow-up in 3 days",
  "Follow-up in 1 week",
  "Refer to higher-level facility",
];

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: patientId } = use(params);
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState("");
  const [recommendation, setRecommendation] = useState("Follow-up in 3 days");
  const [createReferral, setCreateReferral] = useState(false);
  const [destFacilityId, setDestFacilityId] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/patients/${patientId}`);
      if (!res.ok) throw new Error("Failed to load patient");
      return res.json();
    },
  });

  const { data: facilities } = useQuery({
    queryKey: ["dest-facilities"],
    queryFn: async () => {
      const res = await fetch("/api/v1/facilities?type=destination");
      if (!res.ok) return [];
      return res.json();
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!notes.trim()) {
      setError("Enter the doctor's notes.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const alertIds =
        patient?.alerts
          ?.filter((a: { status: string }) => a.status === "OPEN" || a.status === "IN_REVIEW")
          .map((a: { id: string }) => a.id) ?? [];

      const body: Record<string, unknown> = {
        patientId,
        kind: "consultation",
        notes: notes.trim(),
        recommendation,
        alertIds,
        idempotencyKey: crypto.randomUUID(),
      };

      if (createReferral && destFacilityId) {
        body.referral = {
          destFacilityId,
          priority: priority.toUpperCase(),
        };
      }

      const res = await fetch("/api/v1/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Failed to save consultation.");
        return;
      }

      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
      queryClient.invalidateQueries({ queryKey: ["doctor-dashboard"] });
    } catch {
      setError("Connection error.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function advanceReferral(referralId: string, toStatus: string) {
    await fetch(`/api/v1/referrals/${referralId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus }),
    });
    queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center text-[var(--color-text-muted)] py-8">
        Patient not found.
      </div>
    );
  }

  const openAlerts = patient.alerts?.filter(
    (a: { status: string }) => a.status === "OPEN" || a.status === "IN_REVIEW"
  ) ?? [];

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Review case</h1>
        <p className="text-[var(--color-text-muted)]">
          {patient.name} · {patient.code} · {patient.age} y · {patient.sex}
        </p>
      </div>

      {/* Open alerts */}
      {openAlerts.length > 0 && (
        <div className="space-y-3">
          {openAlerts.map((a: {
            id: string;
            level: string;
            status: string;
            issue: string;
            detail: string;
            rationale: string;
          }) => (
            <AlertCard
              key={a.id}
              level={a.level as "HIGH" | "REVIEW" | "PRIVATE"}
              status={a.status}
              patientName={patient.name}
              patientCode={patient.code}
              patientAge={patient.age}
              issue={a.issue}
              detail={a.detail ?? ""}
              rationale={a.rationale ?? ""}
            />
          ))}
        </div>
      )}

      {/* Current readings */}
      <Card>
        <CardTitle>Current readings</CardTitle>
        <CardContent>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 mt-2">
            {patient.observations?.slice(0, 5).map((obs: {
              id: string;
              type: { code: string; name: string };
              value: Record<string, number>;
              unit: string;
              observedAt: string;
            }) => {
              const val =
                obs.type.code === "bp"
                  ? `${obs.value.systolic}/${obs.value.diastolic}`
                  : String(obs.value.value);
              const isFlagged =
                (obs.type.code === "bp" &&
                  (obs.value.systolic >= 160 || obs.value.diastolic >= 110)) ||
                (obs.type.code === "spo2" && obs.value.value < 92);

              return (
                <div
                  key={obs.id}
                  className={cn(
                    "border rounded-[var(--radius-lg)] p-3 bg-[var(--color-surface-raised)]",
                    isFlagged
                      ? "border-[var(--color-danger)] bg-[var(--color-danger-bg)]"
                      : "border-[var(--color-border-default)]"
                  )}
                >
                  <div className="text-[0.85rem] text-[var(--color-text-muted)]">
                    {obs.type.name}
                  </div>
                  <div className="text-[1.4rem] font-bold leading-tight">
                    {val}{" "}
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {obs.unit}
                    </span>
                  </div>
                  <div className="text-[0.78rem] text-[var(--color-text-muted)]">
                    {formatDateTime(obs.observedAt)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* History - BP trend */}
      <Card>
        <CardTitle>History</CardTitle>
        <CardContent>
          <BpTrendChart
            readings={
              patient.observations
                ?.filter((obs: { type: { code: string } }) => obs.type.code === "bp")
                .map((obs: { observedAt: string; value: Record<string, number> }) => ({
                  observedAt: obs.observedAt,
                  systolic: obs.value.systolic,
                  diastolic: obs.value.diastolic,
                })) ?? []
            }
          />
        </CardContent>
      </Card>

      {/* Consultation form */}
      {!saved ? (
        <Card>
          <CardTitle>Consultation</CardTitle>
          <CardContent>
            <form onSubmit={handleSubmit} className="mt-2">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-4 gap-y-3">
                <Field label="Doctor notes" htmlFor="notes" wide required>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Clinical notes entered by the doctor"
                    className="w-full px-[0.65rem] py-[0.55rem] border border-[var(--color-border-strong)] rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] min-h-[5rem] resize-y text-[var(--color-text-primary)]"
                  />
                </Field>

                <Field label="Recommendation / follow-up" htmlFor="rec">
                  <Select
                    id="rec"
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                  >
                    {RECOMMENDATIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Referral required?">
                  <label className="inline-flex items-center gap-2 border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 cursor-pointer bg-[var(--color-surface-raised)]">
                    <input
                      type="checkbox"
                      checked={createReferral}
                      onChange={(e) => setCreateReferral(e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-action-primary)]"
                    />
                    Yes, create referral
                  </label>
                </Field>

                {createReferral && (
                  <>
                    <Field label="Refer to" htmlFor="dest">
                      <Select
                        id="dest"
                        value={destFacilityId}
                        onChange={(e) => setDestFacilityId(e.target.value)}
                      >
                        <option value="">Select facility</option>
                        {facilities?.map((f: { id: string; name: string }) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Priority" htmlFor="priority">
                      <Select
                        id="priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Routine">Routine</option>
                      </Select>
                    </Field>
                  </>
                )}
              </div>

              {error && (
                <div
                  className="bg-[var(--color-danger-bg)] text-[var(--color-danger)] rounded-[var(--radius-md)] px-3 py-2 mt-3 text-sm"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save consultation"}
                </Button>
                <Link href={`/doctor/patients/${patientId}`}>
                  <Button type="button" variant="ghost">
                    View full patient record
                  </Button>
                </Link>
              </div>

              <p className="text-sm text-[var(--color-text-muted)] mt-3">
                No automatic diagnosis is shown. Video calling is out of scope
                for the MVP.
              </p>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-[var(--radius-lg)] p-4">
          <strong>Consultation saved.</strong>
          {createReferral && " Referral created."}
        </div>
      )}

      {/* Previous consultations */}
      <Card>
        <CardTitle>Previous consultations and referral</CardTitle>
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
                  referral: {
                    id: string;
                    status: string;
                    priority: string;
                    destFacility: { name: string };
                  } | null;
                }) => (
                  <div key={c.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        {c.kind === "counselling"
                          ? "Counselling request"
                          : "Consultation"}{" "}
                        · {formatDateTime(c.createdAt)}
                      </span>
                    </div>
                    {c.notes && <p className="mt-1">{c.notes}</p>}
                    {c.recommendation && (
                      <p className="text-sm mt-1">
                        <strong>Recommendation:</strong> {c.recommendation}
                      </p>
                    )}
                    {c.referral && (
                      <div className="mt-2">
                        <p className="text-sm">
                          <strong>Referral:</strong> →{" "}
                          {c.referral.destFacility.name} ·{" "}
                          {c.referral.priority} priority
                        </p>
                        <ReferralSteps
                          status={c.referral.status}
                          referralId={c.referral.id}
                          onAdvance={advanceReferral}
                        />
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

function ReferralSteps({
  status,
  referralId,
  onAdvance,
}: {
  status: string;
  referralId: string;
  onAdvance: (id: string, status: string) => void;
}) {
  const steps = ["PENDING", "ACCEPTED", "COMPLETED"];
  const currentIndex = steps.indexOf(status);

  return (
    <div className="mt-2">
      <div className="flex gap-1 my-2">
        {steps.map((s, i) => (
          <span
            key={s}
            className={cn(
              "flex-1 text-center py-1 text-[0.82rem] rounded-[var(--radius-sm)] border",
              i < currentIndex
                ? "bg-[var(--color-success-bg)] text-[var(--color-success)] border-transparent"
                : i === currentIndex
                ? "bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] border-[var(--color-action-primary)] font-bold"
                : "bg-[var(--color-surface-base)] text-[var(--color-text-muted)] border-[var(--color-border-default)]"
            )}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </span>
        ))}
      </div>
      {currentIndex < 2 && (
        <Button
          size="sm"
          onClick={() =>
            onAdvance(referralId, steps[currentIndex + 1])
          }
        >
          Mark {steps[currentIndex + 1].toLowerCase()}
        </Button>
      )}
    </div>
  );
}
