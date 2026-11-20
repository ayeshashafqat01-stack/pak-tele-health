"use client";

import { useState, use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/shared/ui/components/button";
import { cn } from "@/shared/lib/utils";

interface Question {
  id: string;
  text: string;
  options: Array<{ id: string; text: string; value: number }>;
}

interface QuestionnaireData {
  id: string;
  questionnaire: { name: string };
  questions: Question[];
}

export default function ScreeningPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = use(params);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  const { data: questionnaire, isLoading } = useQuery<QuestionnaireData>({
    queryKey: ["questionnaire"],
    queryFn: async () => {
      const res = await fetch("/api/v1/screenings");
      if (!res.ok) throw new Error("Failed to load questionnaire");
      return res.json();
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!questionnaire) return;

    // Validate all questions answered
    const unanswered = questionnaire.questions.filter(
      (q) => !answers[q.id]
    );
    if (unanswered.length > 0) {
      setError("Answer every question.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/v1/screenings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          versionId: questionnaire.id,
          answers: Object.entries(answers).map(([questionId, optionId]) => ({
            questionId,
            optionId,
          })),
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Failed to save screening.");
        return;
      }

      setCompleted(true);
    } catch {
      setError("Connection error.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (completed) {
    return (
      <>
        <h1 className="text-2xl font-bold">Private screening</h1>
        <div className="space-y-3">
          <div className="bg-[var(--color-private-bg)] text-[var(--color-private)] rounded-[var(--radius-lg)] p-4">
            <strong>Responses saved privately.</strong> Only authorized users can
            see them.
          </div>
          <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-card)]">
            <h2 className="font-bold text-[1.15rem]">
              Professional review required
            </h2>
            <p className="text-[var(--color-text-muted)] mt-2">
              No result or diagnosis is shown. A mental-health professional
              reviews the responses.
            </p>
            <div className="flex gap-2 flex-wrap mt-4">
              <Button
                onClick={async () => {
                  await fetch("/api/v1/consultations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      patientId,
                      kind: "counselling",
                      notes: "Counselling requested by healthcare worker",
                      recommendation: "Counselling requested",
                      idempotencyKey: crypto.randomUUID(),
                    }),
                  });
                  window.location.href = `/hw/patients/${patientId}`;
                }}
              >
                Request counselling
              </Button>
              <Link href={`/hw/patients/${patientId}`}>
                <Button variant="ghost">Back to patient</Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Private screening</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-24 bg-[var(--color-border-default)] rounded-[var(--radius-lg)]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Private screening</h1>

      <div className="bg-[var(--color-private-bg)] text-[var(--color-private)] rounded-[var(--radius-md)] px-3 py-2 text-sm">
        <strong>
          Mental-health information is private and only available to authorized
          users.
        </strong>{" "}
        A family member does not automatically see it. Complete this with the
        patient alone.
      </div>

      <div className="bg-[var(--color-warning-bg)] text-[var(--color-warning)] rounded-[var(--radius-md)] px-3 py-2 text-sm">
        Demo questions only. The validated screening instrument will be
        confirmed with the supervisor.
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {questionnaire?.questions.map((q) => (
          <fieldset
            key={q.id}
            className="border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-4"
          >
            <legend className="font-bold px-1">{q.text}</legend>
            <div className="flex flex-wrap gap-2 mt-2">
              {q.options.map((o) => (
                <label
                  key={o.id}
                  className={cn(
                    "inline-flex items-center gap-2 border rounded-[var(--radius-md)] px-3 py-2 cursor-pointer bg-[var(--color-surface-raised)] transition-colors",
                    answers[q.id] === o.id
                      ? "border-[var(--color-action-primary)] bg-[var(--color-info-bg)] font-bold"
                      : "border-[var(--color-border-default)]"
                  )}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={o.id}
                    checked={answers[q.id] === o.id}
                    onChange={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: o.id }))
                    }
                    className="w-4 h-4 accent-[var(--color-action-primary)]"
                  />
                  {o.text}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {error && (
          <div
            className="bg-[var(--color-danger-bg)] text-[var(--color-danger)] rounded-[var(--radius-md)] px-3 py-2 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save private screening"}
        </Button>
      </form>
    </>
  );
}
