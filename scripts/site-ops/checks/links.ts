import { type ReportEntry } from "../report.ts";

export type LinkKind = "internal" | "live_url" | "external";

export interface LinkResult {
  url: string;
  kind: LinkKind;
  status: number;
}

function isDead(status: number): boolean {
  return status === 0 || status >= 400;
}

export function analyzeLinks(results: LinkResult[]): ReportEntry {
  const deadCritical = results.filter((r) => (r.kind === "internal" || r.kind === "live_url") && isDead(r.status));
  const deadExternal = results.filter((r) => r.kind === "external" && isDead(r.status));
  if (deadCritical.length > 0) {
    return {
      check: "links",
      status: "FAIL",
      detail: `${deadCritical.length} dead internal/live_url: ${deadCritical.map((r) => r.url).join(", ")}`,
    };
  }
  if (deadExternal.length > 0) {
    return {
      check: "links",
      status: "WARN",
      detail: `${deadExternal.length} dead external: ${deadExternal.map((r) => r.url).join(", ")}`,
    };
  }
  return { check: "links", status: "PASS", detail: `${results.length} links ok` };
}
