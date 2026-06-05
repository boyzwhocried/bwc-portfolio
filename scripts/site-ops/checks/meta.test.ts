import { assertEquals } from "@std/assert";
import { analyzeMeta, type MetaInput } from "./meta.ts";

const full: MetaInput = {
  hasOgImage: true,
  hasSitemap: true,
  hasRobots: true,
  favicon: { ico: true, png: true, appleTouch: true, svg: false },
};

Deno.test("meta PASS when complete and no svg", () => {
  assertEquals(analyzeMeta(full).status, "PASS");
});

Deno.test("meta FAIL when icon.svg present (iOS poison)", () => {
  assertEquals(analyzeMeta({ ...full, favicon: { ...full.favicon, svg: true } }).status, "FAIL");
});

Deno.test("meta FAIL when sitemap missing", () => {
  assertEquals(analyzeMeta({ ...full, hasSitemap: false }).status, "FAIL");
});

Deno.test("meta FAIL when apple-touch missing", () => {
  assertEquals(analyzeMeta({ ...full, favicon: { ...full.favicon, appleTouch: false } }).status, "FAIL");
});
