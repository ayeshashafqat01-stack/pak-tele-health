import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(
  date: Date | string,
  timezone: string = "Asia/Karachi"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }) +
    ", " +
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    });
}

export function formatDate(
  date: Date | string,
  timezone: string = "Asia/Karachi"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  });
}

export function generatePatientCode(sequence: number): string {
  return `PT-${String(sequence).padStart(6, "0")}`;
}
