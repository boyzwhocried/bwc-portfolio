// "The Rig" calibration scoring core (dialed.gg essence: deliberate practice).
// Each discipline turns a raw error into a 0..100 score on a fixed tolerance, so
// improvement is measurable and comparable run to run. Pure + deterministic.

/** Tolerances: the error at which a discipline's score hits 0. Tightened from
 *  the first cut (0.12 / 30 / 0.1) so a clean run takes a steadier eye. */
export const TOL = {
  bisect: 0.09, // fraction of a line
  angle: 24, // degrees
  position: 0.08, // fraction of a gauge
} as const

/** The golden section, (√5 − 1) / 2 — a target you cannot find by halving. */
export const GOLDEN = 0.6180339887498949

/** Linear score: 100 at zero error, 0 at (and beyond) tolerance. */
export function scoreLinear(err: number, tol: number): number {
  return Math.round(100 * Math.max(0, 1 - err / tol))
}

/** Smallest absolute angle between two bearings, across the 0/360 seam. */
export function circularDiffDeg(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360)
  return Math.min(d, 360 - d)
}

/** Score a click against any fraction target on the bar tolerance. The bisect/
 *  thirds/quarter/golden rounds are all this with a fixed target. */
export function scoreFraction(clickFrac: number, target: number, tol: number = TOL.bisect): number {
  return scoreLinear(Math.abs(clickFrac - target), tol)
}

export function scoreBisect(clickFrac: number): number {
  return scoreFraction(clickFrac, 0.5)
}

export function scoreThirds(clickFrac: number): number {
  return scoreFraction(clickFrac, 1 / 3)
}

export function scoreQuarter(clickFrac: number): number {
  return scoreFraction(clickFrac, 0.25)
}

export function scoreGolden(clickFrac: number): number {
  return scoreFraction(clickFrac, GOLDEN)
}

export function scoreAngle(targetDeg: number, gotDeg: number): number {
  return scoreLinear(circularDiffDeg(targetDeg, gotDeg), TOL.angle)
}

export function scorePosition(gotFrac: number, targetFrac: number): number {
  return scoreLinear(Math.abs(gotFrac - targetFrac), TOL.position)
}

export function aggregate(scores: number[]): number {
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

export function isPersonalBest(score: number, pb: number): boolean {
  return score > pb
}
