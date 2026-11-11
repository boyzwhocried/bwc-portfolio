// Panitia Tetap, the stage 6 boss. Three phases by hp thirds; phase 3 can only be finished
// while the "headline" window is open. Everything is a function of hp and round time, so there
// is no extra match state to hash.

export type BossPhase = 1 | 2 | 3

// 1 Pernyataan (statement, armored special), 2 Rombak (the table reshuffles), 3 Tinjau Abadi (eternal review).
export function bossPhase(hp: number, maxHp: number): BossPhase {
  if (hp * 3 > maxHp * 2) return 1
  if (hp * 3 > maxHp) return 2
  return 3
}

// Phase 2 (Rombak): one chair is "in office" at a time, on the left or right of the table. Every phone ring
// moves it to the other side. A hit from the wrong side only does OFF_SEAT_PCT of its damage. It is a
// function of the ring count, so there is no extra match state to hash.
export const OFF_SEAT_PCT = 25

// -1 = left of the boss, 1 = right. Starts on the left, flips on every ring.
export function chairSide(reshuffles: number): -1 | 1 {
  return reshuffles % 2 === 0 ? -1 : 1
}

// Percent of a move's damage that lands on the boss: attackerX/bossX are world x.
export function seatPct(phase: BossPhase, attackerX: number, bossX: number, reshuffles: number): number {
  if (phase !== 2 || attackerX === bossX) return 100
  const side = attackerX < bossX ? -1 : 1
  return side === chairSide(reshuffles) ? 100 : OFF_SEAT_PCT
}

// Text on the boss plate. Phase 2 arrows point at the chair in office: stand on that side to hit for full damage.
export function bossPlate(phase: BossPhase, headlineUp: boolean, reshuffles: number): string {
  if (phase === 3) return headlineUp ? 'LIVE: HIT NOW' : 'TINJAU ABADI'
  if (phase === 1) return 'PERNYATAAN'
  return chairSide(reshuffles) === -1 ? '<< ROMBAK' : 'ROMBAK >>'
}

export const REVIEW_CYCLE = 10 * 60
export const REVIEW_OPEN = 3 * 60
export const BOSS_RING_FRAMES = 5 * 60

// elapsed = live frames into the round. A ticker headline is on screen for 3 of every 10 seconds.
export function reviewOpen(elapsed: number): boolean {
  return ((elapsed % REVIEW_CYCLE) + REVIEW_CYCLE) % REVIEW_CYCLE < REVIEW_OPEN
}
