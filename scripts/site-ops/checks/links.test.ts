import { assertEquals } from "@std/assert";
import { analyzeLinks } from "./links.ts";

Deno.test("links FAIL on dead internal", () => {
  const r = analyzeLinks([{ url: "/about", kind: "internal", status: 404 }]);
  assertEquals(r.status, "FAIL");
});

Deno.test("links FAIL on dead live_url", () => {
  const r = analyzeLinks([{ url: "https://x.app", kind: "live_url", status: 0 }]);
  assertEquals(r.status, "FAIL");
});

Deno.test("links WARN on dead external only", () => {
  const r = analyzeLinks([
    { url: "/", kind: "internal", status: 200 },
    { url: "https://ext.com", kind: "external", status: 500 },
  ]);
  assertEquals(r.status, "WARN");
});

Deno.test("links PASS when all ok", () => {
  const r = analyzeLinks([
    { url: "/", kind: "internal", status: 200 },
    { url: "https://x.app", kind: "live_url", status: 200 },
  ]);
  assertEquals(r.status, "PASS");
});
