import { describe, it, expect } from 'vitest'
import { BTN, type Inputs, type MatchState, type FighterDef } from './types'
import { initMatch, step, UNIT } from './sim'
import { TEST_DEF, TEST_PUNCH, TEST_SPECIAL } from './test-fixtures'
import { detectEvents, initFx, stepFx, afterDraw, wireFor, HURT_FLASH_FRAMES, WIRE_LINGER, type FxEvent } from './fx'

const NONE: Inputs = [0, 0]
const GUARD: FighterDef = { ...TEST_DEF, moves: { ...TEST_DEF.moves, special: { ...TEST_SPECIAL, armor: true } } }
const WIRE: FighterDef = { ...TEST_DEF, moves: { ...TEST_DEF.moves, special: { ...TEST_SPECIAL, mark: true } } }

function near(a: FighterDef = TEST_DEF, b: FighterDef = TEST_DEF): MatchState {
  const s = initMatch(1, [a, b])
  return { ...s, fighters: [s.fighters[0], { ...s.fighters[1], x: s.fighters[0].x + 30 * UNIT }] }
}

// Runs inputs until a step produces events; returns them with the state before and after.
function firstEvents(s0: MatchState, script: (f: number) => Inputs, max = 60) {
  let s = s0
  for (let f = 0; f < max; f++) {
    const n = step(s, script(f))
    const ev = detectEvents(s, n)
    if (ev.length) return { ev, prev: s, next: n }
    s = n
  }
  throw new Error('no event')
}

describe('detectEvents', () => {
  it('reports nothing for a quiet step', () => {
    const s = near()
    expect(detectEvents(s, step(s, NONE))).toEqual([])
  })

  it('reports one hit on the defender, between the two fighters, at body height', () => {
    const { ev, next } = firstEvents(near(), (f) => (f === 0 ? [BTN.PUNCH, 0] : NONE))
    expect(ev).toHaveLength(1)
    const e = ev[0] as Extract<FxEvent, { kind: 'hit' }>
    expect(e.kind).toBe('hit')
    expect(e.target).toBe(1)
    expect(e.damage).toBe(TEST_PUNCH.damage)
    expect(e.ko).toBe(false)
    const x0 = next.fighters[0].x / UNIT
    const x1 = next.fighters[1].x / UNIT
    expect(e.x).toBeGreaterThan(x0)
    expect(e.x).toBeLessThan(x1 + 12)
    expect(e.y).toBeGreaterThan(0)
    expect(e.y).toBeLessThan(80)
  })

  it('does not repeat the event during hitstop or the rest of the swing', () => {
    let s = near()
    let count = 0
    for (let f = 0; f < 40; f++) {
      const n = step(s, f === 0 ? [BTN.PUNCH, 0] : NONE)
      count += detectEvents(s, n).length
      s = n
    }
    expect(count).toBe(1)
  })

  it('reports a block when the defender guards', () => {
    const { ev } = firstEvents(near(), (f) => (f === 0 ? [BTN.PUNCH, BTN.BLOCK] : [0, BTN.BLOCK]))
    expect(ev[0].kind).toBe('block')
  })

  it('reports armor when an armed fighter absorbs the hit', () => {
    const { ev } = firstEvents(near(TEST_DEF, GUARD), (f) => (f === 0 ? [BTN.PUNCH, BTN.SPECIAL] : NONE))
    expect(ev[0].kind).toBe('armor')
    expect((ev[0] as { target: number }).target).toBe(1)
  })

  it('flags the killing hit', () => {
    const base = near()
    const s: MatchState = { ...base, fighters: [base.fighters[0], { ...base.fighters[1], hp: 10 }] }
    const { ev } = firstEvents(s, (f) => (f === 0 ? [BTN.PUNCH, 0] : NONE))
    expect(ev[0].kind).toBe('hit')
    expect((ev[0] as { ko: boolean }).ko).toBe(true)
  })

  it('reports landing dust when a jump ends', () => {
    let s = initMatch(1, [TEST_DEF, TEST_DEF])
    const lands: FxEvent[] = []
    for (let f = 0; f < 60; f++) {
      const n = step(s, f === 0 ? [BTN.UP, 0] : NONE)
      lands.push(...detectEvents(s, n).filter((e) => e.kind === 'land'))
      s = n
    }
    expect(lands).toHaveLength(1)
    expect((lands[0] as { target: number }).target).toBe(0)
  })
})

describe('stepFx', () => {
  const hit = (damage: number, ko = false): FxEvent => ({ kind: 'hit', target: 1, x: 100, y: 40, damage, ko })

  it('a hit makes a spark and flashes the hurt fighter for about 3 frames', () => {
    let fx = stepFx(initFx(), [hit(35)], false)
    expect(fx.sparks.some((p) => p.kind === 'hit')).toBe(true)
    expect(fx.hurt[1]).toBe(HURT_FLASH_FRAMES)
    expect(fx.hurt[0]).toBe(0)
    for (let i = 0; i < HURT_FLASH_FRAMES; i++) fx = stepFx(fx, [], false)
    expect(fx.hurt[1]).toBe(0)
  })

  it('sparks expire', () => {
    let fx = stepFx(initFx(), [hit(35)], false)
    for (let i = 0; i < 30; i++) fx = stepFx(fx, [], false)
    expect(fx.sparks).toEqual([])
  })

  it('block and armor make their own sparks and no hurt flash', () => {
    const fx = stepFx(initFx(), [{ kind: 'block', target: 1, x: 90, y: 40, damage: 3, ko: false }, { kind: 'armor', target: 0, x: 80, y: 40, damage: 20, ko: false }], false)
    expect(fx.sparks.map((p) => p.kind).sort()).toEqual(['armor', 'block'])
    expect(fx.hurt).toEqual([0, 0])
  })

  it('landing makes dust', () => {
    const fx = stepFx(initFx(), [{ kind: 'land', target: 0, x: 120 }], false)
    expect(fx.sparks.some((p) => p.kind === 'dust')).toBe(true)
  })

  it('only heavy hits shake, and a KO shakes and flashes harder', () => {
    expect(stepFx(initFx(), [hit(35)], false).shake).toBe(0)
    expect(stepFx(initFx(), [hit(80)], false).shake).toBeGreaterThan(0)
    const ko = stepFx(initFx(), [hit(35, true)], false)
    expect(ko.shake).toBeGreaterThan(stepFx(initFx(), [hit(80)], false).shake)
    expect(ko.koFlash).toBeGreaterThan(0)
  })

  it('reduced motion keeps sparks but turns off shake, flash and the hurt blink', () => {
    const fx = stepFx(initFx(), [hit(80, true)], true)
    expect(fx.sparks.length).toBeGreaterThan(0)
    expect(fx.shake).toBe(0)
    expect(fx.flash).toBe(0)
    expect(fx.koFlash).toBe(0)
    expect(fx.hurt).toEqual([0, 0])
  })

  it('a heavy-hit flash survives several sim steps inside one rendered frame', () => {
    let fx = stepFx(initFx(), [hit(80)], false)
    fx = stepFx(fx, [], false)
    fx = stepFx(fx, [], false)
    expect(fx.flash).toBeGreaterThan(0)
    fx = afterDraw(fx)
    expect(fx.flash).toBe(0)
  })

  it('does not mutate the previous fx state', () => {
    const a = initFx()
    const before = JSON.stringify(a)
    stepFx(a, [hit(80)], false)
    expect(JSON.stringify(a)).toBe(before)
  })
})

describe('wireFor', () => {
  const idle = initMatch(1, [WIRE, TEST_DEF]).fighters[0]
  const at = (actionFrame: number, over: Partial<typeof idle> = {}) => ({ ...idle, action: 'attack' as const, move: 'special' as const, actionFrame, ...over })
  const m = TEST_SPECIAL

  it('is hidden before the active frames and for non-marking moves', () => {
    expect(wireFor(at(m.startup - 1), WIRE)).toBeNull()
    expect(wireFor(at(m.startup), TEST_DEF)).toBeNull()
    expect(wireFor(idle, WIRE)).toBeNull()
  })

  it('spans the hitbox in front of the fighter while active', () => {
    const w = wireFor(at(m.startup), WIRE)!
    expect(w.x0).toBeCloseTo(idle.x / UNIT + m.hitbox.x)
    expect(w.x1).toBeCloseTo(idle.x / UNIT + m.hitbox.x + m.hitbox.w)
    expect(w.y).toBeCloseTo(m.hitbox.y + m.hitbox.h / 2)
  })

  it('mirrors when facing left', () => {
    const w = wireFor(at(m.startup, { facing: -1 }), WIRE)!
    expect(w.x1).toBeLessThan(w.x0)
  })

  it('stays visible for a short linger after the active frames, shrinking, then disappears', () => {
    const last = m.startup + m.active
    const full = wireFor(at(m.startup), WIRE)!
    const lingering = wireFor(at(last + 1), WIRE)!
    expect(Math.abs(lingering.x1 - lingering.x0)).toBeLessThan(Math.abs(full.x1 - full.x0))
    expect(wireFor(at(last + WIRE_LINGER), WIRE)).toBeNull()
  })
})
