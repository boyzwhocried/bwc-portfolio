import { describe, it, expect } from 'vitest'
import { BTN, type Inputs, type MatchState } from './types'
import { initMatch, step, UNIT } from './sim'
import { cpuInput } from './cpu'
import { FIGHTERS } from './roster'

const defs = [FIGHTERS['sang-ajudan'], FIGHTERS['si-penyadap']] as [(typeof FIGHTERS)['sang-ajudan'], (typeof FIGHTERS)['si-penyadap']]
const fresh = (seed = 7) => initMatch(seed, defs)

describe('cpuInput', () => {
  it('same state and seed give the same input', () => {
    const s = fresh()
    expect(cpuInput(s, 1, 'easy')).toEqual(cpuInput(s, 1, 'easy'))
  })

  it('takes only (state, side, level): it cannot read the current frame input', () => {
    expect(cpuInput.length).toBe(3)
  })

  it('easy approaches when far and never walks away', () => {
    let s = fresh(3)
    let towards = 0
    for (let i = 0; i < 200; i++) {
      const c = cpuInput(s, 1, 'easy')
      expect(c.input & BTN.RIGHT).toBe(0) // p2 is on the right, approaching means LEFT
      if (c.input & BTN.LEFT) towards++
      s = { ...s, seed: c.seed }
    }
    expect(towards).toBeGreaterThan(40)
  })

  it('returns no input outside the fight phase', () => {
    const s = { ...fresh(), phase: 'roundEnd' as const }
    expect(cpuInput(s, 1, 'easy').input).toBe(0)
  })

  it('easy cpu beats an idle player within 3000 frames', () => {
    let s: MatchState = fresh(11)
    for (let f = 0; f < 3000 && s.wins[1] === 0; f++) {
      const c = cpuInput(s, 1, 'easy')
      const inputs: Inputs = [0, c.input]
      s = step({ ...s, seed: c.seed }, inputs)
    }
    expect(s.wins[1]).toBeGreaterThanOrEqual(1)
  })

  it('cpu on side 0 faces the other way', () => {
    const base = fresh()
    const s: MatchState = { ...base, fighters: [{ ...base.fighters[0], x: 50 * UNIT }, { ...base.fighters[1], x: 250 * UNIT }] }
    let sawRight = false
    let t = s
    for (let i = 0; i < 100; i++) {
      const c = cpuInput(t, 0, 'normal')
      expect(c.input & BTN.LEFT).toBe(0)
      if (c.input & BTN.RIGHT) sawRight = true
      t = { ...t, seed: c.seed }
    }
    expect(sawRight).toBe(true)
  })
})
