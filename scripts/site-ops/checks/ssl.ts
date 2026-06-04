import { type ReportEntry } from "../report.ts";

export function analyzeSsl(input: { daysToExpiry: number }): ReportEntry {
  const d = input.daysToExpiry;
  if (d < 7) return { check: "ssl", status: "FAIL", detail: `cert expires in ${d}d (<7)` };
  if (d < 21) return { check: "ssl", status: "WARN", detail: `cert expires in ${d}d (<21)` };
  return { check: "ssl", status: "PASS", detail: `cert valid ${d}d` };
}
