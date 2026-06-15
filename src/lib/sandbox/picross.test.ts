import { describe, it, expect } from 'vitest'
import {
  PIC_SIZE, dailyPicross, lineClues, rowClues, colClues, isSolved, buildImposeShare,
} from './picross'

describe('the impose — daily picross core', () => {
  it('reads runs of filled cells as clues, empty line as no clue', () => {
    expect(lineClues([true, true, false, true, true])).toEqual([2, 2])
    expect(lineClues([false, false, false, false, false])).toEqual([])
    expect(lineClues([true, true, true, true, true])).toEqual([5])
    expect(lineClues([true, false, true, false, true])).toEqual([1, 1, 1])
  })

  it('produces the same grid for the same day', () => {
    const a = dailyPicross(new Date('2026-06-20T01:00:00Z'))
    const b = dailyPicross(new Date('2026-06-20T20:00:00Z'))
    expect(a).toEqual(b)
    expect(a).toHaveLength(PIC_SIZE)
    expect(a[0]).toHaveLength(PIC_SIZE)
  })

  it('never emits a fully empty row or column (every clue line is non-trivial)', () => {
    const g = dailyPicross(new Date('2026-06-22T00:00:00Z'))
    expect(rowClues(g).every((c) => c.length > 0)).toBe(true)
    expect(colClues(g).every((c) => c.length > 0)).toBe(true)
  })

  it('is solved when clues match, including a clue-equivalent alternative', () => {
    const solution = [
      [true, false],
      [false, true],
    ]
    expect(isSolved(solution, solution)).toBe(true)
    // the anti-diagonal yields identical row+col clues -> also a valid solve
    const altDiagonal = [
      [false, true],
      [true, false],
    ]
    expect(isSolved(altDiagonal, solution)).toBe(true)
    // an empty fill does not satisfy the clues
    const empty = [
      [false, false],
      [false, false],
    ]
    expect(isSolved(empty, solution)).toBe(false)
  })

  it('builds a spoiler-free solved share line', () => {
    const s = buildImposeShare(9, true, 4)
    expect(s).toContain('#9')
    expect(s.toLowerCase()).toContain('solved')
    expect(s).not.toContain('🟩') // no image -> no spoiler
  })
})
