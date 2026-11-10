import { describe, it, expect } from 'vitest'
import { BTN, type Inputs, type MatchState } from './types'
import { initMatch, step, UNIT } from './sim'
import { matchWinner, ROUND_FRAMES, INTRO_FRAMES } from './match'
import { TEST_DEF, TEST_PUNCH } from './test-fixtures'

const NONE: Inputs = [0, 0]

function near(introFrames = 0): MatchState {
  const s = initMatch(1, [TEST_DEF, TEST_DEF], introFrames)
  return { ...s, fighters: [s.fighters[0], { ...s.fighters[1], x: s.fighters[0].x + 30 * UNIT }] }
}
function withHp(s: MatchState, hp1: number, hp2: number): MatchState {
  return { ...s, fighters: [{ ...s.fighters[0], hp: hp1 }, { ...s.fighters[1], hp: hp2 }] }
}
function stepN(s: MatchState, n: number, inp: Inputs = NONE) {
  for (let i = 0; i < n; i++) s = step(s, inp)
  return s
}
// punch p2 until the round resolves
function koP2(s: MatchState) {
  s = step(s, [BTN.PUNCH, 0])
  return stepN(s, TEST_PUNCH.startup)
}

describe('match flow', () => {
  it('ko ends the round and awards it', () => {
    const s = koP2(withHp(near(), 1000, 10))
    expect(s.phase).toBe('ko')
    expect(s.wins).toEqual([1, 0])
  })

  it('after the ko pause the next round starts with full hp', () => {
    let s = koP2(withHp(near(), 1000, 10))
    s = stepN(s, 400)
    expect(s.round).toBe(2)
    expect(s.phase).toBe('fight')
    expect(s.fighters[1].hp).toBe(TEST_DEF.hp)
    expect(s.roundTimer).toBeGreaterThan(0)
  })

  it('timeout awards the round to the higher hp', () => {
    let s = withHp(near(), 900, 500)
    s = { ...s, roundTimer: 1 }
    s = step(s, NONE)
    expect(s.wins).toEqual([1, 0])
    expect(s.phase).toBe('roundEnd')
  })

  it('equal hp on timeout is a draw that awards both', () => {
    let s = { ...near(), roundTimer: 1 }
    s = step(s, NONE)
    expect(s.wins).toEqual([1, 1])
  })

  it('both fighters ko on the same frame is a double ko draw, not a crash', () => {
    let s = withHp(near(), 10, 10)
    s = step(s, [BTN.PUNCH, BTN.PUNCH])
    s = stepN(s, TEST_PUNCH.startup, NONE)
    expect(s.fighters[0].hp).toBe(0)
    expect(s.fighters[1].hp).toBe(0)
    expect(s.phase).toBe('ko')
    expect(s.wins).toEqual([1, 1])
  })

  it('best of three ends after two round wins', () => {
    let s = near()
    s = { ...s, wins: [1, 0], round: 2 }
    s = koP2(withHp(s, 1000, 10))
    s = stepN(s, 400)
    expect(s.phase).toBe('matchEnd')
    expect(matchWinner(s)).toBe('p1')
  })

  it('matchWinner is null while the match is running and draw when tied at the end', () => {
    expect(matchWinner(near())).toBeNull()
    const tied: MatchState = { ...near(), phase: 'matchEnd', wins: [2, 2] }
    expect(matchWinner(tied)).toBe('draw')
  })

  it('inputs are ignored during intro', () => {
    let s = near(INTRO_FRAMES)
    expect(s.phase).toBe('intro')
    const x = s.fighters[0].x
    s = step(s, [BTN.RIGHT, 0])
    expect(s.fighters[0].x).toBe(x)
    s = stepN(s, INTRO_FRAMES + 1)
    expect(s.phase).toBe('fight')
  })

  it('inputs are ignored during roundEnd', () => {
    let s: MatchState = { ...near(), phase: 'roundEnd', phaseFrame: 0 }
    const x = s.fighters[0].x
    s = step(s, [BTN.RIGHT, BTN.LEFT])
    expect(s.fighters[0].x).toBe(x)
  })

  it('round timer counts down only while fighting and not during hitstop', () => {
    let s = near()
    expect(s.roundTimer).toBe(ROUND_FRAMES)
    s = step(s, NONE)
    expect(s.roundTimer).toBe(ROUND_FRAMES - 1)
    s = { ...s, hitstop: 2 }
    const t = s.roundTimer
    s = step(s, NONE)
    expect(s.roundTimer).toBe(t)
  })

  it('a held kick cannot cancel into a phantom hit on a fighter who was just KOed', () => {
    let s = withHp(near(), 1000, 10)
    s = step(s, [BTN.PUNCH, 0])
    for (let i = 0; i < 60; i++) {
      s = step(s, [BTN.KICK, 0])
      if (s.phase !== 'fight' && s.phase !== 'intro') break
    }
    const after = stepN(s, 30, [BTN.KICK, 0])
    expect(after.fighters[1].hp).toBe(0)
    expect(after.fighters[0].move).not.toBe('kick')
    expect(after.fighters[0].buffered).toBeNull()
  })
})
