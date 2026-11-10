export const STEP_MS = 1000 / 60
export const MAX_STEPS = 5

// Fixed-step accumulator. A long stall (hidden tab, slow device) is capped to
// MAX_STEPS and the backlog is dropped, so the sim never spirals trying to catch up.
export function advance(accum: number, dtMs: number): { steps: number; accum: number } {
  if (!Number.isFinite(dtMs) || dtMs < 0) return { steps: 0, accum }
  let a = accum + dtMs
  const steps = Math.floor(a / STEP_MS)
  a -= steps * STEP_MS
  if (steps > MAX_STEPS) return { steps: MAX_STEPS, accum: 0 }
  return { steps, accum: a }
}
