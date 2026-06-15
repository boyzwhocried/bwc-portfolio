// "The Proof" core — a daily proofreading hunt. A letterpress proof is the trial
// print you scan for slips before the real run. We set a clean line of type, then
// plant a few transposed/substituted letters; the player clicks the bad words.
// Pure + deterministic: the day alone fixes the line and the slips, so everyone
// gets the identical proof with zero content pipeline.

import { dayIndex } from './daily'

export const PROOF_SLIPS = 3

// mulberry32 — same tiny PRNG the lockup uses, so a day maps to one fixed proof
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

// clean source lines (lowercase, letters + spaces only). Procedural corruption
// keeps content fresh without authoring a puzzle a day.
const BANK = [
  'set the type and pull a clean proof tonight',
  'jakarta runs on coffee and quiet ambition',
  'every pixel earns its place on the page',
  'good design hides the seams from the reader',
  'ink dries slower than a deadline approaches',
  'measure twice and cut the column once',
  'a steady hand beats a clever shortcut',
  'the press remembers every careless mistake',
  'small type rewards the patient reader greatly',
  'proof the page before the long run begins',
  'the quick brown fox jumps over lazy dogs',
  'kerning leaves a little room to breathe',
]

export type Proof = { phrase: string; clean: string[]; display: string[]; errors: number[] }

/** Corrupt one word into a plausible typo of the same length: transpose two
 *  differing adjacent letters, or (if none) nudge one letter to a neighbour.
 *  Always returns a string distinct from the input. */
export function corruptWord(word: string, rng: () => number): string {
  const swappable: number[] = []
  for (let i = 0; i < word.length - 1; i++) if (word[i] !== word[i + 1]) swappable.push(i)
  if (swappable.length > 0) {
    const i = swappable[Math.floor(rng() * swappable.length)]
    return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2)
  }
  // fallback: substitute a single letter (z wraps down to y, otherwise next letter)
  const i = Math.floor(rng() * word.length)
  const code = word.charCodeAt(i)
  const repl = String.fromCharCode(code === 122 ? 121 : code + 1)
  return word.slice(0, i) + repl + word.slice(i + 1)
}

export function dailyProof(date: Date): Proof {
  const rng = mulberry32(dayIndex(date) + 0x50524f46) // 'PROF'
  const phrase = BANK[Math.floor(rng() * BANK.length)]
  const clean = phrase.split(' ')
  const eligible = clean.map((w, i) => ({ w, i })).filter((x) => x.w.length >= 3).map((x) => x.i)

  const errors: number[] = []
  const pool = eligible.slice()
  for (let k = 0; k < PROOF_SLIPS && pool.length > 0; k++) {
    const j = Math.floor(rng() * pool.length)
    errors.push(pool[j])
    pool.splice(j, 1)
  }
  errors.sort((a, b) => a - b)

  const display = clean.slice()
  for (const i of errors) display[i] = corruptWord(clean[i], rng)
  return { phrase, clean, display, errors }
}

export type ProofGrade = { caught: number; missed: number; falseMarks: number; total: number; win: boolean }

export function gradeProof(marked: number[], errors: number[]): ProofGrade {
  const E = new Set(errors)
  const M = new Set(marked)
  let caught = 0
  for (const m of M) if (E.has(m)) caught++
  const missed = errors.length - caught
  const falseMarks = M.size - caught
  return { caught, missed, falseMarks, total: errors.length, win: caught === errors.length && falseMarks === 0 }
}

/** Spoiler-free share: one tile per planted slip (caught green, missed white),
 *  plus a red tile per false mark. Never reveals which words were wrong. */
export function buildProofShare(dayIdx: number, errors: number[], marked: number[], win: boolean): string {
  const M = new Set(marked)
  const caught = errors.filter((e) => M.has(e)).length
  const head = `BWC Proof #${dayIdx} ${win ? `${errors.length}/${errors.length}` : `${caught}/${errors.length}`}`
  const body = errors.map((e) => (M.has(e) ? '🟩' : '⬜')).join('')
  const falses = Math.max(0, M.size - caught)
  const fb = falses > 0 ? ' ' + '🟥'.repeat(falses) : ''
  return `${head}\n${body}${fb}`
}
