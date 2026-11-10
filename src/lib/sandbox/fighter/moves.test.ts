import { describe, it, expect } from 'vitest'
import { ACTIONS, BTN, MOVE_KINDS, type FighterDef, type Inputs, type MatchState } from './types'
import { initMatch, step, hashState, UNIT } from './sim'
import { CROUCH_H, FIGHTER_H } from './constants'
import { hurtHeight } from './combat'
import { TEST_DEF, TEST_PUNCH, TEST_KICK, TEST_CROUCH_PUNCH, TEST_JUMP_KICK } from './test-fixtures'

const NONE: Inputs = [0, 0]

// a punch that only reaches standing height (y 40 to 54 px), to tell a duck from a stand
const HIGH_DEF: FighterDef = { ...TEST_DEF, moves: { ...TEST_DEF.moves, punch: { ...TEST_PUNCH, hitbox: { x: 10, y: 40, w: 28, h: 14 } } } }

function near(def: FighterDef = TEST_DEF, other: FighterDef = TEST_DEF): MatchState {
  const s = initMatch(1, [def, other])
  return { ...s, fighters: [s.fighters[0], { ...s.fighters[1], x: s.fighters[0].x + 30 * UNIT }] }
}
function stepN(s: MatchState, n: number, inp: Inputs = NONE) {
  for (let i = 0; i < n; i++) s = step(s, inp)
  return s
}
// p1 falling at height `yPx` pixels, 30px away from a grounded p2
function airborne(yPx = 30, vy = -500, vx = 0): MatchState {
  const s = near()
  return { ...s, fighters: [{ ...s.fighters[0], y: yPx * UNIT, vy, vx, action: 'jump' }, s.fighters[1]] }
}

describe('new move kinds', () => {
  it('crouch is an action and both new moves are move kinds, appended so old indices hold', () => {
    expect(ACTIONS).toContain('crouch')
    expect(MOVE_KINDS.slice(0, 3)).toEqual(['punch', 'kick', 'special'])
    expect(MOVE_KINDS).toContain('crouchPunch')
    expect(MOVE_KINDS).toContain('jumpKick')
    expect(ACTIONS.slice(0, 8)).toEqual(['idle', 'walk', 'jump', 'block', 'attack', 'hitstun', 'blockstun', 'ko'])
  })

  it('crouching or doing a new move changes the state hash', () => {
    const s = near()
    const crouched = { ...s, fighters: [{ ...s.fighters[0], action: 'crouch' as const }, s.fighters[1]] } as MatchState
    const swing = { ...s, fighters: [{ ...s.fighters[0], action: 'attack' as const, move: 'jumpKick' as const }, s.fighters[1]] } as MatchState
    expect(new Set([hashState(s), hashState(crouched), hashState(swing)]).size).toBe(3)
  })
})

describe('crouch', () => {
  it('holding down on the ground crouches, and letting go stands up', () => {
    let s = step(near(), [BTN.DOWN, 0])
    expect(s.fighters[0].action).toBe('crouch')
    s = step(s, NONE)
    expect(s.fighters[0].action).toBe('idle')
  })

  it('does not jump and does not walk while crouching', () => {
    const start = near()
    const s = stepN(start, 10, [BTN.DOWN | BTN.RIGHT, 0])
    expect(s.fighters[0].action).toBe('crouch')
    expect(s.fighters[0].y).toBe(0)
    expect(s.fighters[0].x).toBe(start.fighters[0].x)
  })

  it('up and down together is neither a crouch nor a jump', () => {
    expect(step(near(), [BTN.DOWN | BTN.UP, 0]).fighters[0].action).not.toBe('crouch')
  })

  it('block still wins when down and block are held together', () => {
    expect(step(near(), [BTN.DOWN | BTN.BLOCK, 0]).fighters[0].action).toBe('block')
  })

  it('the crouching hurtbox is shorter than the standing one', () => {
    expect(CROUCH_H).toBeLessThan(FIGHTER_H)
    const s = near()
    const crouched = { ...s.fighters[0], action: 'crouch' as const }
    expect(hurtHeight(crouched)).toBe(CROUCH_H)
    expect(hurtHeight(s.fighters[0])).toBe(FIGHTER_H)
  })

  it('a high punch whiffs over a crouching defender but hits a standing one', () => {
    const swing = (defender: number) => {
      let s = near(HIGH_DEF, HIGH_DEF)
      s = step(s, [BTN.PUNCH, defender])
      return stepN(s, TEST_PUNCH.startup + 1, [0, defender]).fighters[1].hp
    }
    expect(swing(0)).toBe(1000 - TEST_PUNCH.damage)
    expect(swing(BTN.DOWN)).toBe(1000)
  })
})

describe('crouch punch', () => {
  it('down plus punch throws the crouch punch; plain punch, and down plus kick or special, do not', () => {
    expect(step(near(), [BTN.DOWN | BTN.PUNCH, 0]).fighters[0].move).toBe('crouchPunch')
    expect(step(near(), [BTN.PUNCH, 0]).fighters[0].move).toBe('punch')
    expect(step(near(), [BTN.DOWN | BTN.KICK, 0]).fighters[0].move).toBe('kick')
    expect(step(near(), [BTN.DOWN | BTN.SPECIAL, 0]).fighters[0].move).toBe('special')
  })

  it('hits a standing opponent low and deals its damage', () => {
    let s = step(near(), [BTN.DOWN | BTN.PUNCH, 0])
    s = stepN(s, TEST_CROUCH_PUNCH.startup, [BTN.DOWN, 0])
    expect(s.fighters[1].hp).toBe(1000 - TEST_CROUCH_PUNCH.damage)
    expect(s.fighters[1].action).toBe('hitstun')
  })

  it('keeps the attacker low: a high punch goes over a crouch punch in progress', () => {
    let s = near(HIGH_DEF, HIGH_DEF)
    s = step(s, [BTN.PUNCH, BTN.DOWN | BTN.PUNCH])
    s = stepN(s, 2, [0, BTN.DOWN])
    expect(s.fighters[1].action).toBe('attack')
    expect(s.fighters[1].move).toBe('crouchPunch')
    expect(hurtHeight(s.fighters[1])).toBe(CROUCH_H)
    expect(s.fighters[1].hp).toBe(1000)
  })

  it('a connected crouch punch cancels into a kick, like a punch', () => {
    let s = step(near(), [BTN.DOWN | BTN.PUNCH, 0])
    s = stepN(s, TEST_CROUCH_PUNCH.startup + TEST_CROUCH_PUNCH.hitstop, [BTN.DOWN, 0])
    expect(s.fighters[0].move).toBe('crouchPunch')
    s = step(s, [BTN.KICK, 0])
    expect(s.fighters[0].move).toBe('kick')
  })

  it('a held punch does not repeat the crouch punch', () => {
    let s = near()
    const total = TEST_CROUCH_PUNCH.startup + TEST_CROUCH_PUNCH.active + TEST_CROUCH_PUNCH.recovery
    s = { ...s, fighters: [s.fighters[0], { ...s.fighters[1], x: 300 * UNIT }] }
    s = stepN(s, total + 3, [BTN.DOWN | BTN.PUNCH, 0])
    expect(s.fighters[0].action).not.toBe('attack')
  })
})

describe('jump kick', () => {
  it('kick in the air is the jump kick; punch and special in the air do nothing', () => {
    const s = step(airborne(), [BTN.KICK, 0])
    expect(s.fighters[0].action).toBe('attack')
    expect(s.fighters[0].move).toBe('jumpKick')
    expect(s.fighters[0].y).toBeGreaterThan(0)
    expect(step(airborne(), [BTN.PUNCH, 0]).fighters[0].action).toBe('jump')
    expect(step(airborne(), [BTN.SPECIAL, 0]).fighters[0].action).toBe('jump')
  })

  it('a kick on the ground is still a normal kick', () => {
    expect(step(near(), [BTN.KICK, 0]).fighters[0].move).toBe('kick')
  })

  it('hits a grounded opponent from the air for its damage', () => {
    let s = step(airborne(), [BTN.KICK, 0])
    s = stepN(s, TEST_JUMP_KICK.startup, NONE)
    expect(s.fighters[1].hp).toBe(1000 - TEST_JUMP_KICK.damage)
  })

  it('misses an opponent when the attacker is far above their head', () => {
    let s = step(airborne(120, 0), [BTN.KICK, 0])
    s = stepN(s, TEST_JUMP_KICK.startup, NONE)
    expect(s.fighters[1].hp).toBe(1000)
  })

  it('keeps the air momentum it had when the kick started', () => {
    const s0 = airborne(40, -200, 640)
    const s = stepN(step(s0, [BTN.KICK, 0]), 2, NONE)
    expect(s.fighters[0].x - s0.fighters[0].x).toBeGreaterThanOrEqual(3 * 640)
  })

  it('landing mid-kick turns the rest into landing recovery: exactly the recovery frames', () => {
    let s = step({ ...airborne(6, -400), fighters: [{ ...airborne(6, -400).fighters[0] }, { ...near().fighters[1], x: 300 * UNIT }] } as MatchState, [BTN.KICK, 0])
    let guard = 0
    while (s.fighters[0].y > 0 && guard++ < 40) s = step(s, NONE)
    expect(s.fighters[0].y).toBe(0)
    expect(s.fighters[0].action).toBe('attack')
    let after = 0
    while (s.fighters[0].action === 'attack' && after < 60) {
      s = step(s, NONE)
      after++
    }
    expect(after).toBe(TEST_JUMP_KICK.recovery)
    expect(s.fighters[0].action).toBe('idle')
  })

  it('cannot be cancelled into anything, even after it connects', () => {
    let s = step(airborne(), [BTN.KICK, 0])
    s = stepN(s, TEST_JUMP_KICK.startup + TEST_JUMP_KICK.hitstop, NONE)
    expect(s.fighters[0].move).toBe('jumpKick')
    s = step(s, [BTN.SPECIAL, 0])
    expect(s.fighters[0].move).toBe('jumpKick')
  })

  it('a connected ground kick cannot be cancelled into another kick', () => {
    let s = step(near(), [BTN.KICK, 0])
    s = stepN(s, TEST_KICK.startup + TEST_KICK.hitstop, NONE)
    expect(step(s, [BTN.KICK, 0]).fighters[0].move).toBe('kick')
  })
})
