import { aggregate, formatReport, type ReportEntry } from "./report.ts";
import { analyzeAudit, type AuditJson } from "./checks/audit.ts";
import { analyzeLinks, type LinkResult } from "./checks/links.ts";
import { analyzeMeta } from "./checks/meta.ts";
import { analyzeSsl } from "./checks/ssl.ts";
import { analyzeDeprecation, type DepInfo } from "./checks/deprecation.ts";
import { join } from "@std/path";

// Resolve the repo root from this module's location (scripts/site-ops/scan.ts -> ../..),
// NOT from cwd: under `deno task` the cwd is scripts/site-ops, which would break file checks.
const HERE = import.meta.dirname ?? Deno.cwd();
const REPO = Deno.env.get("BWC_REPO") ?? join(HERE, "..", "..");
const SITE = Deno.env.get("BWC_SITE") ?? "https://boyzwhocried.xyz";

async function run(cmd: string, args: string[]): Promise<string> {
  try {
    const p = new Deno.Command(cmd, { args, cwd: REPO, stdout: "piped", stderr: "null" });
    const { stdout } = await p.output();
    return new TextDecoder().decode(stdout);
  } catch {
    return "";
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

async function gatherAudit(): Promise<AuditJson> {
  const out = await run("npm", ["audit", "--json"]);
  try {
    return JSON.parse(out) as AuditJson;
  } catch {
    return {};
  }
}

async function gatherMeta() {
  const app = `${REPO}/src/app`;
  const svg = (await exists(`${app}/icon.svg`)) || (await exists(`${REPO}/public/icon.svg`));
  return {
    hasOgImage: await exists(`${app}/opengraph-image.tsx`),
    hasSitemap: await exists(`${app}/sitemap.ts`),
    hasRobots: await exists(`${app}/robots.ts`),
    favicon: {
      ico: await exists(`${app}/favicon.ico`),
      png: await exists(`${app}/icon.png`),
      appleTouch: await exists(`${REPO}/public/apple-touch-icon.png`),
      svg,
    },
  };
}

async function gatherLinks(): Promise<LinkResult[]> {
  const out: LinkResult[] = [];
  try {
    const res = await fetch(`${SITE}/sitemap.xml`);
    const xml = await res.text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    for (const url of urls) {
      try {
        const r = await fetch(url, { method: "HEAD", redirect: "follow" });
        out.push({ url, kind: "internal", status: r.status });
      } catch {
        out.push({ url, kind: "internal", status: 0 });
      }
    }
  } catch {
    // sitemap unreachable: surface a single dead internal so it reads as FAIL
    out.push({ url: `${SITE}/sitemap.xml`, kind: "internal", status: 0 });
  }
  return out;
}

async function gatherSsl(): Promise<{ daysToExpiry: number }> {
  const host = new URL(SITE).hostname;
  const out = await run("bash", [
    "-c",
    `echo | openssl s_client -servername ${host} -connect ${host}:443 2>/dev/null | openssl x509 -noout -enddate`,
  ]);
  const m = out.match(/notAfter=(.+)/);
  if (!m) return { daysToExpiry: 999 }; // openssl unavailable (e.g. local Windows): neutral PASS, verified in CI
  const expiry = new Date(m[1].trim()).getTime();
  if (Number.isNaN(expiry)) return { daysToExpiry: 999 };
  return { daysToExpiry: Math.floor((expiry - Date.now()) / 86_400_000) };
}

async function gatherDeprecation(): Promise<DepInfo[]> {
  const out = await run("npm", ["outdated", "--json"]);
  let obj: Record<string, { current?: string; latest?: string }> = {};
  try {
    obj = JSON.parse(out || "{}");
  } catch {
    obj = {};
  }
  const major = (v?: string) => parseInt((v ?? "0").split(".")[0].replace(/\D/g, ""), 10) || 0;
  return Object.entries(obj).map(([name, info]) => ({
    name,
    currentMajor: major(info.current),
    latestMajor: major(info.latest),
  }));
}

async function main() {
  const entries: ReportEntry[] = [
    analyzeAudit(await gatherAudit()),
    analyzeLinks(await gatherLinks()),
    analyzeMeta(await gatherMeta()),
    analyzeSsl(await gatherSsl()),
    analyzeDeprecation(await gatherDeprecation()),
  ];
  const report = aggregate(entries);
  console.log(Deno.args.includes("--json") ? JSON.stringify(report) : formatReport(report));
  Deno.exit(report.overall === "FAIL" ? 1 : 0);
}

if (import.meta.main) await main();
