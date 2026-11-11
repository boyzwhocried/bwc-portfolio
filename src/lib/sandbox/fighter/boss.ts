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

export const REVIEW_CYCLE = 10 * 60
export const REVIEW_OPEN = 3 * 60
export const BOSS_RING_FRAMES = 5 * 60

// elapsed = live frames into the round. A ticker headline is on screen for 3 of every 10 seconds.
export function reviewOpen(elapsed: number): boolean {
  return ((elapsed % REVIEW_CYCLE) + REVIEW_CYCLE) % REVIEW_CYCLE < REVIEW_OPEN
}
