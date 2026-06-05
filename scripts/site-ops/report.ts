export type Status = "PASS" | "WARN" | "FAIL";

export interface ReportEntry {
  check: string;
  status: Status;
  detail: string;
}

export interface ScanReport {
  entries: ReportEntry[];
  overall: Status;
}

const RANK: Record<Status, number> = { PASS: 0, WARN: 1, FAIL: 2 };

export function worst(statuses: Status[]): Status {
  return statuses.reduce<Status>((acc, s) => (RANK[s] > RANK[acc] ? s : acc), "PASS");
}

export function aggregate(entries: ReportEntry[]): ScanReport {
  return { entries, overall: worst(entries.map((e) => e.status)) };
}

export function formatReport(report: ScanReport): string {
  const lines = report.entries.map((e) => `[${e.status}] ${e.check}: ${e.detail}`);
  return [`OVERALL: ${report.overall}`, ...lines].join("\n");
}
