// "The Verse" core — a daily cryptogram over song lyrics. A line is encrypted
// with a monoalphabetic substitution cipher (each letter maps to one distinct
// other letter, never itself) and the player decodes it. Pure + deterministic:
// the cipher is fixed by a seed, so the server can build the puzzle and the
// client can score it from the same functions.
//
// The lyric TEXT never lives in this file or the repo — it is served from
// Supabase and only the CIPHERTEXT + a solution hash reach the browser, so the
// plaintext is revealed only after the player has actually solved it.

export const ALPHA = 'abcdefghijklmnopqrstuvwxyz'

// mulberry32 — the same tiny PRNG the other dailies use, so a seed maps to one
// fixed permutation.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A deterministic substitution cipher keyed plain -> cipher. It is a true
 *  derangement: no letter ever encodes to itself (that would leak a slot). We
 *  reroll Fisher-Yates shuffles until one has no fixed point — at ~37% odds per
 *  try a clean derangement is found almost immediately; the rotate fallback can
 *  never actually be reached. */
export function makeCipher(seed: number): Record<string, string> {
  const rng = mulberry32(seed)
  for (let attempt = 0; attempt < 100; attempt++) {
    const arr = ALPHA.split('')
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    let ok = true
    for (let i = 0; i < 26; i++) if (arr[i] === ALPHA[i]) { ok = false; break }
    if (ok) {
      const m: Record<string, string> = {}
      for (let i = 0; i < 26; i++) m[ALPHA[i]] = arr[i]
      return m
    }
  }
  // unreachable in practice: a guaranteed derangement (rotate by one)
  const m: Record<string, string> = {}
  for (let i = 0; i < 26; i++) m[ALPHA[i]] = ALPHA[(i + 1) % 26]
  return m
}

/** Flip a mapping's direction (plain<->cipher). */
export function invert(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of Object.keys(map)) out[map[k]] = k
  return out
}

/** Encrypt a plaintext line. Letters are substituted via `cipher` (plain->cipher);
 *  everything else (spaces, punctuation, digits) passes through untouched, so the
 *  word shapes the player reasons about are preserved. */
export function encode(plain: string, cipher: Record<string, string>): string {
  let out = ''
  for (const ch of plain.toLowerCase()) out += cipher[ch] ?? ch
  return out
}

/** Apply a partial guess mapping (cipher->plain) to the ciphertext. Cipher
 *  letters the player has not assigned become '_' (a non-letter), so a partial
 *  board can never normalize into the solution by accident. */
export function decode(cipherText: string, mapping: Record<string, string>): string {
  let out = ''
  for (const ch of cipherText) {
    if (ch >= 'a' && ch <= 'z') out += mapping[ch] ?? '_'
    else out += ch
  }
  return out
}

/** FNV-1a, 32-bit. Cheap, dependency-free, and identical in Node and the
 *  browser — used to check a solve without shipping the plaintext. */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Reduce any string to comparable letters only: lowercase, a-z, nothing else.
 *  Spacing and punctuation never affect whether a solve counts. */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '')
}

export function solutionHash(plain: string): number {
  return fnv1a(normalize(plain))
}

/** True only when the player's mapping decodes the ciphertext to the solution. */
export function isSolved(cipherText: string, mapping: Record<string, string>, hash: number): boolean {
  return fnv1a(normalize(decode(cipherText, mapping))) === hash
}

/** Cipher-letter frequencies, most common first — the classic solver's aid. */
export function letterFrequencies(cipherText: string): Array<{ letter: string; count: number }> {
  const counts: Record<string, number> = {}
  for (const ch of cipherText) if (ch >= 'a' && ch <= 'z') counts[ch] = (counts[ch] ?? 0) + 1
  return Object.entries(counts)
    .map(([letter, count]) => ({ letter, count }))
    .sort((a, b) => b.count - a.count || (a.letter < b.letter ? -1 : 1))
}

/** Pick `n` revealed letters: distinct plaintext letters that appear in the line,
 *  returned as [cipherLetter, plainLetter] so the UI can lock those slots. Capped
 *  at the number of distinct letters actually present. Deterministic given `rng`. */
export function starterPairs(
  plain: string,
  cipher: Record<string, string>,
  n: number,
  rng: () => number,
): Array<[string, string]> {
  const present = Array.from(new Set(normalize(plain).split('')))
  // shuffle a copy deterministically, then take the first n
  for (let i = present.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[present[i], present[j]] = [present[j], present[i]]
  }
  return present.slice(0, Math.max(0, n)).map((p) => [cipher[p], p] as [string, string])
}

/** Distinct plaintext letters (a-z) present in a line, case-insensitive. */
export function distinctLetterCount(line: string): number {
  return new Set(normalize(line).split('')).size
}

/** How many letters to reveal as starters for a line: `ratio` of the distinct
 *  letters present, rounded, clamped to [min, distinct]. Scaling to the line's
 *  own letter set keeps short and long lines feeling comparable. */
export function starterCount(line: string, ratio: number, min: number): number {
  const d = distinctLetterCount(line)
  return Math.max(min, Math.min(d, Math.round(d * ratio)))
}

/** Rank a line's distinct plaintext letters best-first as starter/hint reveals.
 *  A revealed high-frequency letter fills the most boxes, so frequency leads;
 *  ties break toward letters inside the shortest word (the strongest foothold),
 *  then alphabetically so the order is fully deterministic. */
export function rankLettersByUsefulness(line: string): string[] {
  const norm = normalize(line)
  const freq: Record<string, number> = {}
  for (const ch of norm) freq[ch] = (freq[ch] ?? 0) + 1

  const minWordLen: Record<string, number> = {}
  for (const w of line.toLowerCase().split(/\s+/)) {
    const letters = w.replace(/[^a-z]/g, '')
    if (!letters) continue
    for (const ch of new Set(letters.split(''))) {
      minWordLen[ch] = Math.min(minWordLen[ch] ?? Infinity, letters.length)
    }
  }

  return Object.keys(freq).sort((a, b) => {
    if (freq[b] !== freq[a]) return freq[b] - freq[a]
    const wa = minWordLen[a] ?? Infinity
    const wb = minWordLen[b] ?? Infinity
    if (wa !== wb) return wa - wb
    return a < b ? -1 : 1
  })
}

/** The `n` most useful starter letters, as [cipherLetter, plainLetter] pairs the
 *  UI can lock. Deterministic (no rng), capped at the distinct letters present. */
export function smartStarterPairs(
  line: string,
  cipher: Record<string, string>,
  n: number,
): Array<[string, string]> {
  return rankLettersByUsefulness(line)
    .slice(0, Math.max(0, n))
    .map((p) => [cipher[p], p] as [string, string])
}

/** The next letter to give as a hint: the most useful plaintext letter whose
 *  cipher letter the player has not yet uncovered, as [cipher, plain], or null
 *  when every present letter is already known. Ordered, never random. */
export function nextHintLetter(
  line: string,
  cipher: Record<string, string>,
  known: string[],
): [string, string] | null {
  const knownSet = new Set(known)
  for (const plain of rankLettersByUsefulness(line)) {
    const c = cipher[plain]
    if (!knownSet.has(c)) return [c, plain]
  }
  return null
}

/** The fixed hint ladder: cheap info first, capped. Shared by the server (which
 *  honours the order) and the client (which labels the next hint). Lives here in
 *  the pure module so both the 'use server' actions and the client can import it
 *  (a 'use server' file may only export async functions). */
export const HINT_LADDER = ['letter', 'letter', 'artist', 'song'] as const
export const MAX_HINTS = HINT_LADDER.length

/** Grade a player's guesses (cipher->plain) against the true key (cipher->plain).
 *  Returns, for each cipher letter the player actually assigned, whether it is
 *  correct. Server-side only: the booleans reveal correctness without ever
 *  shipping the plaintext line. */
export function gradeMapping(
  mapping: Record<string, string>,
  trueKey: Record<string, string>,
): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const c of Object.keys(mapping)) out[c] = mapping[c] === trueKey[c]
  return out
}

/** The cipher letters a check graded correct (green). Once green, a slot is fixed:
 *  the UI locks these so a correct letter can no longer be swapped or cleared. */
export function lockedFromVerdict(verdict: Record<string, boolean>): string[] {
  return Object.keys(verdict).filter((c) => verdict[c] === true)
}

// Rate guard for the "check" button: too many checks in a short window is brute
// forcing the per-letter verdict, so we trip a fixed lockout. Pure + deterministic
// so it can be unit-tested; the component owns the clock and the recent-press log.
export const RATE_WINDOW_MS = 6000 // sliding window the presses are counted in
export const RATE_MAX = 5 // checks allowed inside the window before it trips
export const RATE_LOCK_MS = 30_000 // lockout once tripped

/** Decide whether a check press is allowed right now, given the recent press
 *  timestamps (within the window), the active lockUntil, and now. Returns the new
 *  recent log + lockUntil. While locked, every press is refused and the lock is
 *  untouched. Otherwise old presses are pruned; if appending `now` would exceed
 *  RATE_MAX the lock trips (and the log resets); else the press is allowed. */
export function evalCheckRate(
  recent: number[],
  lockUntil: number,
  now: number,
): { allowed: boolean; recent: number[]; lockUntil: number } {
  if (now < lockUntil) return { allowed: false, recent, lockUntil }
  const pruned = recent.filter((t) => t > now - RATE_WINDOW_MS)
  const next = [...pruned, now]
  if (next.length > RATE_MAX) return { allowed: false, recent: [], lockUntil: now + RATE_LOCK_MS }
  return { allowed: true, recent: next, lockUntil: 0 }
}

/** Spoiler-free share line. Word count is not a spoiler, so we show one tile per
 *  word: all green when solved, all blank when not, with an optional hint note. */
export function buildVerseShare(no: number, wordCount: number, solved: boolean, hints: number): string {
  const glyph = solved ? '🟩' : '⬜'
  const tiles = glyph.repeat(Math.max(1, wordCount))
  const note = solved && hints > 0 ? `  (${hints} hint${hints > 1 ? 's' : ''})` : ''
  const head = `BWC Verse #${no} ${solved ? '✅' : '✖'}`
  return `${head}\n${tiles}${note}`
}
