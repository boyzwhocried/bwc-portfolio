'use server'

import { createServerClient } from '@/lib/supabase/server'
import { dayIndex } from '@/lib/sandbox/daily'
import {
  makeCipher,
  encode,
  solutionHash,
  starterPairs,
  mulberry32,
  normalize,
} from '@/lib/sandbox/cipher'

// "The Verse" server actions. The lyric bank (sandbox_verse_bank) is RLS-locked
// to the service role, so only this trusted server code can read it. We send the
// browser ONLY the ciphertext + a solution hash (+ a couple of revealed letters),
// never the plaintext — the real line is returned by `revealVerse` exclusively
// after the player submits a guess that hashes to the answer. The lyric text
// therefore never appears in the repo and never reaches a browser unsolved.

const SALT_DAILY = 0x56455253 // 'VERS'
// puzzle #1 is the launch day; mirrors the other dailies' numbering
const LAUNCH_DAY = Math.floor(Date.parse('2026-06-18T00:00:00Z') / 86_400_000)

export type Puzzle = {
  ref: string
  cipherText: string
  hash: number
  starters: Array<[string, string]>
  wordCount: number
  no: number // daily puzzle number; 0 for free-play
}
export type PuzzleResult = { ok: true; puzzle: Puzzle } | { ok: false; error: string }
export type RevealResult = { ok: true; song: string; artist: string; line: string } | { ok: false; error: string }
export type HintResult = { ok: true; cipher: string; plain: string } | { ok: false; error: string }
export type Difficulty = 'easy' | 'medium' | 'hard'

type Row = { id: number; line: string; song: string; artist: string }

const STARTER_COUNT: Record<Difficulty, number> = { easy: 3, medium: 1, hard: 0 }

function wordCountOf(line: string): number {
  return line.split(/\s+/).filter(Boolean).length
}

/** Build the wire-safe puzzle for a row + seed: cipher the line, reveal `starters`
 *  letters, and attach the solution hash so the client can detect a solve without
 *  ever holding the plaintext. */
function buildPuzzle(row: Row, seed: number, starters: number, no: number): Puzzle {
  const cipher = makeCipher(seed)
  const pairs = starterPairs(row.line, cipher, starters, mulberry32(seed ^ 0x5bd1e995))
  return {
    ref: `${row.id}.${seed}`,
    cipherText: encode(row.line, cipher),
    hash: solutionHash(row.line),
    starters: pairs,
    wordCount: wordCountOf(row.line),
    no,
  }
}

// The bank is RLS-locked. We read it through the token-gated `verse_get`
// SECURITY DEFINER RPC using the anon key + a server-only token, so the lyric
// text never reaches anon callers (no token -> empty) and the read does not
// depend on the service-role key.
const VERSE_TOKEN = process.env.VERSE_TOKEN

async function fetchRows(id?: number): Promise<Row[] | null> {
  if (!VERSE_TOKEN) return null
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('verse_get', { p_token: VERSE_TOKEN, p_id: id ?? null })
  if (error || !data || (data as Row[]).length === 0) return null
  return data as Row[]
}

async function activeRows(): Promise<Row[] | null> {
  return fetchRows()
}

async function rowById(id: number): Promise<Row | null> {
  const rows = await fetchRows(id)
  return rows && rows.length > 0 ? rows[0] : null
}

/** Today's puzzle: one line chosen deterministically from the active bank by the
 *  day index, so everyone who plays today gets the identical cryptogram. Medium
 *  difficulty (one revealed letter) keeps the shared daily fair. */
export async function dailyVerse(): Promise<PuzzleResult> {
  const rows = await activeRows()
  if (!rows) return { ok: false, error: 'the bank is empty right now. come back soon.' }
  const di = dayIndex(new Date())
  const idx = Math.floor(mulberry32(di + SALT_DAILY)() * rows.length) % rows.length
  const seed = (di + SALT_DAILY) >>> 0
  return { ok: true, puzzle: buildPuzzle(rows[idx], seed, STARTER_COUNT.medium, di - LAUNCH_DAY + 1) }
}

/** A fresh random puzzle for free-play. Difficulty sets how many letters start
 *  revealed. Not tied to the date and carries no streak. */
export async function randomVerse(difficulty: Difficulty = 'medium'): Promise<PuzzleResult> {
  const rows = await activeRows()
  if (!rows) return { ok: false, error: 'the bank is empty right now. come back soon.' }
  const row = rows[Math.floor(Math.random() * rows.length)]
  const seed = ((Math.random() * 0x7fffffff) | 0) >>> 0
  return { ok: true, puzzle: buildPuzzle(row, seed, STARTER_COUNT[difficulty], 0) }
}

/** Verify a submitted decoding. Returns the song/artist + the real line ONLY when
 *  the guess hashes to the stored solution — the reward, and the only path by
 *  which the plaintext ever reaches the client. */
export async function revealVerse(ref: string, plainGuess: string): Promise<RevealResult> {
  const id = Number(String(ref).split('.')[0])
  if (!Number.isFinite(id)) return { ok: false, error: 'bad ref' }
  const row = await rowById(id)
  if (!row) return { ok: false, error: 'not found' }
  if (solutionHash(row.line) !== solutionHash(plainGuess)) return { ok: false, error: 'not solved yet' }
  return { ok: true, song: row.song, artist: row.artist, line: row.line }
}

/** Reveal one more correct letter on demand. Returns a [cipher, plain] pair the
 *  player has not uncovered yet, re-deriving the cipher from the ref's seed so no
 *  state is kept server-side. One letter at a time — never the whole answer. */
export async function hintVerse(ref: string, known: string[] = []): Promise<HintResult> {
  const [idStr, seedStr] = String(ref).split('.')
  const id = Number(idStr)
  const seed = Number(seedStr)
  if (!Number.isFinite(id) || !Number.isFinite(seed)) return { ok: false, error: 'bad ref' }
  const row = await rowById(id)
  if (!row) return { ok: false, error: 'not found' }
  const cipher = makeCipher(seed)
  const knownSet = new Set(known)
  const present = Array.from(new Set(normalize(row.line).split('')))
  const candidates = present
    .map((plain) => [cipher[plain], plain] as [string, string])
    .filter(([c]) => !knownSet.has(c))
  if (candidates.length === 0) return { ok: false, error: 'no hints left' }
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  return { ok: true, cipher: pick[0], plain: pick[1] }
}
