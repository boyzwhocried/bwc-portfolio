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
