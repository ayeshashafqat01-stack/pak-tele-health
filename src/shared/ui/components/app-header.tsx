"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConnectivity, type ConnectionStatus } from "@/shared/hooks/use-connectivity";
import { useSyncQueue } from "@/shared/hooks/use-sync-queue";
import { useTheme } from "./theme-provider";
import { ConnectivityDot } from "./connectivity-banner";
import { Badge } from "./badge";
import { Button } from "./button";
import type { SessionUser, UserRole } from "@/shared/auth/types";
import { cn } from "@/shared/lib/utils";

const IS_DEV = process.env.NODE_ENV === "development";

export function AppHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { status, setStatus } = useConnectivity();
  const { pendingCount, isSyncing } = useSyncQueue();
  const { theme, setTheme } = useTheme();

  if (!session?.user) return null;

  const user = session.user as SessionUser;
  const isHw = user.roles.includes("HEALTHCARE_WORKER");
  const isDoctor = user.roles.includes("DOCTOR");

  const navItems = isHw
    ? [
        { href: "/hw", label: "Dashboard" },
        { href: "/hw/register", label: "Register" },
        { href: "/hw/record", label: "Record" },
      ]
    : isDoctor
    ? [{ href: "/doctor", label: "Dashboard" }]
    : [{ href: "/admin", label: "Dashboard" }];

  const roleName = isHw
    ? "Healthcare worker"
    : isDoctor
    ? "Doctor"
    : "Administrator";

  const connectionLabel =
    status === "offline"
      ? "Offline"
      : status === "weak"
      ? "Weak connection"
      : isSyncing
      ? "Online — syncing..."
      : "Online";

  return (
    <header
      className="sticky top-0 z-20 bg-[var(--color-surface-nav)] text-[var(--color-text-on-nav)] px-4 py-2 flex items-center justify-between flex-wrap gap-3"
    >
      <nav className="flex items-center gap-1 flex-wrap">
        <span className="font-bold text-[var(--color-text-on-nav-strong)] mr-3">
          Pak-Tele-Health
        </span>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-1.5 rounded-[var(--radius-md)] text-[var(--color-text-on-nav)] hover:bg-white/10 transition-colors",
                "focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-2",
                isActive &&
                  "bg-[#134a4f] text-white font-bold shadow-[inset_0_-3px_0_#6fd6d9]"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Connectivity status */}
        <span className="flex items-center gap-2">
          <ConnectivityDot status={status} />
          <span className="font-bold text-sm">{connectionLabel}</span>
        </span>

        {pendingCount > 0 && (
          <Badge variant={isSyncing ? "info" : "warning"}>
            {pendingCount} pending
          </Badge>
        )}

        {/* Dev-only network simulator */}
        {IS_DEV && (
          <div
            className="inline-flex border border-white/35 rounded-[var(--radius-md)] overflow-hidden"
            role="group"
            aria-label="Simulate connection"
          >
            {(["online", "weak", "offline"] as ConnectionStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
                className={cn(
                  "px-2.5 py-1 text-[0.85rem] border-r border-white/35 last:border-r-0 cursor-pointer",
                  "focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-[-3px]",
                  status === s
                    ? "bg-[#6fd6d9] text-[#042a2c] font-bold"
                    : "text-[var(--color-text-on-nav)]"
                )}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Theme toggle */}
        <div
          className="inline-flex border border-white/35 rounded-[var(--radius-md)] overflow-hidden"
          role="group"
          aria-label="Theme"
        >
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
              className={cn(
                "px-2 py-1 text-[0.85rem] border-r border-white/35 last:border-r-0 cursor-pointer",
                "focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-[-3px]",
                theme === t
                  ? "bg-[#6fd6d9] text-[#042a2c] font-bold"
                  : "text-[var(--color-text-on-nav)]"
              )}
            >
              {t === "light" ? "☀" : "☾"}
            </button>
          ))}
        </div>

        <span className="text-sm">{roleName}</span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-white border-white/40"
        >
          Log out
        </Button>
      </div>
    </header>
  );
}
