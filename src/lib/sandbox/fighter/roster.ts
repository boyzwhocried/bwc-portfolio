import { UNIT } from './constants'
import type { FighterDef } from './types'

// Archetypes only. Numbers are starting points, tuned by feel.
export const FIGHTER_IDS = ['si-penyadap', 'sang-ajudan'] as const
export type FighterId = (typeof FIGHTER_IDS)[number]

export const FIGHTERS: Record<FighterId, FighterDef> = {
  // Slim, patient, long reach. The special is a ranged wire poke.
  'si-penyadap': {
    id: 'si-penyadap',
    label: 'Si Penyadap',
    hp: 1000,
    walkSpeed: 640,
    jumpVelocity: 2560,
    moves: {
      punch: { kind: 'punch', startup: 5, active: 3, recovery: 9, damage: 35, hitstun: 12, blockstun: 8, knockback: 3 * UNIT, hitstop: 5, hitbox: { x: 10, y: 40, w: 28, h: 14 } },
      kick: { kind: 'kick', startup: 8, active: 4, recovery: 15, damage: 75, hitstun: 16, blockstun: 10, knockback: 5 * UNIT, hitstop: 6, hitbox: { x: 10, y: 12, w: 36, h: 16 } },
      special: { kind: 'special', startup: 14, active: 5, recovery: 24, damage: 60, hitstun: 14, blockstun: 10, knockback: 2 * UNIT, hitstop: 3, hitbox: { x: 10, y: 30, w: 95, h: 8 }, mark: true },
    },
  },
  // Young, stern, stays in front of the hit. The special steps in with armor.
  'sang-ajudan': {
    id: 'sang-ajudan',
    label: 'Sang Ajudan',
    hp: 1000,
    walkSpeed: 768,
    jumpVelocity: 2560,
    moves: {
      punch: { kind: 'punch', startup: 4, active: 3, recovery: 8, damage: 40, hitstun: 12, blockstun: 8, knockback: 3 * UNIT, hitstop: 5, hitbox: { x: 10, y: 40, w: 28, h: 14 } },
      kick: { kind: 'kick', startup: 7, active: 4, recovery: 14, damage: 80, hitstun: 16, blockstun: 10, knockback: 5 * UNIT, hitstop: 6, hitbox: { x: 10, y: 12, w: 36, h: 16 } },
      special: { kind: 'special', startup: 10, active: 5, recovery: 22, damage: 90, hitstun: 18, blockstun: 12, knockback: 6 * UNIT, hitstop: 4, hitbox: { x: 10, y: 20, w: 46, h: 30 }, advance: 640, armor: true },
    },
  },
}
