// "The Impose" core — a daily 5x5 picross (nonogram). To impose is to lock type
// into the forme; here you fill the forme from the row/column ink counts until
// the hidden glyph appears. Pure + deterministic: the day fixes one grid for
// everyone. Grading is clue-based, so any fill that satisfies every clue counts
// as solved (not just the canonical bitmap).

import { dayIndex } from './daily'

export const PIC_SIZE = 5
export type Grid = boolean[][]

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

/** Runs of consecutive filled cells. Empty line -> [] (UI shows it as 0). */
export function lineClues(line: boolean[]): number[] {
  const runs: number[] = []
  let run = 0
  for (const c of line) {
    if (c) run++
    else if (run > 0) { runs.push(run); run = 0 }
  }
  if (run > 0) runs.push(run)
  return runs
}

export function rowClues(g: Grid): number[][] {
  return g.map((row) => lineClues(row))
}

export function colClues(g: Grid): number[][] {
  const size = g.length
  const cols: number[][] = []
  for (let c = 0; c < size; c++) cols.push(lineClues(g.map((row) => row[c])))
  return cols
}

/** Generate the day's solution. Reseeds until no row/column is fully empty and
 *  the fill is neither too sparse nor nearly full, so the clues stay interesting. */
export function dailyPicross(date: Date, size: number = PIC_SIZE): Grid {
  let seed = (dayIndex(date) + 0x50494358) >>> 0 // 'PICX'
  for (let attempt = 0; attempt < 12; attempt++) {
    const rng = mulberry32(seed)
    const g: Grid = Array.from({ length: size }, () => Array.from({ length: size }, () => rng() < 0.55))
    const total = g.flat().filter(Boolean).length
    const rowsOk = g.every((r) => r.some(Boolean))
    const colsOk = Array.from({ length: size }, (_, c) => g.some((r) => r[c])).every(Boolean)
    if (total >= size && total <= size * size - 3 && rowsOk && colsOk) return g
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  }
  const rng = mulberry32(seed)
  return Array.from({ length: size }, () => Array.from({ length: size }, () => rng() < 0.55))
}

/** Solved when the fill's clues match the solution's clues on every row and
 *  column. Accepts any clue-valid arrangement, not only the canonical bitmap. */
export function isSolved(fill: Grid, solution: Grid): boolean {
  const eq = (a: number[][], b: number[][]) => JSON.stringify(a) === JSON.stringify(b)
  return eq(rowClues(fill), rowClues(solution)) && eq(colClues(fill), colClues(solution))
}

/** Spoiler-free: states solved + streak, never the finished shape. */
export function buildImposeShare(dayIdx: number, solved: boolean, streak: number): string {
  return `BWC Impose #${dayIdx} ${solved ? 'solved ✓' : 'unsolved'}${streak > 0 ? ` · streak ${streak}` : ''}`
}
