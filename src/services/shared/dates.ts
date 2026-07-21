import { format } from "date-fns";

/** Formats a Date as YYYY-MM-DD (UTC-agnostic, matches Postgres `date` columns). */
export function toDateStr(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function extractTld(domain: string): string {
  const parts = domain.toLowerCase().split(".");
  return parts[parts.length - 1] ?? "";
}
