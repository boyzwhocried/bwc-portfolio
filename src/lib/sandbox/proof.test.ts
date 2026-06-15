import { describe, it, expect } from 'vitest'
import {
  PROOF_SLIPS, dailyProof, corruptWord, gradeProof, buildProofShare,
} from './proof'

// deterministic rng stub for corruptWord (returns a fixed sequence)
function seq(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

describe('the proof — daily error-hunt core', () => {
  it('produces the same proof for the same day', () => {
    const a = dailyProof(new Date('2026-06-20T03:00:00Z'))
    const b = dailyProof(new Date('2026-06-20T22:00:00Z'))
    expect(a.display).toEqual(b.display)
    expect(a.errors).toEqual(b.errors)
  })

  it('plants exactly PROOF_SLIPS errors, only at the flagged indices', () => {
    const p = dailyProof(new Date('2026-06-21T00:00:00Z'))
    expect(p.errors).toHaveLength(PROOF_SLIPS)
    // every word differs from clean iff it is a flagged error
    for (let i = 0; i < p.clean.length; i++) {
      const changed = p.display[i] !== p.clean[i]
      expect(changed).toBe(p.errors.includes(i))
    }
    // errors come back sorted and in range
    expect([...p.errors].sort((a, b) => a - b)).toEqual(p.errors)
    for (const e of p.errors) expect(e).toBeGreaterThanOrEqual(0)
  })

  it('corruptWord changes the word but keeps its length', () => {
    for (const w of ['proof', 'type', 'jakarta', 'page', 'ink']) {
      const c = corruptWord(w, seq([0.1, 0.4, 0.7]))
      expect(c).not.toBe(w)
      expect(c).toHaveLength(w.length)
    }
  })

  it('grades catches, misses and false marks', () => {
    const errors = [1, 4, 6]
    expect(gradeProof([1, 4, 6], errors)).toEqual({ caught: 3, missed: 0, falseMarks: 0, total: 3, win: true })
    expect(gradeProof([1, 4], errors)).toEqual({ caught: 2, missed: 1, falseMarks: 0, total: 3, win: false })
    expect(gradeProof([1, 4, 6, 2], errors)).toEqual({ caught: 3, missed: 0, falseMarks: 1, total: 3, win: false })
    expect(gradeProof([2, 3], errors)).toEqual({ caught: 0, missed: 3, falseMarks: 2, total: 3, win: false })
  })

  it('builds a spoiler-free share grid', () => {
    const errors = [1, 4, 6]
    const win = buildProofShare(7, errors, [1, 4, 6], true)
    expect(win).toContain('#7')
    expect(win).toContain('3/3')
    expect(win.split('\n')[1]).toBe('🟩🟩🟩')
    const partial = buildProofShare(7, errors, [1, 2], false)
    expect(partial).toContain('1/3')
    expect(partial).toContain('🟥') // one false mark shown
  })
})
