"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/ui/components/button";
import { Card } from "@/shared/ui/components/card";
import { Input } from "@/shared/ui/components/input";
import { Select } from "@/shared/ui/components/select";
import { Field } from "@/shared/ui/components/field";
import { Badge } from "@/shared/ui/components/badge";
import { useConnectivity } from "@/shared/hooks/use-connectivity";
import { useSyncQueue } from "@/shared/hooks/use-sync-queue";

const PATHWAYS = [
  { value: "maternal", label: "Maternal monitoring" },
  { value: "chronic", label: "Chronic disease (older adult)" },
  { value: "mental", label: "Mental-health screening" },
];

const formSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255),
    age: z.string().min(1, "Age is required"),
    sex: z.enum(["Male", "Female"], { required_error: "Select the sex" }),
    location: z.string().min(1, "Location is required"),
    pathway: z.enum(["maternal", "chronic", "mental"]),
    pregnancyWeeks: z.string().optional(),
    medicalInfo: z.string().max(5000).optional(),
  })
  .refine(
    (data) =>
      data.pathway !== "maternal" ||
      (data.pregnancyWeeks && parseInt(data.pregnancyWeeks) > 0),
    {
      message: "Pregnancy weeks required for maternal pathway",
      path: ["pregnancyWeeks"],
    }
  );

type FormData = z.infer<typeof formSchema>;

interface RegistrationResult {
  patient: {
    id: string;
    code: string;
    name: string;
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const { status: connStatus } = useConnectivity();
  const { addToQueue } = useSyncQueue();
  const [result, setResult] = useState<RegistrationResult | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pathway: "maternal",
    },
  });

  const pathway = watch("pathway");

  function fillDemo() {
    setValue("name", "Fatima Bibi");
    setValue("age", "26");
    setValue("sex", "Female");
    setValue("location", "Chak 45/GB (demo)");
    setValue("pathway", "maternal");
    setValue("pregnancyWeeks", "34");
    setValue("medicalInfo", "First pregnancy; antenatal visits regular.");
  }

  async function onSubmit(data: FormData) {
    const idempotencyKey = crypto.randomUUID();
    const body = {
      name: data.name,
      age: parseInt(data.age),
      sex: data.sex,
      location: data.location,
      pathway: data.pathway,
      pregnancyWeeks: data.pregnancyWeeks
        ? parseInt(data.pregnancyWeeks)
        : undefined,
      medicalInfo: data.medicalInfo || undefined,
      consentGiven: true,
      idempotencyKey,
    };

    if (connStatus === "offline") {
      await addToQueue({
        id: crypto.randomUUID(),
        type: "patient:create",
        endpoint: "/api/v1/patients",
        method: "POST",
        body,
        idempotencyKey,
        createdAt: new Date().toISOString(),
        status: "PENDING",
        attempts: 0,
      });
      setResult({
        patient: {
          id: idempotencyKey,
          code: "PT-PENDING",
          name: data.name,
        },
      });
      return;
    }

    const res = await fetch("/api/v1/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Registration failed");
    }

    const result = await res.json();
    setResult({ patient: result });
  }

  if (result) {
    return (
      <>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Register patient</h1>
        </div>
        <Card className="space-y-3">
          <div className="bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-[var(--radius-md)] px-3 py-2">
            <strong>Patient successfully registered.</strong>{" "}
            {result.patient.name} ({result.patient.code}){" "}
            {connStatus === "offline" ? (
              <Badge variant="warning">Pending sync</Badge>
            ) : (
              <Badge variant="success">Synced</Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href={`/hw/record?patientId=${result.patient.id}`}>
              <Button>Record observation</Button>
            </Link>
            <Link href={`/hw/patients/${result.patient.id}`}>
              <Button variant="secondary">View patient</Button>
            </Link>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Register patient</h1>
          <p className="text-[var(--color-text-muted)]">
            Only what the pilot needs.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fillDemo}>
          Fill demo example (Fatima Bibi)
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-4 gap-y-3">
            <Field
              label="Name / identifier"
              htmlFor="name"
              error={errors.name?.message}
              required
            >
              <Input id="name" {...register("name")} error={errors.name?.message} />
            </Field>

            <Field
              label="Age (years)"
              htmlFor="age"
              error={errors.age?.message}
              required
            >
              <Input
                id="age"
                type="number"
                inputMode="numeric"
                {...register("age")}
                error={errors.age?.message}
              />
            </Field>

            <Field
              label="Sex"
              htmlFor="sex"
              error={errors.sex?.message}
              required
            >
              <Select id="sex" {...register("sex")} error={errors.sex?.message}>
                <option value="">Select</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </Select>
            </Field>

            <Field
              label="Location"
              htmlFor="location"
              error={errors.location?.message}
              required
            >
              <Input
                id="location"
                {...register("location")}
                error={errors.location?.message}
              />
            </Field>

            <Field
              label="Care pathway"
              htmlFor="pathway"
              error={errors.pathway?.message}
              required
            >
              <Select id="pathway" {...register("pathway")}>
                {PATHWAYS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>

            {pathway === "maternal" && (
              <Field
                label="Pregnancy (weeks)"
                htmlFor="pregnancyWeeks"
                error={errors.pregnancyWeeks?.message}
                required
              >
                <Input
                  id="pregnancyWeeks"
                  type="number"
                  {...register("pregnancyWeeks")}
                  error={errors.pregnancyWeeks?.message}
                />
              </Field>
            )}

            <Field
              label="Relevant medical information"
              htmlFor="medicalInfo"
              wide
            >
              <textarea
                id="medicalInfo"
                {...register("medicalInfo")}
                className="w-full px-[0.65rem] py-[0.55rem] border border-[var(--color-border-strong)] rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] min-h-[5rem] resize-y text-[var(--color-text-primary)]"
              />
            </Field>
          </div>

          <div className="flex gap-2 mt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save patient"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
