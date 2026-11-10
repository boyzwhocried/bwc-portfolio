import { describe, it, expect } from 'vitest'
import { BTN, type FighterDef, type FighterState, type Inputs, type MatchState } from './types'
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

  describe('answers specials', () => {
    // opponent on side 0 is mid-special; the cpu is side 1, standing `dist` pixels away
    const facing = (pair: [FighterDef, FighterDef], dist: number, actionFrame: number, over: Partial<FighterState> = {}): MatchState => {
      const s = initMatch(5, pair)
      const foe = { ...s.fighters[0], x: 100 * UNIT, action: 'attack' as const, move: 'special' as const, actionFrame, ...over }
      return { ...s, fighters: [foe, { ...s.fighters[1], x: (100 + dist) * UNIT }] }
    }
    const count = (s: MatchState, level: 'easy' | 'normal', bit: number) => {
      let n = 0
      for (let seed = 1; seed <= 400; seed++) if (cpuInput({ ...s, seed }, 1, level).input === bit) n++
      return n
    }
    const wireVsAjudan: [FighterDef, FighterDef] = [FIGHTERS['si-penyadap'], FIGHTERS['sang-ajudan']]
    const lungeVsWire: [FighterDef, FighterDef] = [FIGHTERS['sang-ajudan'], FIGHTERS['si-penyadap']]

    it('normal blocks a special at long range, not just inside punch reach', () => {
      expect(count(facing(wireVsAjudan, 90, 6), 'normal', BTN.BLOCK)).toBeGreaterThan(400 * 0.5)
    })

    it('easy answers less often than normal', () => {
      const s = facing(wireVsAjudan, 90, 6)
      expect(count(s, 'easy', BTN.BLOCK)).toBeLessThan(count(s, 'normal', BTN.BLOCK))
    })

    it('stops answering once the special is in recovery', () => {
      const m = FIGHTERS['si-penyadap'].moves.special
      expect(count(facing(wireVsAjudan, 90, m.startup + m.active + 2), 'normal', BTN.BLOCK)).toBe(0)
    })

    it('sometimes jumps over the armored lunge while it is still winding up', () => {
      const s = facing(lungeVsWire, 50, 1)
      expect(count(s, 'normal', BTN.UP)).toBeGreaterThan(0)
      expect(count(s, 'normal', BTN.BLOCK)).toBeGreaterThan(0)
    })

    it('does not try to jump over the lunge once it has started moving', () => {
      const m = FIGHTERS['sang-ajudan'].moves.special
      expect(count(facing(lungeVsWire, 50, m.startup), 'normal', BTN.UP)).toBe(0)
    })

    it('never jumps over a special that is not armored', () => {
      expect(count(facing(wireVsAjudan, 90, 1), 'normal', BTN.UP)).toBe(0)
    })
  })

  describe('combos', () => {
    const connected = (move: 'punch' | 'kick'): MatchState => {
      const s = fresh()
      const f = s.fighters[1]
      return { ...s, fighters: [s.fighters[0], { ...f, action: 'attack', move, actionFrame: 6, hitConnected: true }] }
    }
    const pressed = (s: MatchState, level: 'easy' | 'normal') => {
      const seen = new Set<number>()
      for (let seed = 1; seed < 400; seed++) seen.add(cpuInput({ ...s, seed }, 1, level).input)
      return seen
    }

    it('normal sometimes cancels a connected punch into a stronger move, never into a punch', () => {
      const seen = pressed(connected('punch'), 'normal')
      expect(seen.has(BTN.KICK) || seen.has(BTN.SPECIAL)).toBe(true)
      expect(seen.has(BTN.PUNCH)).toBe(false)
    })

    it('a connected kick can only go into the special', () => {
      const seen = pressed(connected('kick'), 'normal')
      expect(seen.has(BTN.SPECIAL)).toBe(true)
      expect(seen.has(BTN.KICK)).toBe(false)
    })

    it('easy never cancels', () => {
      expect([...pressed(connected('punch'), 'easy')]).toEqual([0])
    })

    it('does nothing when the swing has not connected', () => {
      const s = connected('punch')
      const whiff = { ...s, fighters: [s.fighters[0], { ...s.fighters[1], hitConnected: false }] } as MatchState
      expect([...pressed(whiff, 'normal')]).toEqual([0])
    })
  })
})
