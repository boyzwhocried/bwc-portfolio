import { assertEquals } from "@std/assert";
import { analyzeDeprecation } from "./deprecation.ts";

Deno.test("deprecation WARN on stale major", () => {
  const r = analyzeDeprecation([{ name: "next", currentMajor: 15, latestMajor: 16 }]);
  assertEquals(r.status, "WARN");
});

Deno.test("deprecation PASS when all on latest major", () => {
  const r = analyzeDeprecation([
    { name: "react", currentMajor: 19, latestMajor: 19 },
    { name: "next", currentMajor: 16, latestMajor: 16 },
  ]);
  assertEquals(r.status, "PASS");
});

Deno.test("deprecation PASS on empty deps", () => {
  assertEquals(analyzeDeprecation([]).status, "PASS");
});
