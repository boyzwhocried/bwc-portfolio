import { type ReportEntry } from "../report.ts";

export interface AuditJson {
  metadata?: {
    vulnerabilities?: {
      info?: number;
      low?: number;
      moderate?: number;
      high?: number;
      critical?: number;
      total?: number;
    };
  };
}

export function analyzeAudit(audit: AuditJson): ReportEntry {
  const v = audit.metadata?.vulnerabilities ?? {};
  const critical = v.critical ?? 0;
  const high = v.high ?? 0;
  const moderate = v.moderate ?? 0;
  if (critical > 0 || high > 0) {
    return { check: "audit", status: "FAIL", detail: `${critical} critical, ${high} high vulnerabilities` };
  }
  if (moderate > 0) {
    return { check: "audit", status: "WARN", detail: `${moderate} moderate vulnerabilities` };
  }
  return { check: "audit", status: "PASS", detail: "no high/critical vulnerabilities" };
}
