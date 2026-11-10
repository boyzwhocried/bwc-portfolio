import { UNIT } from './sim'
import type { FighterDef, MoveDef } from './types'

const box = { x: 10, y: 30, w: 30, h: 16 }
export const TEST_PUNCH: MoveDef = { kind: 'punch', startup: 4, active: 3, recovery: 8, damage: 40, hitstun: 12, blockstun: 8, knockback: 3 * UNIT, hitstop: 3, hitbox: box }
export const TEST_KICK: MoveDef = { kind: 'kick', startup: 7, active: 4, recovery: 14, damage: 80, hitstun: 16, blockstun: 10, knockback: 5 * UNIT, hitstop: 4, hitbox: { x: 10, y: 10, w: 36, h: 16 } }
export const TEST_SPECIAL: MoveDef = { kind: 'special', startup: 12, active: 4, recovery: 20, damage: 100, hitstun: 20, blockstun: 12, knockback: 6 * UNIT, hitstop: 4, hitbox: { x: 10, y: 20, w: 48, h: 20 } }

export const TEST_CROUCH_PUNCH: MoveDef = { kind: 'crouchPunch', startup: 4, active: 3, recovery: 8, damage: 30, hitstun: 12, blockstun: 8, knockback: 2 * UNIT, hitstop: 3, hitbox: { x: 10, y: 2, w: 26, h: 12 } }
export const TEST_JUMP_KICK: MoveDef = { kind: 'jumpKick', startup: 3, active: 12, recovery: 6, damage: 60, hitstun: 14, blockstun: 12, knockback: 4 * UNIT, hitstop: 4, hitbox: { x: 6, y: 0, w: 28, h: 22 } }

export const TEST_DEF: FighterDef = {
  id: 'test',
  label: 'Test',
  hp: 1000,
  walkSpeed: 768,
  jumpVelocity: 2560,
  moves: { punch: TEST_PUNCH, kick: TEST_KICK, special: TEST_SPECIAL, crouchPunch: TEST_CROUCH_PUNCH, jumpKick: TEST_JUMP_KICK },
}
