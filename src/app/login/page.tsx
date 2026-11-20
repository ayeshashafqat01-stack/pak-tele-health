"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/components/button";
import { Input } from "@/shared/ui/components/input";
import { Field } from "@/shared/ui/components/field";

const DEMO_ACCOUNTS = [
  {
    label: "Healthcare worker",
    description: "Registers patients, records observations.",
    email: "hw@demo.pth",
    password: "demo-hw-pass",
  },
  {
    label: "Doctor / specialist",
    description: "Reviews alerts, history, writes consultation and referral.",
    email: "doctor@demo.pth",
    password: "demo-doctor-pass",
  },
  {
    label: "Administrator",
    description: "Manage users, roles, facilities, and configuration.",
    email: "admin@demo.pth",
    password: "demo-admin-pass",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter email and password.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Connection error. Is the server running?");
    } finally {
      setIsLoading(false);
    }
  }

  function fillDemo(index: number) {
    const account = DEMO_ACCOUNTS[index];
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  }

  return (
    <div className="max-w-[460px] mx-auto px-4 py-8">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Pak-Tele-Health</h1>
          <p className="text-[var(--color-text-muted)]">
            Rural healthcare worker collects, remote doctor reviews.
          </p>
        </div>

        <div
          className="bg-[var(--color-warning-bg)] text-[var(--color-warning)] rounded-[var(--radius-md)] px-3 py-2 text-sm font-bold"
          role="alert"
        >
          All data in this environment is synthetic. No real patient data.
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Field label="Email" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="hw@demo.pth"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Password" htmlFor="password" required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && (
            <div
              className="bg-[var(--color-danger-bg)] text-[var(--color-danger)] rounded-[var(--radius-md)] px-3 py-2 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full justify-center"
            size="lg"
          >
            {isLoading ? "Logging in..." : "Log in"}
          </Button>
        </form>

        {/* Demo account quick-fill */}
        <div className="border-t border-[var(--color-border-default)] pt-4">
          <p className="text-sm text-[var(--color-text-muted)] mb-3">
            Demo accounts (click to fill):
          </p>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((account, i) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(i)}
                className="w-full flex items-center justify-between gap-3 border border-[var(--color-border-default)] rounded-[var(--radius-md)] p-3 cursor-pointer bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-base)] transition-colors text-left"
              >
                <div>
                  <span className="font-bold block text-sm">
                    {account.label}
                  </span>
                  <span className="text-[var(--color-text-muted)] text-xs">
                    {account.email}
                  </span>
                </div>
                <span className="text-[var(--color-action-primary)] text-xs font-bold whitespace-nowrap">
                  Fill &rarr;
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
