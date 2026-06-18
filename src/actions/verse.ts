'use server'

import { createServerClient } from '@/lib/supabase/server'
import { dayIndex } from '@/lib/sandbox/daily'
import {
  makeCipher,
  invert,
  encode,
  solutionHash,
  smartStarterPairs,
  starterCount,
  gradeMapping,
  nextHintLetter,
  mulberry32,
  HINT_LADDER,
} from '@/lib/sandbox/cipher'

// "The Verse" server actions. The lyric bank (sandbox_verse_bank) is RLS-locked
// to the service role, so only this trusted server code can read it. We send the
// browser ONLY the ciphertext + a solution hash (+ a few revealed letters),
// never the plaintext — the real line is returned by `revealVerse` only after
// the player solves it, or by `giveUpVerse` when they explicitly give up. The
// lyric text therefore never appears in the repo and never reaches a browser
// unsolicited. `checkVerse` returns per-letter correctness as booleans only.

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
export type CheckResult = { ok: true; verdict: Record<string, boolean>; solved: boolean } | { ok: false; error: string }
export type Hint =
  | { ok: true; kind: 'letter'; cipher: string; plain: string }
  | { ok: true; kind: 'artist'; artist: string }
  | { ok: true; kind: 'song'; song: string }
  | { ok: false; error: string }
export type Difficulty = 'easy' | 'medium' | 'hard'
// Free-play themed collections. `undefined` = the general/shuffle pool (pack NULL),
// which is also the daily's pool. A named pack draws only from its own bank rows.
export type Pack = 'taylor' | 'blink' | 'bwc'
const PACKS: Pack[] = ['taylor', 'blink', 'bwc']

type Row = { id: number; line: string; song: string; artist: string }

// How many letters start revealed, as a fraction of the line's distinct letters
// (scaled so short and long lines feel comparable), with a floor. The daily uses
// `medium`. Letters chosen are the most useful ones (see smartStarterPairs).
const REVEAL: Record<Difficulty, { ratio: number; min: number }> = {
  easy: { ratio: 0.4, min: 2 },
  medium: { ratio: 0.22, min: 1 },
  hard: { ratio: 0.1, min: 0 },
}

// Ordered hint ladder (HINT_LADDER, in the pure module) gives cheap info first,
// capped: letter hints reveal the next useful letter; the last two give the
// artist then the song title.

function wordCountOf(line: string): number {
  return line.split(/\s+/).filter(Boolean).length
}

/** Build the wire-safe puzzle for a row + seed: cipher the line, reveal the most
 *  useful `starters` letters, and attach the solution hash so the client can
 *  detect a solve without ever holding the plaintext. */
function buildPuzzle(row: Row, seed: number, starters: number, no: number): Puzzle {
  const cipher = makeCipher(seed)
  return {
    ref: `${row.id}.${seed}`,
    cipherText: encode(row.line, cipher),
    hash: solutionHash(row.line),
    starters: smartStarterPairs(row.line, cipher, starters),
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

// A themed pack's rows, read through the token-gated verse_get_pack RPC (same
// security model as verse_get). Returns null when the token is missing or the
// pack is empty, so the caller can surface "come back soon".
async function packRows(pack: Pack): Promise<Row[] | null> {
  if (!VERSE_TOKEN) return null
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('verse_get_pack', { p_token: VERSE_TOKEN, p_pack: pack })
  if (error || !data || (data as Row[]).length === 0) return null
  return data as Row[]
}

async function rowById(id: number): Promise<Row | null> {
  const rows = await fetchRows(id)
  return rows && rows.length > 0 ? rows[0] : null
}

/** Today's puzzle: one line chosen deterministically from the active bank by the
 *  day index, so everyone who plays today gets the identical cryptogram. Medium
 *  difficulty (a few useful revealed letters) keeps the shared daily fair. */
export async function dailyVerse(): Promise<PuzzleResult> {
  const rows = await activeRows()
  if (!rows) return { ok: false, error: 'the bank is empty right now. come back soon.' }
  const di = dayIndex(new Date())
  const idx = Math.floor(mulberry32(di + SALT_DAILY)() * rows.length) % rows.length
  const seed = (di + SALT_DAILY) >>> 0
  const starters = starterCount(rows[idx].line, REVEAL.medium.ratio, REVEAL.medium.min)
  return { ok: true, puzzle: buildPuzzle(rows[idx], seed, starters, di - LAUNCH_DAY + 1) }
}

/** A fresh random puzzle for free-play. Difficulty sets how many letters start
 *  revealed (scaled to the line). An optional themed `pack` draws from that
 *  collection only; omitted = the general shuffle pool. Carries no streak. */
export async function randomVerse(difficulty: Difficulty = 'medium', pack?: Pack): Promise<PuzzleResult> {
  const rows = pack && PACKS.includes(pack) ? await packRows(pack) : await activeRows()
  if (!rows) {
    return {
      ok: false,
      error: pack ? 'this collection is still being curated. try another.' : 'the bank is empty right now. come back soon.',
    }
  }
  const row = rows[Math.floor(Math.random() * rows.length)]
  const seed = ((Math.random() * 0x7fffffff) | 0) >>> 0
  const r = REVEAL[difficulty]
  return { ok: true, puzzle: buildPuzzle(row, seed, starterCount(row.line, r.ratio, r.min), 0) }
}

/** Verify a submitted decoding. Returns the song/artist + the real line ONLY when
 *  the guess hashes to the stored solution — the reward, and the only unsolicited
 *  path by which the plaintext ever reaches the client. */
export async function revealVerse(ref: string, plainGuess: string): Promise<RevealResult> {
  const id = Number(String(ref).split('.')[0])
  if (!Number.isFinite(id)) return { ok: false, error: 'bad ref' }
  const row = await rowById(id)
  if (!row) return { ok: false, error: 'not found' }
  if (solutionHash(row.line) !== solutionHash(plainGuess)) return { ok: false, error: 'not solved yet' }
  return { ok: true, song: row.song, artist: row.artist, line: row.line }
}

/** Reveal the answer on a give-up. Returns the song/artist + line unconditionally
 *  — the player chose to stop, so the line is no longer a secret to protect. */
export async function giveUpVerse(ref: string): Promise<RevealResult> {
  const id = Number(String(ref).split('.')[0])
  if (!Number.isFinite(id)) return { ok: false, error: 'bad ref' }
  const row = await rowById(id)
  if (!row) return { ok: false, error: 'not found' }
  return { ok: true, song: row.song, artist: row.artist, line: row.line }
}

/** Grade the player's current mapping (cipher->plain) and report, per assigned
 *  letter, whether it is correct — plus whether the whole line is solved. Only
 *  booleans cross the wire; the plaintext never leaves the server. */
export async function checkVerse(ref: string, mapping: Record<string, string>): Promise<CheckResult> {
  const [idStr, seedStr] = String(ref).split('.')
  const id = Number(idStr)
  const seed = Number(seedStr)
  if (!Number.isFinite(id) || !Number.isFinite(seed)) return { ok: false, error: 'bad ref' }
  const row = await rowById(id)
  if (!row) return { ok: false, error: 'not found' }
  const cipher = makeCipher(seed)
  const trueKey = invert(cipher)
  const verdict = gradeMapping(mapping, trueKey)
  // present cipher letters = the distinct a-z of the ciphertext
  const cipherText = encode(row.line, cipher)
  let solved = true
  for (const ch of cipherText) {
    if (ch >= 'a' && ch <= 'z' && mapping[ch] !== trueKey[ch]) { solved = false; break }
  }
  return { ok: true, verdict, solved }
}

/** One hint along the fixed ladder (letter, letter, artist, song). `hintIndex`
 *  is the count of hints already taken. Letter hints reveal the next useful
 *  letter the player has not uncovered (re-derived from the seed, no server
 *  state); the cap is MAX_HINTS. */
export async function hintVerse(ref: string, hintIndex: number, known: string[] = []): Promise<Hint> {
  if (hintIndex < 0 || hintIndex >= HINT_LADDER.length) return { ok: false, error: 'no hints left' }
  const [idStr, seedStr] = String(ref).split('.')
  const id = Number(idStr)
  const seed = Number(seedStr)
  if (!Number.isFinite(id) || !Number.isFinite(seed)) return { ok: false, error: 'bad ref' }
  const row = await rowById(id)
  if (!row) return { ok: false, error: 'not found' }
  const kind = HINT_LADDER[hintIndex]
  if (kind === 'artist') return { ok: true, kind: 'artist', artist: row.artist }
  if (kind === 'song') return { ok: true, kind: 'song', song: row.song }
  const cipher = makeCipher(seed)
  const pick = nextHintLetter(row.line, cipher, known)
  // every letter already uncovered -> fall back to the artist, still useful
  if (!pick) return { ok: true, kind: 'artist', artist: row.artist }
  return { ok: true, kind: 'letter', cipher: pick[0], plain: pick[1] }
}
