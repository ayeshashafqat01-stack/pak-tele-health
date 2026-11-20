"use client";

import { use } from "react";
import { PatientDetail } from "@/shared/ui/components/patient-detail";

export default function HwPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PatientDetail patientId={id} role="hw" />;
}
