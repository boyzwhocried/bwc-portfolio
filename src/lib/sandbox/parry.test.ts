import { describe, it, expect } from 'vitest'
import { schedule, replay, PERFECT_WINDOW, GOOD_WINDOW, LIVES, type Input } from './parry'

const SEED = 1234

describe('PARRY arcade core', () => {
  it('produces a deterministic, escalating, valid schedule', () => {
    const a = schedule(SEED, 30)
    const b = schedule(SEED, 30)
    expect(a).toEqual(b)
    for (let i = 1; i < a.length; i++) {
      expect(a[i].time).toBeGreaterThan(a[i - 1].time) // strictly increasing arrivals
      expect(a[i].dir).toBeGreaterThanOrEqual(0)
      expect(a[i].dir).toBeLessThan(4)
    }
    // tempo ramps: late gaps are tighter than early gaps
    const earlyGap = a[2].time - a[1].time
    const lateGap = a[25].time - a[24].time
    expect(lateGap).toBeLessThan(earlyGap)
  })

  it('scores a single perfect parry', () => {
    const s = schedule(SEED, 5)
    const inputs: Input[] = [{ time: s[0].time, dir: s[0].dir }]
    const r = replay(SEED, inputs)
    expect(r.parries).toBe(1)
    expect(r.score).toBe(10) // 10 * combo(1)
    expect(r.maxCombo).toBe(1)
    expect(r.lives).toBe(0) // the run always plays on to death; score is the takeaway
  })

  it('grows the combo multiplier across consecutive perfects', () => {
    const s = schedule(SEED, 5)
    const inputs: Input[] = [
      { time: s[0].time, dir: s[0].dir },
      { time: s[1].time, dir: s[1].dir },
      { time: s[2].time, dir: s[2].dir },
    ]
    const r = replay(SEED, inputs)
    expect(r.maxCombo).toBe(3)
    expect(r.score).toBe(10 + 20 + 30) // combos 1,2,3
  })

  it('loses a life and resets combo on a missed enemy', () => {
    const s = schedule(SEED, 5)
    // parry #0, skip #1, parry #2
    const inputs: Input[] = [
      { time: s[0].time, dir: s[0].dir },
      { time: s[2].time, dir: s[2].dir },
    ]
    const r = replay(SEED, inputs)
    expect(r.rating.slice(0, 3)).toEqual(['perfect', 'miss', 'perfect'])
    expect(r.rating[1]).toBe('miss') // the skipped enemy cost a life mid-run
    expect(r.maxCombo).toBe(1) // combo reset by the miss
  })

  it('ends the run when lives reach zero', () => {
    const r = replay(SEED, []) // never press anything
    expect(r.lives).toBe(0)
    expect(r.rating).toHaveLength(LIVES) // exactly LIVES misses then stop
    expect(r.score).toBe(0)
  })

  it('treats a wrong-direction press as no parry (enemy missed)', () => {
    const s = schedule(SEED, 5)
    const wrong = (s[0].dir + 1) % 4
    const r = replay(SEED, [{ time: s[0].time, dir: wrong }])
    expect(r.rating[0]).toBe('miss')
  })

  it('grades a late-but-inside-window press as good, not perfect', () => {
    const s = schedule(SEED, 5)
    const late = s[0].time + (PERFECT_WINDOW + GOOD_WINDOW) / 2
    const r = replay(SEED, [{ time: late, dir: s[0].dir }])
    expect(r.rating[0]).toBe('good')
    expect(r.maxCombo).toBe(0) // good does not build combo
  })

  it('is deterministic for identical inputs (replay-verifiable)', () => {
    const s = schedule(SEED, 5)
    const inputs: Input[] = [{ time: s[0].time, dir: s[0].dir }, { time: s[1].time, dir: s[1].dir }]
    expect(replay(SEED, inputs)).toEqual(replay(SEED, inputs))
  })
})
