// PARRY arcade core. Deterministic: a seed fixes the entire enemy schedule, and
// `replay(seed, inputs)` recomputes the authoritative score from the raw key
// presses. The live game and the server use the SAME function, so the server can
// re-derive any submitted score from its inputs (cheat-resistant leaderboard).

export const LIVES = 3
export const PERFECT_WINDOW = 70 // ms; |dt| <= this == perfect
export const GOOD_WINDOW = 150 // ms; |dt| <= this (but > perfect) == good
export const DIRS = 4 // up/right/down/left

const START_GAP = 900 // ms between the first arrivals
const MIN_GAP = 260 // floor the tempo ramps toward
const RAMP = 7 // ms tighter per enemy

export type Enemy = { time: number; dir: number }
export type Input = { time: number; dir: number }
export type Rating = 'perfect' | 'good' | 'miss'
export type Result = { score: number; parries: number; maxCombo: number; lives: number; rating: Rating[] }

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic enemy schedule: arrival times escalate, directions from the seed. */
export function schedule(seed: number, n: number): Enemy[] {
  const rng = mulberry32(seed + 0x1234567)
  const out: Enemy[] = []
  let t = 0
  for (let i = 0; i < n; i++) {
    const gap = Math.max(MIN_GAP, START_GAP - i * RAMP)
    t += gap
    out.push({ time: Math.round(t), dir: Math.floor(rng() * DIRS) })
  }
  return out
}

/** Authoritative scoring from raw inputs. Pure + deterministic. */
export function replay(seed: number, inputs: Input[], maxEnemies = 400): Result {
  const enemies = schedule(seed, maxEnemies)
  const used = new Array(inputs.length).fill(false)
  let lives = LIVES
  let combo = 0
  let score = 0
  let parries = 0
  let maxCombo = 0
  const rating: Rating[] = []

  for (const e of enemies) {
    if (lives <= 0) break
    // best unused input matching this enemy's direction within the good window
    let best = -1
    let bestDt = Infinity
    for (let k = 0; k < inputs.length; k++) {
      if (used[k]) continue
      if (inputs[k].dir !== e.dir) continue
      const dt = Math.abs(inputs[k].time - e.time)
      if (dt <= GOOD_WINDOW && dt < bestDt) {
        bestDt = dt
        best = k
      }
    }
    if (best === -1) {
      lives--
      combo = 0
      rating.push('miss')
      continue
    }
    used[best] = true
    parries++
    if (bestDt <= PERFECT_WINDOW) {
      combo++
      maxCombo = Math.max(maxCombo, combo)
      score += 10 * combo
      rating.push('perfect')
    } else {
      // good keeps you alive but does not build the combo
      score += 5
      rating.push('good')
    }
  }

  return { score, parries, maxCombo, lives, rating }
}
