// "The Rig" calibration scoring core (dialed.gg essence: deliberate practice).
// Each discipline turns a raw error into a 0..100 score on a fixed tolerance, so
// improvement is measurable and comparable run to run. Pure + deterministic.

/** Tolerances: the error at which a discipline's score hits 0. */
export const TOL = {
  bisect: 0.12, // fraction of a line
  angle: 30, // degrees
  position: 0.1, // fraction of a gauge
} as const

/** Linear score: 100 at zero error, 0 at (and beyond) tolerance. */
export function scoreLinear(err: number, tol: number): number {
  return Math.round(100 * Math.max(0, 1 - err / tol))
}

/** Smallest absolute angle between two bearings, across the 0/360 seam. */
export function circularDiffDeg(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360)
  return Math.min(d, 360 - d)
}

export function scoreBisect(clickFrac: number): number {
  return scoreLinear(Math.abs(clickFrac - 0.5), TOL.bisect)
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
