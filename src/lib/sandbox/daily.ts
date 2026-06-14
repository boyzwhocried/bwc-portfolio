// "The Daily" code-break core (Mastermind essence). Pure + deterministic so the
// whole puzzle is reproducible from the date alone -> a fresh, identical-for-
// everyone puzzle every day, forever, with zero content pipeline.

export const CODE_LEN = 4
export const PALETTE_SIZE = 6
export const MAX_GUESSES = 6

const MS_PER_DAY = 86_400_000

/** Whole days since the Unix epoch in UTC. The puzzle id. */
export function dayIndex(date: Date): number {
  return Math.floor(date.getTime() / MS_PER_DAY)
}

// small deterministic PRNG (mulberry32) so a day -> one fixed code
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

export function dailyCode(date: Date): number[] {
  const rng = mulberry32(dayIndex(date) + 0x9e3779b9)
  return Array.from({ length: CODE_LEN }, () => Math.floor(rng() * PALETTE_SIZE))
}

export type Mark = 'hit' | 'present' | 'miss'

/** Wordle-style PER-POSITION scoring with correct duplicate handling: an exact
 *  match is a `hit`; a guessed colour that exists elsewhere in the (not-yet-
 *  consumed) code is `present`; otherwise `miss`. Each code peg is matched at
 *  most once, so two guessed reds against one code red yield one present + one
 *  miss. The returned array lines up 1:1 with the guess by position. */
export function markGuess(guess: number[], code: number[]): Mark[] {
  const marks: Mark[] = new Array(code.length).fill('miss')
  const pool = new Array(PALETTE_SIZE).fill(0)
  // first pass: lock exact hits, pool every non-hit code peg
  for (let i = 0; i < code.length; i++) {
    if (guess[i] === code[i]) marks[i] = 'hit'
    else pool[code[i]]++
  }
  // second pass: right colour, wrong spot, drawing from the remaining pool
  for (let i = 0; i < code.length; i++) {
    if (marks[i] === 'hit') continue
    if (pool[guess[i]] > 0) { marks[i] = 'present'; pool[guess[i]]-- }
  }
  return marks
}

export function isWin(marks: Mark[]): boolean {
  return marks.length === CODE_LEN && marks.every((m) => m === 'hit')
}

export type StreakState = { lastDay: number; streak: number; best: number }

/** Pure streak transition. `today` is a dayIndex; `won` is the day's result. */
export function updateStreak(prev: StreakState | null, today: number, won: boolean): StreakState {
  if (!won) return { lastDay: today, streak: 0, best: prev?.best ?? 0 }
  const continued = prev && prev.lastDay === today - 1
  const streak = continued ? prev!.streak + 1 : 1
  const best = Math.max(prev?.best ?? 0, streak)
  return { lastDay: today, streak, best }
}

/** Spoiler-free emoji result grid for sharing (positional, Wordle-style). */
export function buildShareGrid(dayIdx: number, rows: Mark[][], solved: boolean): string {
  const head = `BWC Daily #${dayIdx} ${solved ? `${rows.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`}`
  const glyph: Record<Mark, string> = { hit: '🟩', present: '🟨', miss: '⬜' }
  const body = rows.map((r) => r.map((m) => glyph[m]).join('')).join('\n')
  return `${head}\n${body}`
}
