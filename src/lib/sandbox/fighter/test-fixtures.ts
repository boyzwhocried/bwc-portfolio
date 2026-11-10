import { UNIT } from './sim'
import type { FighterDef, MoveDef } from './types'

const box = { x: 10, y: 30, w: 30, h: 16 }
export const TEST_PUNCH: MoveDef = { kind: 'punch', startup: 4, active: 3, recovery: 8, damage: 40, hitstun: 12, blockstun: 8, knockback: 3 * UNIT, hitstop: 3, hitbox: box }
export const TEST_KICK: MoveDef = { kind: 'kick', startup: 7, active: 4, recovery: 14, damage: 80, hitstun: 16, blockstun: 10, knockback: 5 * UNIT, hitstop: 4, hitbox: { x: 10, y: 10, w: 36, h: 16 } }
export const TEST_SPECIAL: MoveDef = { kind: 'special', startup: 12, active: 4, recovery: 20, damage: 100, hitstun: 20, blockstun: 12, knockback: 6 * UNIT, hitstop: 4, hitbox: { x: 10, y: 20, w: 48, h: 20 } }

export const TEST_DEF: FighterDef = {
  id: 'test',
  label: 'Test',
  hp: 1000,
  walkSpeed: 768,
  jumpVelocity: 2560,
  moves: { punch: TEST_PUNCH, kick: TEST_KICK, special: TEST_SPECIAL },
}
