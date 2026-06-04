import { type ReportEntry } from "../report.ts";

export interface MetaInput {
  hasOgImage: boolean;
  hasSitemap: boolean;
  hasRobots: boolean;
  favicon: { ico: boolean; png: boolean; appleTouch: boolean; svg: boolean };
}

export function analyzeMeta(m: MetaInput): ReportEntry {
  if (m.favicon.svg) {
    return {
      check: "meta",
      status: "FAIL",
      detail: "icon.svg present: poisons iOS Safari, delete it (keep raster ico/png/apple-touch)",
    };
  }
  const missing: string[] = [];
  if (!m.hasOgImage) missing.push("og-image");
  if (!m.hasSitemap) missing.push("sitemap");
  if (!m.hasRobots) missing.push("robots");
  if (!m.favicon.ico) missing.push("favicon.ico");
  if (!m.favicon.png) missing.push("icon.png");
  if (!m.favicon.appleTouch) missing.push("apple-touch-icon");
  if (missing.length > 0) {
    return { check: "meta", status: "FAIL", detail: `missing: ${missing.join(", ")}` };
  }
  return { check: "meta", status: "PASS", detail: "og + sitemap + robots + favicon-set present, no svg" };
}
