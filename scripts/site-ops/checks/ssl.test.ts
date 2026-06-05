import { assertEquals } from "@std/assert";
import { analyzeSsl } from "./ssl.ts";

Deno.test("ssl FAIL under 7 days", () => {
  assertEquals(analyzeSsl({ daysToExpiry: 3 }).status, "FAIL");
});

Deno.test("ssl WARN under 21 days", () => {
  assertEquals(analyzeSsl({ daysToExpiry: 14 }).status, "WARN");
});

Deno.test("ssl PASS at 60 days", () => {
  assertEquals(analyzeSsl({ daysToExpiry: 60 }).status, "PASS");
});

Deno.test("ssl FAIL at 6 days, WARN at 20 days", () => {
  assertEquals(analyzeSsl({ daysToExpiry: 6 }).status, "FAIL");
  assertEquals(analyzeSsl({ daysToExpiry: 20 }).status, "WARN");
});
