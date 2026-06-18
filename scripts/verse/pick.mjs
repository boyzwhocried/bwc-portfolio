// Pure line-picker for the "the verse" cryptogram bank. Kept node-runnable (plain
// .mjs) so curate.mjs can import it, and unit-tested in vitest (see pick.test.mjs).
//
// CATCHY mode: the daily cryptogram now favours the hook. From a song's lyrics we
// keep the catchiest decode-friendly lines: the repeated chorus and the lines that
// state the title rank first, with a fallback to any clean line so a song without a
// detectable chorus still contributes. The lyric TEXT still never lands in the repo
// (curate writes it to the private Supabase bank; the site serves only ciphertext).

export const MAX_PER_SONG = 3

export const norm = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '')

const clean = (l) =>
  l.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[‘’‚]/g, "'")

/** Is a raw line a fair cryptogram candidate? ascii letters/space/apostrophe/comma
 *  only, no section markers / brackets / digits, 4-12 words, 18-60 letters, and at
 *  least 8 distinct letters (enough cipher variety to be solvable). */
function isCandidate(l, n) {
  if (!n) return false
  if (/[[\]()]/.test(l) || /[0-9]/.test(l)) return false
  if (!/^[a-zA-Z',\s]+$/.test(l)) return false
  const words = l.split(/\s+/).filter(Boolean)
  if (words.length < 4 || words.length > 12) return false
  if (n.length < 18 || n.length > 60) return false
  if (new Set(n.split('')).size < 8) return false
  return true
}

/** Pick up to MAX_PER_SONG catchy lines from a song's plain lyrics. Lines are
 *  scored: a repeated line (the chorus) scores highest, a title-stating line next;
 *  ties and plain lines fall back to first-appearance order. Deterministic. */
export function pickLines(plainLyrics, title) {
  if (!plainLyrics) return []
  const rawLines = plainLyrics.split('\n').map((s) => s.trim())

  // how many times each normalized line occurs -> the chorus repeats
  const counts = Object.create(null)
  for (const l of rawLines) {
    const n = norm(l)
    if (n) counts[n] = (counts[n] || 0) + 1
  }

  const titleNorm = norm(title)
  const seen = new Set()
  const cands = []
  let order = 0
  for (const l of rawLines) {
    order++
    const n = norm(l)
    if (seen.has(n)) continue
    if (!isCandidate(l, n)) continue
    seen.add(n)
    const repeats = counts[n] || 1
    const hasTitle = titleNorm.length >= 4 && n.includes(titleNorm)
    // chorus repetition is the strongest catchiness signal; a title-stating line
    // is the next; everything else is a clean-line fallback (score 0).
    const score = (repeats - 1) * 3 + (hasTitle ? 2 : 0)
    cands.push({ line: clean(l), score, order })
  }

  cands.sort((a, b) => b.score - a.score || a.order - b.order)
  return cands.slice(0, MAX_PER_SONG).map((c) => c.line)
}
