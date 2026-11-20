"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/ui/components/button";
import { Card } from "@/shared/ui/components/card";
import { Input } from "@/shared/ui/components/input";
import { Select } from "@/shared/ui/components/select";
import { Field } from "@/shared/ui/components/field";
import { AlertCard } from "@/shared/ui/components/alert-card";
import { Badge } from "@/shared/ui/components/badge";
import { useConnectivity } from "@/shared/hooks/use-connectivity";
import { useSyncQueue } from "@/shared/hooks/use-sync-queue";
import { cn } from "@/shared/lib/utils";

const OBS_TYPES = [
  { code: "bp", name: "Blood pressure", unit: "mmHg" },
  { code: "hr", name: "Heart rate", unit: "bpm" },
  { code: "spo2", name: "SpO2", unit: "%" },
  { code: "temp", name: "Temperature", unit: "°C" },
  { code: "glu", name: "Glucose", unit: "mg/dL" },
];

const SOURCES = [
  "Healthcare worker",
  "BP monitor",
  "Pulse oximeter",
  "Manual entry",
];

interface PatientOption {
  id: string;
  code: string;
  name: string;
  pathway: string;
}

interface SymptomOption {
  id: string;
  code: string;
  name: string;
}

interface RecordResult {
  observation: {
    id: string;
    typeCode: string;
    value: Record<string, number>;
    unit: string;
  };
  alerts: Array<{
    id: string;
    level: string;
    issue: string;
    detail: string;
    rationale: string;
  }>;
  patientId: string;
  patientPathway: string;
}

export default function RecordPage() {
  return (
    <Suspense fallback={<div className="animate-pulse space-y-4"><div className="h-8 bg-[var(--color-border-default)] rounded w-48" /><div className="h-64 bg-[var(--color-border-default)] rounded" /></div>}>
      <RecordPageContent />
    </Suspense>
  );
}

function RecordPageContent() {
  const searchParams = useSearchParams();
  const preselectedPatient = searchParams.get("patientId");
  const { status: connStatus } = useConnectivity();
  const { addToQueue } = useSyncQueue();

  const [selectedType, setSelectedType] = useState("bp");
  const [selectedPatient, setSelectedPatient] = useState(preselectedPatient ?? "");
  const [source, setSource] = useState("Healthcare worker");
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [singleValue, setSingleValue] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RecordResult | null>(null);

  const { data: patients } = useQuery<PatientOption[]>({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const res = await fetch("/api/v1/patients?select=id,code,name,pathway");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: symptoms } = useQuery<SymptomOption[]>({
    queryKey: ["symptoms"],
    queryFn: async () => {
      const res = await fetch("/api/v1/symptoms");
      if (!res.ok) return [];
      return res.json();
    },
  });

  function toggleSymptom(id: string) {
    setSelectedSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function fillDemo() {
    const patient = patients?.find(
      (p) => p.pathway === "maternal"
    );
    if (patient) setSelectedPatient(patient.id);
    setSelectedType("bp");
    setBpSystolic("160");
    setBpDiastolic("110");
    // Select first two symptoms
    if (symptoms && symptoms.length >= 2) {
      setSelectedSymptoms(new Set([symptoms[0].id, symptoms[1].id]));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!selectedPatient) {
        setError("Select a patient.");
        return;
      }

      let value: Record<string, number>;
      if (selectedType === "bp") {
        if (!bpSystolic || !bpDiastolic) {
          setError("Enter systolic and diastolic values.");
          return;
        }
        value = {
          systolic: parseInt(bpSystolic),
          diastolic: parseInt(bpDiastolic),
        };
      } else {
        if (!singleValue) {
          setError("Enter a value.");
          return;
        }
        value = { value: parseFloat(singleValue) };
      }

      const idempotencyKey = crypto.randomUUID();
      const body = {
        patientId: selectedPatient,
        typeCode: selectedType,
        value,
        source,
        symptoms: Array.from(selectedSymptoms),
        idempotencyKey,
      };

      const patient = patients?.find((p) => p.id === selectedPatient);

      if (connStatus === "offline") {
        // Save to IndexedDB queue
        await addToQueue({
          id: crypto.randomUUID(),
          type: "observation:create",
          endpoint: "/api/v1/observations",
          method: "POST",
          body,
          idempotencyKey,
          createdAt: new Date().toISOString(),
          status: "PENDING",
          attempts: 0,
        });
        setResult({
          observation: {
            id: idempotencyKey,
            typeCode: selectedType,
            value,
            unit: OBS_TYPES.find((t) => t.code === selectedType)?.unit ?? "",
          },
          alerts: [],
          patientId: selectedPatient,
          patientPathway: patient?.pathway ?? "",
        });
        return;
      }

      const res = await fetch("/api/v1/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Failed to save observation.");
        return;
      }

      const data = await res.json();
      setResult({
        ...data,
        patientId: selectedPatient,
        patientPathway: patient?.pathway ?? "",
      });
    } catch {
      setError("Connection error.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setResult(null);
    setBpSystolic("");
    setBpDiastolic("");
    setSingleValue("");
    setSelectedSymptoms(new Set());
    setError("");
  }

  if (result) {
    const typeName = OBS_TYPES.find((t) => t.code === result.observation.typeCode)?.name ?? "";
    const valueStr =
      result.observation.typeCode === "bp"
        ? `${result.observation.value.systolic}/${result.observation.value.diastolic} mmHg`
        : `${result.observation.value.value} ${result.observation.unit}`;

    return (
      <>
        <h1 className="text-2xl font-bold">Record observation</h1>
        <div className="space-y-3">
          <div className="bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-[var(--radius-lg)] p-4">
            <strong>Saved</strong>: {typeName} {valueStr}{" "}
            {connStatus === "offline" ? (
              <>
                <Badge variant="warning">Pending sync</Badge>
                <div className="mt-1">
                  Offline — records will be saved and synchronized when
                  connection returns.
                </div>
              </>
            ) : (
              <Badge variant="success">Synced</Badge>
            )}
          </div>

          {result.alerts.length > 0
            ? result.alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  level={alert.level as "HIGH" | "REVIEW" | "PRIVATE"}
                  status="OPEN"
                  patientName=""
                  patientCode=""
                  issue={alert.issue}
                  detail={alert.detail}
                  rationale={alert.rationale}
                />
              ))
            : (
              <div className="bg-[var(--color-info-bg)] text-[var(--color-info)] rounded-[var(--radius-md)] p-3 text-sm">
                No alert rule was triggered.
              </div>
            )}

          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={resetForm}>
              Record another
            </Button>
            {result.patientPathway === "mental" && (
              <Link href={`/hw/screenings/${result.patientId}`}>
                <Button>Private screening</Button>
              </Link>
            )}
            <Link href={`/hw/patients/${result.patientId}`}>
              <Button variant="ghost">View patient</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Record observation</h1>
          <p className="text-[var(--color-text-muted)]">
            Vitals and symptoms taken at the rural healthcare point.
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-4 gap-y-3">
            {/* Patient select */}
            <Field label="Patient" htmlFor="patient" wide required>
              <Select
                id="patient"
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
              >
                <option value="">Select a patient</option>
                {patients?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.code}
                  </option>
                ))}
              </Select>
            </Field>

            {/* Observation type */}
            <Field label="Observation type" wide>
              <div
                className="inline-flex border border-[var(--color-border-default)] rounded-[var(--radius-md)] overflow-hidden"
                role="group"
              >
                {OBS_TYPES.map((t) => (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => setSelectedType(t.code)}
                    aria-pressed={selectedType === t.code}
                    className={cn(
                      "px-3 py-1.5 text-sm border-r border-[var(--color-border-default)] last:border-r-0 cursor-pointer transition-colors",
                      "focus-visible:outline-3 focus-visible:outline-[var(--color-focus-ring)]",
                      selectedType === t.code
                        ? "bg-[var(--color-action-primary)] text-[var(--color-action-primary-text)] font-bold"
                        : "text-[var(--color-text-primary)]"
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </Field>

            {/* Value fields */}
            {selectedType === "bp" ? (
              <>
                <Field label="Systolic (mmHg)" htmlFor="systolic" required>
                  <Input
                    id="systolic"
                    type="number"
                    inputMode="numeric"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value)}
                  />
                </Field>
                <Field label="Diastolic (mmHg)" htmlFor="diastolic" required>
                  <Input
                    id="diastolic"
                    type="number"
                    inputMode="numeric"
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value)}
                  />
                </Field>
              </>
            ) : (
              <Field
                label={`${OBS_TYPES.find((t) => t.code === selectedType)?.name} (${OBS_TYPES.find((t) => t.code === selectedType)?.unit})`}
                htmlFor="value"
                required
              >
                <Input
                  id="value"
                  type="number"
                  step={selectedType === "temp" ? "0.1" : "1"}
                  inputMode="numeric"
                  value={singleValue}
                  onChange={(e) => setSingleValue(e.target.value)}
                />
              </Field>
            )}

            {/* Source */}
            <Field label="Source" htmlFor="source">
              <Select
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            {/* Symptoms */}
            <fieldset className="col-span-full border-0 p-0 m-0">
              <legend className="font-bold text-[0.92rem] mb-2">
                Symptoms (optional)
              </legend>
              <div className="flex flex-wrap gap-2">
                {symptoms?.map((s) => (
                  <label
                    key={s.id}
                    className={cn(
                      "inline-flex items-center gap-2 border rounded-[var(--radius-md)] px-3 py-2 cursor-pointer bg-[var(--color-surface-raised)] transition-colors",
                      selectedSymptoms.has(s.id)
                        ? "border-[var(--color-action-primary)] bg-[var(--color-info-bg)] font-bold"
                        : "border-[var(--color-border-default)]"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSymptoms.has(s.id)}
                      onChange={() => toggleSymptom(s.id)}
                      className="w-4 h-4 accent-[var(--color-action-primary)]"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </fieldset>
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
              {isSubmitting ? "Saving..." : "Save observation"}
            </Button>
            <Button type="button" variant="ghost" onClick={fillDemo}>
              Use demo reading
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
