import { describe, it, expect } from 'vitest'
import { FIGHTERS, FIGHTER_IDS, quickPair } from './roster'
import { BTN, MOVE_KINDS } from './types'
import { initMatch, step, UNIT } from './sim'

describe('roster', () => {
  it('has exactly the two phase 1 fighters', () => {
    expect([...FIGHTER_IDS].sort()).toEqual(['sang-ajudan', 'si-penyadap'])
  })

  it('labels are the archetype names and ids are slugs', () => {
    expect(FIGHTERS['si-penyadap'].label).toBe('Si Penyadap')
    expect(FIGHTERS['sang-ajudan'].label).toBe('Sang Ajudan')
    for (const id of FIGHTER_IDS) {
      expect(FIGHTERS[id].id).toBe(id)
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/)
    }
  })

  it('every move has startup, active and recovery of at least 1 frame', () => {
    for (const id of FIGHTER_IDS) {
      for (const k of MOVE_KINDS) {
        const m = FIGHTERS[id].moves[k]
        expect(m.kind).toBe(k)
        expect(m.startup).toBeGreaterThanOrEqual(1)
        expect(m.active).toBeGreaterThanOrEqual(1)
        expect(m.recovery).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('specials are not stronger than 2x kick damage', () => {
    for (const id of FIGHTER_IDS) {
      const { special, kick } = FIGHTERS[id].moves
      expect(special.damage).toBeLessThanOrEqual(kick.damage * 2)
    }
  })

  it('the wire special reaches farther than any other move in the game', () => {
    const reach = (m: { hitbox: { x: number; w: number } }) => m.hitbox.x + m.hitbox.w
    const wire = reach(FIGHTERS['si-penyadap'].moves.special)
    for (const id of FIGHTER_IDS)
      for (const k of MOVE_KINDS) if (!(id === 'si-penyadap' && k === 'special')) expect(wire).toBeGreaterThan(reach(FIGHTERS[id].moves[k]))
  })

  it('the guard step special has armor and advances', () => {
    const m = FIGHTERS['sang-ajudan'].moves.special
    expect(m.armor).toBe(true)
    expect(m.advance).toBeGreaterThan(0)
  })

  it('only the wire special marks, and only the guard step has armor', () => {
    for (const id of FIGHTER_IDS)
      for (const k of MOVE_KINDS) {
        const m = FIGHTERS[id].moves[k]
        expect(!!m.mark).toBe(id === 'si-penyadap' && k === 'special')
        expect(!!m.armor).toBe(id === 'sang-ajudan' && k === 'special')
      }
  })

  it('punch to kick and kick to special are true combos: the next move is out before hitstun ends', () => {
    for (const id of FIGHTER_IDS) {
      const { punch, kick, special } = FIGHTERS[id].moves
      expect(kick.startup).toBeLessThanOrEqual(punch.hitstun)
      expect(special.startup).toBeLessThanOrEqual(kick.hitstun)
    }
  })

  it('punch hits freeze the game for 5 frames and kick hits for 6, for both fighters', () => {
    for (const id of FIGHTER_IDS) {
      expect(FIGHTERS[id].moves.punch.hitstop).toBe(5)
      expect(FIGHTERS[id].moves.kick.hitstop).toBe(6)
    }
  })

  it('a real punch landing freezes the match for its hitstop, and the defender gets the same hitstun after it', () => {
    const pair = [FIGHTERS['sang-ajudan'], FIGHTERS['si-penyadap']] as [(typeof FIGHTERS)['sang-ajudan'], (typeof FIGHTERS)['si-penyadap']]
    let s = initMatch(1, pair)
    s = { ...s, fighters: [s.fighters[0], { ...s.fighters[1], x: s.fighters[0].x + 30 * UNIT }] }
    s = step(s, [BTN.PUNCH, 0])
    for (let i = 0; i < pair[0].moves.punch.startup; i++) s = step(s, [0, 0])
    expect(s.hitstop).toBe(5)
    expect(s.fighters[1].stun).toBe(pair[0].moves.punch.hitstun)
  })
})

describe('quickPair', () => {
  it('puts the picked hero on the left and the other fighter on the right', () => {
    expect(quickPair('si-penyadap')).toEqual(['si-penyadap', 'sang-ajudan'])
    expect(quickPair('sang-ajudan')).toEqual(['sang-ajudan', 'si-penyadap'])
  })

  it('never pairs a fighter with itself', () => {
    for (const id of FIGHTER_IDS) {
      const [a, b] = quickPair(id)
      expect(a).toBe(id)
      expect(b).not.toBe(id)
    }
  })
})
