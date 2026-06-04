import { assertEquals } from "@std/assert";
import { analyzeAudit } from "./audit.ts";

Deno.test("audit FAIL on critical", () => {
  assertEquals(analyzeAudit({ metadata: { vulnerabilities: { critical: 1 } } }).status, "FAIL");
});

Deno.test("audit FAIL on high", () => {
  assertEquals(analyzeAudit({ metadata: { vulnerabilities: { high: 2 } } }).status, "FAIL");
});

Deno.test("audit WARN on moderate only", () => {
  assertEquals(analyzeAudit({ metadata: { vulnerabilities: { moderate: 3 } } }).status, "WARN");
});

Deno.test("audit PASS on clean metadata", () => {
  assertEquals(analyzeAudit({ metadata: { vulnerabilities: { info: 0 } } }).status, "PASS");
});

Deno.test("audit PASS on empty input", () => {
  assertEquals(analyzeAudit({}).status, "PASS");
});
