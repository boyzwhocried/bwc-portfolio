import { assertEquals } from "@std/assert";
import { aggregate, worst } from "./report.ts";

Deno.test("worst returns FAIL when any FAIL present", () => {
  assertEquals(worst(["PASS", "WARN", "FAIL"]), "FAIL");
});

Deno.test("worst returns WARN when a WARN but no FAIL", () => {
  assertEquals(worst(["PASS", "WARN", "PASS"]), "WARN");
});

Deno.test("worst returns PASS when all PASS", () => {
  assertEquals(worst(["PASS", "PASS"]), "PASS");
});

Deno.test("worst of empty list is PASS", () => {
  assertEquals(worst([]), "PASS");
});

Deno.test("aggregate sets overall to worst entry status", () => {
  const r = aggregate([
    { check: "a", status: "PASS", detail: "" },
    { check: "b", status: "FAIL", detail: "" },
  ]);
  assertEquals(r.overall, "FAIL");
});
