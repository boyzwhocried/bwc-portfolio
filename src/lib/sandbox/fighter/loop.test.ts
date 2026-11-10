import { describe, it, expect } from 'vitest'
import { advance, STEP_MS, MAX_STEPS } from './loop'

describe('advance', () => {
  it('returns whole steps and carries the remainder', () => {
    const r = advance(0, 40)
    expect(r.steps).toBe(2)
    expect(r.accum).toBeCloseTo(40 - 2 * STEP_MS, 6)
  })

  it('accumulates small deltas across calls', () => {
    let a = 0
    let total = 0
    for (let i = 0; i < 11; i++) {
      const r = advance(a, 5)
      a = r.accum
      total += r.steps
    }
    expect(total).toBe(3) // 55ms / 16.67ms = 3.3 steps
  })

  it('a 5 second stall yields at most MAX_STEPS steps and drops the backlog', () => {
    const r = advance(0, 5000)
    expect(r.steps).toBe(MAX_STEPS)
    expect(r.accum).toBe(0)
  })

  it('negative, NaN and infinite dt yield 0 steps and keep the accumulator', () => {
    for (const dt of [-10, NaN, Infinity, -Infinity]) {
      const r = advance(3, dt)
      expect(r.steps).toBe(0)
      expect(r.accum).toBe(3)
    }
  })
})
