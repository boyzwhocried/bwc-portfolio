import { describe, it, expect } from 'vitest'
import { BTN, type Inputs } from './types'
import { initMatch, step, hashState, STAGE_W, HALF_W, JUMP_FRAMES } from './sim'

import { TEST_DEF as DEF } from './test-fixtures'
import { FIGHTERS } from './roster'
import { cpuInput } from './cpu'
const fresh = () => initMatch(42, [DEF, DEF])
const NONE: Inputs = [0, 0]

function run(frames: number, script: (f: number) => Inputs) {
  let s = fresh()
  for (let f = 0; f < frames; f++) s = step(s, script(f))
  return s
}

describe('sim core', () => {
  it('replay is deterministic', () => {
    const script = (f: number): Inputs => [
      f % 90 < 40 ? BTN.RIGHT : f % 90 < 50 ? BTN.UP : BTN.LEFT,
      f % 70 < 30 ? BTN.LEFT : f % 70 < 45 ? BTN.UP | BTN.RIGHT : 0,
    ]
    let a = fresh()
    let b = fresh()
    for (let f = 0; f < 600; f++) {
      a = step(a, script(f))
      b = step(b, script(f))
      expect(hashState(a)).toBe(hashState(b))
    }
  })

  it('step does not mutate its input', () => {
    const s = fresh()
    const before = JSON.stringify(s)
    step(s, [BTN.RIGHT, BTN.LEFT])
    expect(JSON.stringify(s)).toBe(before)
  })

  it('walk moves right then stops at the stage wall', () => {
    const start = fresh().fighters[0].x
    const mid = run(10, () => [BTN.RIGHT, 0])
    expect(mid.fighters[0].x).toBeGreaterThan(start)
    const end = run(2000, () => [0, BTN.RIGHT])
    expect(end.fighters[1].x).toBe(STAGE_W - HALF_W)
  })

  it('jump rises and lands on the floor in a fixed frame count', () => {
    const s0 = fresh()
    let s = step(s0, [BTN.UP, 0])
    expect(s.fighters[0].y).toBeGreaterThan(0)
    for (let f = 1; f < JUMP_FRAMES - 1; f++) s = step(s, NONE)
    expect(s.fighters[0].y).toBeGreaterThan(0)
    s = step(s, NONE)
    expect(s.fighters[0].y).toBe(0)
  })

  it('left and right together is neutral', () => {
    const s = run(30, () => [BTN.LEFT | BTN.RIGHT, 0])
    expect(s.fighters[0].x).toBe(fresh().fighters[0].x)
  })

  it('up and down together is neutral', () => {
    const s = run(5, () => [BTN.UP | BTN.DOWN, 0])
    expect(s.fighters[0].y).toBe(0)
  })

  it('fighters face each other and swap facing when they cross', () => {
    let s = fresh()
    expect(s.fighters[0].facing).toBe(1)
    expect(s.fighters[1].facing).toBe(-1)
    // p1 walks right through p2 side; p2 stands still
    s = fresh()
    s = { ...s, fighters: [{ ...s.fighters[0], x: s.fighters[1].x + 2000 }, s.fighters[1]] }
    s = step(s, NONE)
    expect(s.fighters[0].facing).toBe(-1)
    expect(s.fighters[1].facing).toBe(1)
  })

  it('hash covers introFrames', () => {
    expect(hashState(initMatch(42, [DEF, DEF], 0))).not.toBe(hashState(initMatch(42, [DEF, DEF], 60)))
  })

  it('a replay with real combat, marks and armor is deterministic and actually fights', () => {
    const defs: [typeof DEF, typeof DEF] = [FIGHTERS['si-penyadap'], FIGHTERS['sang-ajudan']]
    const play = () => {
      let s = initMatch(7, defs)
      const hashes: number[] = []
      let sawMark = false
      let sawDamage = false
      for (let f = 0; f < 1800; f++) {
        // p1 is scripted (walk in, wire special, then punches); p2 stands still for 40 frames, then the CPU takes over so armor and blocks get exercised too
        const in0 = f < 15 ? BTN.RIGHT : f % 50 === 15 ? BTN.SPECIAL : f % 50 === 30 ? BTN.PUNCH : 0
        const c1 = cpuInput(s, 1, 'normal')
        s = step({ ...s, seed: c1.seed }, [in0, f < 40 ? 0 : c1.input])
        if (s.fighters.some((x) => x.bugged)) sawMark = true
        if (s.fighters.some((x) => x.hp < 1000)) sawDamage = true
        hashes.push(hashState(s))
      }
      return { hashes, sawMark, sawDamage }
    }
    const a = play()
    const b = play()
    expect(a.hashes).toEqual(b.hashes)
    expect(a.sawDamage).toBe(true)
    expect(a.sawMark).toBe(true)
  })
})
