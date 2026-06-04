import { type ReportEntry } from "../report.ts";

export interface DepInfo {
  name: string;
  currentMajor: number;
  latestMajor: number;
}

export function analyzeDeprecation(deps: DepInfo[]): ReportEntry {
  const stale = deps.filter((d) => d.currentMajor < d.latestMajor);
  if (stale.length > 0) {
    return {
      check: "deprecation",
      status: "WARN",
      detail: `${stale.length} stale major(s): ${stale.map((d) => `${d.name} ${d.currentMajor}<${d.latestMajor}`).join(", ")}`,
    };
  }
  return { check: "deprecation", status: "PASS", detail: `${deps.length} dep(s) on latest major` };
}
