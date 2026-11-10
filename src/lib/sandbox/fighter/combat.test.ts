import { describe, it, expect } from 'vitest'
import { BTN, type Inputs, type MatchState } from './types'
import { initMatch, step, hashState, UNIT } from './sim'
import { isArmed } from './combat'
import { TEST_DEF, TEST_PUNCH, TEST_KICK, TEST_SPECIAL } from './test-fixtures'

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

  const GUARD = {
    ...TEST_DEF,
    moves: { ...TEST_DEF.moves, special: { ...TEST_SPECIAL, armor: true, advance: 512 } },
  }

  it('an armored move absorbs a hit at half damage without being interrupted', () => {
    const base = initMatch(1, [TEST_DEF, GUARD])
    let s: MatchState = { ...base, fighters: [base.fighters[0], { ...base.fighters[1], x: base.fighters[0].x + 30 * UNIT }] }
    s = step(s, [BTN.PUNCH, BTN.SPECIAL])
    s = stepN(s, TEST_PUNCH.startup)
    expect(s.fighters[1].hp).toBe(1000 - Math.floor(TEST_PUNCH.damage / 2))
    expect(s.fighters[1].action).toBe('attack')
  })

  it('an advancing move moves the attacker forward during its active frames', () => {
    const base = initMatch(1, [GUARD, GUARD])
    let s = step(base, [BTN.SPECIAL, 0])
    const x0 = s.fighters[0].x
    s = stepN(s, TEST_SPECIAL.startup + TEST_SPECIAL.active)
    expect(s.fighters[0].x).toBe(x0 + TEST_SPECIAL.active * 512)
  })

  const MARKER = { ...TEST_DEF, moves: { ...TEST_DEF.moves, special: { ...TEST_SPECIAL, mark: true } } }
  const nearWith = (a: typeof TEST_DEF, b: typeof TEST_DEF): MatchState => {
    const base = initMatch(1, [a, b])
    return { ...base, fighters: [base.fighters[0], { ...base.fighters[1], x: base.fighters[0].x + 30 * UNIT }] }
  }
  const landSpecial = (s: MatchState) => stepN(step(s, [BTN.SPECIAL, 0]), TEST_SPECIAL.startup)

  describe('bugged mark', () => {
    it('starts clear for both fighters', () => {
      const s = initMatch(1, [TEST_DEF, TEST_DEF])
      expect(s.fighters.map((f) => f.bugged)).toEqual([false, false])
    })

    it('a marking move that hits puts the mark on the defender only', () => {
      const s = landSpecial(nearWith(MARKER, TEST_DEF))
      expect(s.fighters[1].hp).toBeLessThan(1000)
      expect(s.fighters[1].bugged).toBe(true)
      expect(s.fighters[0].bugged).toBe(false)
    })

    it('a normal move does not mark', () => {
      const s = landSpecial(nearWith(TEST_DEF, TEST_DEF))
      expect(s.fighters[1].hp).toBeLessThan(1000)
      expect(s.fighters[1].bugged).toBe(false)
    })

    it('a blocked marking move does not mark', () => {
      let s = step(nearWith(MARKER, TEST_DEF), [BTN.SPECIAL, BTN.BLOCK])
      s = stepN(s, TEST_SPECIAL.startup, [0, BTN.BLOCK])
      expect(s.fighters[1].action).toBe('blockstun')
      expect(s.fighters[1].bugged).toBe(false)
    })

    it('the next hit on a marked fighter does 25 percent more and clears the mark', () => {
      const base = nearWith(TEST_DEF, TEST_DEF)
      const marked: MatchState = { ...base, fighters: [base.fighters[0], { ...base.fighters[1], bugged: true }] }
      let s = step(marked, [BTN.PUNCH, 0])
      s = stepN(s, TEST_PUNCH.startup)
      expect(s.fighters[1].hp).toBe(1000 - Math.floor((TEST_PUNCH.damage * 125) / 100))
      expect(s.fighters[1].bugged).toBe(false)
    })

    it('a blocked hit neither gets the bonus nor uses the mark up', () => {
      const base = nearWith(TEST_DEF, TEST_DEF)
      const marked: MatchState = { ...base, fighters: [base.fighters[0], { ...base.fighters[1], bugged: true }] }
      let s = step(marked, [BTN.PUNCH, BTN.BLOCK])
      s = stepN(s, TEST_PUNCH.startup, [0, BTN.BLOCK])
      expect(s.fighters[1].hp).toBe(1000 - Math.floor(TEST_PUNCH.damage / 10))
      expect(s.fighters[1].bugged).toBe(true)
    })

    it('the mark is part of the state hash', () => {
      const a = initMatch(1, [TEST_DEF, TEST_DEF])
      const b: MatchState = { ...a, fighters: [a.fighters[0], { ...a.fighters[1], bugged: true }] }
      expect(hashState(a)).not.toBe(hashState(b))
    })
  })

  describe('armor window', () => {
    it('isArmed is true from the first frame of an armored move until its active frames end', () => {
      const base = initMatch(1, [GUARD, GUARD])
      let s = step(base, [BTN.SPECIAL, 0])
      const w = TEST_SPECIAL.startup + TEST_SPECIAL.active
      expect(isArmed(s.fighters[0], GUARD)).toBe(true)
      s = stepN(s, w - 1)
      expect(s.fighters[0].actionFrame).toBe(w - 1)
      expect(isArmed(s.fighters[0], GUARD)).toBe(true)
      s = step(s, NONE)
      expect(isArmed(s.fighters[0], GUARD)).toBe(false)
    })

    it('is never armed for a plain move or when idle', () => {
      const s = step(initMatch(1, [TEST_DEF, GUARD]), [BTN.PUNCH, 0])
      expect(isArmed(s.fighters[0], TEST_DEF)).toBe(false)
      expect(isArmed(s.fighters[1], GUARD)).toBe(false)
    })

    it('a hit after the armor window interrupts the armored fighter', () => {
      // short reach so the armored fighter's own swing whiffs and the attacker stays free to act
      const SHORT = { ...GUARD, moves: { ...GUARD.moves, special: { ...GUARD.moves.special, advance: undefined, hitbox: { x: 10, y: 20, w: 5, h: 5 } } } }
      const base = nearWith(TEST_DEF, SHORT)
      const w = TEST_SPECIAL.startup + TEST_SPECIAL.active
      let s = step(base, [0, BTN.SPECIAL])
      s = stepN(s, w) // armor over, now in recovery
      s = step(s, [BTN.PUNCH, 0])
      s = stepN(s, TEST_PUNCH.startup)
      expect(s.fighters[1].action).toBe('hitstun')
      expect(s.fighters[1].hp).toBe(1000 - TEST_PUNCH.damage)
    })
  })

  describe('cancels', () => {
    // p1 lands a punch on p2 (who stands still) and is left on the first frame after hitstop.
    const afterPunchHit = (defInput = 0) => {
      let s = step(near(), [BTN.PUNCH, defInput])
      s = stepN(s, TEST_PUNCH.startup, [0, defInput])
      return stepN(s, TEST_PUNCH.hitstop, [0, defInput])
    }

    it('a connected punch cancels into a kick, and the kick lands too', () => {
      let s = afterPunchHit()
      expect(s.fighters[0].move).toBe('punch')
      s = step(s, [BTN.KICK, 0])
      expect(s.fighters[0].move).toBe('kick')
      expect(s.fighters[0].actionFrame).toBe(0)
      s = stepN(s, TEST_KICK.startup + TEST_KICK.hitstop, NONE)
      expect(s.fighters[1].hp).toBe(1000 - TEST_PUNCH.damage - TEST_KICK.damage)
    })

    it('a connected punch cancels into the special', () => {
      const s = step(afterPunchHit(), [BTN.SPECIAL, 0])
      expect(s.fighters[0].move).toBe('special')
    })

    it('a connected kick cancels into the special but not back into a punch', () => {
      let s = step(near(), [BTN.KICK, 0])
      s = stepN(s, TEST_KICK.startup + TEST_KICK.hitstop)
      expect(s.fighters[0].move).toBe('kick')
      expect(step(s, [BTN.PUNCH, 0]).fighters[0].move).toBe('kick')
      expect(step(s, [BTN.SPECIAL, 0]).fighters[0].move).toBe('special')
    })

    it('punch, kick, special chains into a three hit combo', () => {
      let s = step(afterPunchHit(), [BTN.KICK, 0])
      s = stepN(s, TEST_KICK.startup + TEST_KICK.hitstop)
      s = step(s, [BTN.SPECIAL, 0])
      expect(s.fighters[0].move).toBe('special')
      s = stepN(s, TEST_SPECIAL.startup + TEST_SPECIAL.hitstop)
      expect(s.fighters[1].hp).toBe(1000 - TEST_PUNCH.damage - TEST_KICK.damage - TEST_SPECIAL.damage)
    })

    it('a whiffed move cannot be cancelled', () => {
      let s = step(far(), [BTN.PUNCH, 0])
      s = stepN(s, TEST_PUNCH.startup + 1)
      s = step(s, [BTN.KICK, 0])
      expect(s.fighters[0].move).toBe('punch')
    })

    it('a blocked move can be cancelled', () => {
      let s = step(near(), [BTN.PUNCH, BTN.BLOCK])
      s = stepN(s, TEST_PUNCH.startup + TEST_PUNCH.hitstop, [0, BTN.BLOCK])
      s = step(s, [BTN.KICK, BTN.BLOCK])
      expect(s.fighters[0].move).toBe('kick')
    })

    it('a button pressed during hitstop is kept and fires on the first free frame', () => {
      let s = step(near(), [BTN.PUNCH, 0])
      s = stepN(s, TEST_PUNCH.startup) // the hit lands, hitstop starts
      expect(s.hitstop).toBeGreaterThan(0)
      s = step(s, [BTN.KICK, 0]) // pressed during hitstop, then released
      s = stepN(s, TEST_PUNCH.hitstop - 1, NONE)
      expect(s.hitstop).toBe(0)
      s = step(s, NONE)
      expect(s.fighters[0].move).toBe('kick')
    })

    it('the buffer is spent after one free frame and part of the hash', () => {
      let s = step(near(), [BTN.PUNCH, 0])
      s = stepN(s, TEST_PUNCH.startup)
      s = step(s, [BTN.KICK, 0])
      expect(s.fighters[0].buffered).toBe('kick')
      const before = hashState(s)
      s = stepN(s, TEST_PUNCH.hitstop, NONE)
      expect(s.fighters[0].buffered).toBeNull()
      expect(hashState({ ...s, fighters: [{ ...s.fighters[0], buffered: 'kick' }, s.fighters[1]] })).not.toBe(hashState(s))
      expect(before).not.toBe(hashState(s))
    })
  })
})
