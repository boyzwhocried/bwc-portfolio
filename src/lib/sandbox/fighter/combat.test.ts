import { describe, it, expect } from 'vitest'
import { BTN, type Inputs, type MatchState } from './types'
import { initMatch, step, UNIT } from './sim'
import { TEST_DEF, TEST_PUNCH } from './test-fixtures'

const NONE: Inputs = [0, 0]

// p1 at x=100px, p2 30px in front: inside punch reach (10..40px).
function near(): MatchState {
  const s = initMatch(1, [TEST_DEF, TEST_DEF])
  return { ...s, fighters: [s.fighters[0], { ...s.fighters[1], x: s.fighters[0].x + 30 * UNIT }] }
}
function far(): MatchState {
  return initMatch(1, [TEST_DEF, TEST_DEF])
}
function stepN(s: MatchState, n: number, inp: Inputs = NONE) {
  for (let i = 0; i < n; i++) s = step(s, inp)
  return s
}

describe('combat', () => {
  it('punch hitbox is active only during active frames', () => {
    let s = step(near(), [BTN.PUNCH, 0]) // actionFrame 0
    for (let k = 1; k < TEST_PUNCH.startup; k++) {
      s = step(s, NONE)
      expect(s.fighters[1].hp).toBe(1000)
    }
    s = step(s, NONE) // actionFrame 4 = first active frame
    expect(s.fighters[1].hp).toBe(1000 - TEST_PUNCH.damage)
  })

  it('a whiffed punch at range deals no damage', () => {
    let s = step(far(), [BTN.PUNCH, 0])
    s = stepN(s, 30)
    expect(s.fighters[1].hp).toBe(1000)
  })

  it('hit deals damage and puts the defender in hitstun', () => {
    let s = step(near(), [BTN.PUNCH, 0])
    s = stepN(s, TEST_PUNCH.startup)
    expect(s.fighters[1].action).toBe('hitstun')
    expect(s.fighters[1].hp).toBe(1000 - TEST_PUNCH.damage)
  })

  it('both fighters freeze for hitstop frames on hit', () => {
    let s = step(near(), [BTN.PUNCH, 0])
    s = stepN(s, TEST_PUNCH.startup) // hit lands
    const snap = JSON.stringify(s.fighters)
    for (let i = 0; i < TEST_PUNCH.hitstop; i++) {
      s = step(s, [BTN.LEFT, BTN.RIGHT])
      expect(JSON.stringify(s.fighters)).toBe(snap)
    }
    s = step(s, NONE)
    expect(JSON.stringify(s.fighters)).not.toBe(snap)
  })

  it('block negates damage and applies chip', () => {
    let s = step(near(), [0, BTN.BLOCK])
    expect(s.fighters[1].action).toBe('block')
    s = step(s, [BTN.PUNCH, BTN.BLOCK])
    s = stepN(s, TEST_PUNCH.startup, [0, BTN.BLOCK])
    expect(s.fighters[1].hp).toBe(1000 - Math.floor(TEST_PUNCH.damage / 10))
    expect(s.fighters[1].action).toBe('blockstun')
  })

  it('holding block while attacking does not block', () => {
    let s = step(near(), [BTN.PUNCH, BTN.BLOCK | BTN.PUNCH])
    expect(s.fighters[1].action).toBe('attack')
    s = stepN(s, TEST_PUNCH.startup)
    expect(s.fighters[1].hp).toBeLessThan(1000 - Math.floor(TEST_PUNCH.damage / 10))
  })

  it('a move cannot hit twice in one swing', () => {
    let s = step(near(), [BTN.PUNCH, 0])
    s = stepN(s, 40)
    expect(s.fighters[1].hp).toBe(1000 - TEST_PUNCH.damage)
  })

  it('cannot act during recovery', () => {
    let s = step(far(), [BTN.PUNCH, 0])
    s = stepN(s, TEST_PUNCH.startup + TEST_PUNCH.active) // now in recovery
    const x = s.fighters[0].x
    s = step(s, [BTN.RIGHT | BTN.KICK, 0])
    expect(s.fighters[0].x).toBe(x)
    expect(s.fighters[0].move).toBe('punch')
  })

  it('hp never goes below zero and ko is set', () => {
    let s = near()
    s = { ...s, fighters: [s.fighters[0], { ...s.fighters[1], hp: 10 }] }
    s = step(s, [BTN.PUNCH, 0])
    s = stepN(s, TEST_PUNCH.startup)
    expect(s.fighters[1].hp).toBe(0)
    expect(s.fighters[1].action).toBe('ko')
  })
})
