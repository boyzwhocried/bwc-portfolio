const W = 320
const H = 180
const SNAP = 0.15 // within this of a whole number, snap down so pixels stay crisp

// Largest scale that fits the box. Whole numbers where the box is close to one, a fraction
// elsewhere so the picture fills a phone screen instead of falling back to a small integer step.
export function fitScale(boxW: number, boxH: number): number {
  if (!(boxW > 0) || !(boxH > 0)) return 1
  const fit = Math.min(boxW / W, boxH / H)
  const whole = Math.floor(fit)
  if (whole >= 1 && fit - whole < SNAP) return whole
  return Math.max(0.25, Math.floor(fit * 100) / 100)
}
