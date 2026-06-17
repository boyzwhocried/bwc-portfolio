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

/** Spoiler-free share line. Word count is not a spoiler, so we show one tile per
 *  word: all green when solved, all blank when not, with an optional hint note. */
export function buildVerseShare(no: number, wordCount: number, solved: boolean, hints: number): string {
  const glyph = solved ? '🟩' : '⬜'
  const tiles = glyph.repeat(Math.max(1, wordCount))
  const note = solved && hints > 0 ? `  (${hints} hint${hints > 1 ? 's' : ''})` : ''
  const head = `BWC Verse #${no} ${solved ? '✅' : '✖'}`
  return `${head}\n${tiles}${note}`
}
