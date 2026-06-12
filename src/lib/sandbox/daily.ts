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

export type Feedback = { exact: number; present: number }

/** Mastermind scoring with correct duplicate handling. */
export function scoreGuess(guess: number[], code: number[]): Feedback {
  let exact = 0
  const codeCount = new Array(PALETTE_SIZE).fill(0)
  const guessCount = new Array(PALETTE_SIZE).fill(0)
  for (let i = 0; i < code.length; i++) {
    if (guess[i] === code[i]) exact++
    else {
      codeCount[code[i]]++
      guessCount[guess[i]]++
    }
  }
  let present = 0
  for (let c = 0; c < PALETTE_SIZE; c++) present += Math.min(codeCount[c], guessCount[c])
  return { exact, present }
}

export function isWin(fb: Feedback): boolean {
  return fb.exact === CODE_LEN
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

/** Spoiler-free emoji result grid for sharing. */
export function buildShareGrid(dayIdx: number, rows: Feedback[], solved: boolean): string {
  const head = `BWC Daily #${dayIdx} ${solved ? `${rows.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`}`
  const body = rows
    .map((r) => {
      const miss = CODE_LEN - r.exact - r.present
      return '🟥'.repeat(r.exact) + '🟨'.repeat(r.present) + '⬜'.repeat(Math.max(0, miss))
    })
    .join('\n')
  return `${head}\n${body}`
}
