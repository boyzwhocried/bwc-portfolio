import { describe, it, expect } from 'vitest'
import {
  CODE_LEN,
  PALETTE_SIZE,
  dayIndex,
  dailyCode,
  scoreGuess,
  updateStreak,
  buildShareGrid,
} from './daily'

describe('daily code-break core', () => {
  it('computes a stable UTC day index', () => {
    const a = dayIndex(new Date('2026-06-12T00:00:00Z'))
    const b = dayIndex(new Date('2026-06-12T23:59:59Z'))
    const c = dayIndex(new Date('2026-06-13T00:00:00Z'))
    expect(a).toBe(b)
    expect(c).toBe(a + 1)
  })

  it('produces a deterministic in-range code for a given day', () => {
    const d = new Date('2026-06-12T10:00:00Z')
    const code1 = dailyCode(d)
    const code2 = dailyCode(new Date('2026-06-12T20:00:00Z'))
    expect(code1).toEqual(code2)
    expect(code1).toHaveLength(CODE_LEN)
    for (const peg of code1) {
      expect(peg).toBeGreaterThanOrEqual(0)
      expect(peg).toBeLessThan(PALETTE_SIZE)
    }
  })

  it('different days generally differ', () => {
    const a = dailyCode(new Date('2026-06-12T00:00:00Z')).join('')
    const b = dailyCode(new Date('2026-06-13T00:00:00Z')).join('')
    expect(a).not.toBe(b)
  })

  it('scores exact hits', () => {
    expect(scoreGuess([0, 1, 2, 3], [0, 1, 2, 3])).toEqual({ exact: 4, present: 0 })
  })

  it('handles duplicate pegs correctly (the classic bug)', () => {
    // code 0,0,1,2 vs guess 0,1,0,0 -> 1 exact, 2 present
    expect(scoreGuess([0, 1, 0, 0], [0, 0, 1, 2])).toEqual({ exact: 1, present: 2 })
  })

  it('never double-counts a peg as both present and exact', () => {
    const { exact, present } = scoreGuess([5, 5, 5, 5], [5, 0, 0, 0])
    expect(exact).toBe(1)
    expect(present).toBe(0)
  })

  describe('streak transitions', () => {
    it('starts a streak on first win', () => {
      expect(updateStreak(null, 100, true)).toEqual({ lastDay: 100, streak: 1, best: 1 })
    })
    it('increments on a consecutive-day win', () => {
      expect(updateStreak({ lastDay: 100, streak: 3, best: 5 }, 101, true)).toEqual({ lastDay: 101, streak: 4, best: 5 })
    })
    it('resets to 1 after a gap win', () => {
      expect(updateStreak({ lastDay: 100, streak: 3, best: 5 }, 103, true)).toEqual({ lastDay: 103, streak: 1, best: 5 })
    })
    it('breaks the streak on a loss', () => {
      expect(updateStreak({ lastDay: 100, streak: 3, best: 5 }, 101, false)).toEqual({ lastDay: 101, streak: 0, best: 5 })
    })
    it('raises the best when the streak passes it', () => {
      expect(updateStreak({ lastDay: 100, streak: 5, best: 5 }, 101, true).best).toBe(6)
    })
  })

  it('builds a spoiler-free share grid with the right peg counts', () => {
    const grid = buildShareGrid(42, [{ exact: 1, present: 2 }, { exact: 4, present: 0 }], true)
    expect(grid).toContain('#42')
    expect(grid).toContain('2/6')
    // first row: 1 exact + 2 present + 1 miss
    const firstRow = grid.split('\n').find((l) => l.includes('🟥'))!
    expect([...firstRow].filter((c) => c === '🟥')).toHaveLength(1)
    expect([...firstRow].filter((c) => c === '🟨')).toHaveLength(2)
  })
})
