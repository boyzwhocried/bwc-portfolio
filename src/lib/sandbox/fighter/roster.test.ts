import { describe, it, expect } from 'vitest'
import { FIGHTERS, FIGHTER_IDS } from './roster'
import { MOVE_KINDS } from './types'

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
})
