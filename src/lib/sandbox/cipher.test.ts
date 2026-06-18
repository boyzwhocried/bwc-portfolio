import { describe, it, expect } from 'vitest'
import {
  ALPHA,
  mulberry32,
  makeCipher,
  invert,
  encode,
  decode,
  fnv1a,
  normalize,
  solutionHash,
  isSolved,
  letterFrequencies,
  starterPairs,
  buildVerseShare,
  distinctLetterCount,
  starterCount,
  rankLettersByUsefulness,
  smartStarterPairs,
  nextHintLetter,
  gradeMapping,
} from './cipher'

describe('makeCipher', () => {
  it('is a bijection over all 26 letters', () => {
    const m = makeCipher(123)
    const keys = Object.keys(m).sort().join('')
    const vals = Object.values(m).sort().join('')
    expect(keys).toBe(ALPHA)
    expect(vals).toBe(ALPHA) // every letter used exactly once
  })

  it('never maps a letter to itself (a true derangement)', () => {
    for (const seed of [1, 2, 7, 42, 99, 1000, 250118]) {
      const m = makeCipher(seed)
      for (const ch of ALPHA) expect(m[ch]).not.toBe(ch)
    }
  })

  it('is deterministic for a given seed and varies across seeds', () => {
    expect(makeCipher(55)).toEqual(makeCipher(55))
    expect(makeCipher(55)).not.toEqual(makeCipher(56))
  })
})

describe('invert', () => {
  it('produces the inverse mapping', () => {
    const m = makeCipher(9)
    const inv = invert(m)
    for (const ch of ALPHA) expect(inv[m[ch]]).toBe(ch)
  })
})

describe('encode / decode', () => {
  it('substitutes letters and passes through spaces and punctuation', () => {
    const cipher = makeCipher(3)
    const out = encode('hi, there!', cipher)
    expect(out).toMatch(/^[a-z]{2}, [a-z]{5}!$/)
    // structure (spaces + punctuation positions) is preserved
    expect(out[2]).toBe(',')
    expect(out[3]).toBe(' ')
    expect(out[9]).toBe('!')
  })

  it('round-trips: decode with the inverse recovers the plaintext letters', () => {
    const cipher = makeCipher(77)
    const plain = 'the quiet part of the song'
    const ct = encode(plain, cipher)
    const back = decode(ct, invert(cipher))
    expect(normalize(back)).toBe(normalize(plain))
  })

  it('leaves unmapped cipher letters as a non-letter blank (no accidental solve)', () => {
    const cipher = makeCipher(8)
    const ct = encode('abc', cipher)
    const partial = decode(ct, {}) // nothing guessed yet
    expect(normalize(partial)).toBe('') // no real letters revealed
  })
})

describe('fnv1a / normalize', () => {
  it('normalize lowercases and keeps only a-z', () => {
    expect(normalize('Hi, There! 99')).toBe('hithere')
  })

  it('fnv1a is deterministic and distinguishes different strings', () => {
    expect(fnv1a('hello')).toBe(fnv1a('hello'))
    expect(fnv1a('hello')).not.toBe(fnv1a('hellp'))
  })
})

describe('solutionHash / isSolved', () => {
  it('a fully correct mapping solves; a partial one does not', () => {
    const cipher = makeCipher(31)
    const plain = 'every pixel earns its place'
    const ct = encode(plain, cipher)
    const hash = solutionHash(plain)
    const full = invert(cipher)
    expect(isSolved(ct, full, hash)).toBe(true)

    // drop one mapping -> not solved
    const partial = { ...full }
    delete partial[Object.keys(partial)[0]]
    expect(isSolved(ct, partial, hash)).toBe(false)
  })

  it('is case- and punctuation-insensitive on the plaintext side', () => {
    expect(solutionHash('Hello, World')).toBe(solutionHash('helloworld'))
  })
})

describe('letterFrequencies', () => {
  it('counts cipher letters and sorts most-common first', () => {
    const freqs = letterFrequencies('aaa bb c')
    expect(freqs[0]).toEqual({ letter: 'a', count: 3 })
    expect(freqs[1]).toEqual({ letter: 'b', count: 2 })
    expect(freqs[2]).toEqual({ letter: 'c', count: 1 })
    // non-letters are ignored
    expect(freqs.reduce((n, f) => n + f.count, 0)).toBe(6)
  })
})

describe('starterPairs', () => {
  it('returns n distinct valid [cipher, plain] pairs whose plain letters appear in the line', () => {
    const cipher = makeCipher(5)
    const plain = 'measure twice and cut once'
    const rng = mulberry32(5)
    const pairs = starterPairs(plain, cipher, 3, rng)
    expect(pairs).toHaveLength(3)
    const plains = pairs.map((p) => p[1])
    expect(new Set(plains).size).toBe(3) // distinct
    for (const [c, p] of pairs) {
      expect(normalize(plain)).toContain(p) // plain letter is really in the line
      expect(cipher[p]).toBe(c) // the cipher letter matches the mapping
    }
  })

  it('never asks for more pairs than there are distinct letters', () => {
    const cipher = makeCipher(5)
    const rng = mulberry32(1)
    const pairs = starterPairs('aaa', cipher, 3, rng)
    expect(pairs).toHaveLength(1) // only 'a' is available
  })
})

describe('distinctLetterCount', () => {
  it('counts distinct a-z letters, ignoring case, spaces and punctuation', () => {
    expect(distinctLetterCount('the theme')).toBe(4) // t, h, e, m
    expect(distinctLetterCount('A, a! B?')).toBe(2) // a, b
    expect(distinctLetterCount('')).toBe(0)
  })
})

describe('starterCount', () => {
  it('scales to the distinct-letter count by ratio, rounded', () => {
    // 'the theme today' -> t h e m o d a y = 8 distinct
    expect(starterCount('the theme today', 0.25, 1)).toBe(2) // round(8*0.25)
    expect(starterCount('the theme today', 0.5, 1)).toBe(4)
  })

  it('never exceeds the distinct letters present', () => {
    expect(starterCount('aaa', 0.9, 1)).toBe(1) // only one distinct letter
  })

  it('honours the minimum floor', () => {
    expect(starterCount('the theme today', 0, 1)).toBe(1)
    expect(starterCount('aaa', 0, 0)).toBe(0)
  })
})

describe('rankLettersByUsefulness', () => {
  it('puts the most frequent letter first', () => {
    // e appears 3x, the rest fewer -> e is the best starter to reveal
    expect(rankLettersByUsefulness('the theme')[0]).toBe('e')
  })

  it('is deterministic and returns every distinct letter once', () => {
    const a = rankLettersByUsefulness('measure twice and cut once')
    const b = rankLettersByUsefulness('measure twice and cut once')
    expect(a).toEqual(b)
    expect(new Set(a).size).toBe(a.length)
    expect(a.length).toBe(distinctLetterCount('measure twice and cut once'))
  })
})

describe('smartStarterPairs', () => {
  it('reveals the top-n useful letters as [cipher, plain], deterministically', () => {
    const cipher = makeCipher(5)
    const line = 'the theme today'
    const pairs = smartStarterPairs(line, cipher, 2)
    const rank = rankLettersByUsefulness(line)
    expect(pairs).toHaveLength(2)
    expect(pairs.map((p) => p[1])).toEqual(rank.slice(0, 2)) // the two most useful
    for (const [c, p] of pairs) expect(cipher[p]).toBe(c) // cipher letter matches mapping
    expect(smartStarterPairs(line, cipher, 2)).toEqual(pairs) // deterministic
  })

  it('never asks for more pairs than there are distinct letters', () => {
    const cipher = makeCipher(5)
    expect(smartStarterPairs('aaa', cipher, 3)).toHaveLength(1)
  })
})

describe('nextHintLetter', () => {
  it('returns the most useful letter not yet known, then the next', () => {
    const cipher = makeCipher(5)
    const line = 'the theme today'
    const rank = rankLettersByUsefulness(line)
    expect(nextHintLetter(line, cipher, [])).toEqual([cipher[rank[0]], rank[0]])
    // once the best cipher letter is known, the next-best is offered
    expect(nextHintLetter(line, cipher, [cipher[rank[0]]])).toEqual([cipher[rank[1]], rank[1]])
  })

  it('returns null when every present letter is already known', () => {
    const cipher = makeCipher(5)
    const line = 'the theme today'
    const allCipher = rankLettersByUsefulness(line).map((p) => cipher[p])
    expect(nextHintLetter(line, cipher, allCipher)).toBeNull()
  })
})

describe('gradeMapping', () => {
  it('marks each assigned cipher letter correct or wrong against the true key', () => {
    const cipher = makeCipher(5)
    const trueKey = invert(cipher) // the correct cipher -> plain answer
    const cE = cipher['e']
    const cT = cipher['t']
    const verdict = gradeMapping({ [cE]: 'e', [cT]: 'x' }, trueKey)
    expect(verdict[cE]).toBe(true)
    expect(verdict[cT]).toBe(false)
    expect(Object.keys(verdict)).toHaveLength(2) // grades only what was assigned
  })
})

describe('buildVerseShare', () => {
  it('headers with the puzzle number and shows one tile per word when solved', () => {
    const s = buildVerseShare(12, 5, true, 0)
    expect(s).toContain('BWC Verse #12')
    expect((s.match(/🟩/g) || []).length).toBe(5)
  })

  it('notes hint usage and marks an unsolved attempt', () => {
    const solved = buildVerseShare(4, 4, true, 2)
    expect(solved).toContain('2 hints')
    const failed = buildVerseShare(4, 4, false, 0)
    expect(failed).toContain('⬜')
    expect(failed).not.toContain('🟩')
  })
})
