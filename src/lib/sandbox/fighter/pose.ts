import type { AnimName } from './art/sprite'
import type { FighterDef, FighterState } from './types'

// crouch is only present (and true) for crouched poses; the renderer draws those squashed.
export type Pose = { anim: AnimName; index: number; smear: boolean; crouch?: boolean }

// Maps sim state to the animation frame to draw. Purely visual; never feeds back into the sim.
export function poseFor(f: FighterState, def: FighterDef, frame: number, koAge: number): Pose {
  switch (f.action) {
    case 'ko':
      return { anim: 'ko', index: koAge < 12 ? 0 : 1, smear: false }
    case 'hitstun':
      return { anim: 'hit', index: (frame >> 2) & 1, smear: false }
    case 'block':
    case 'blockstun':
      return { anim: 'block', index: 0, smear: false }
    case 'crouch':
      return { anim: 'idle', index: 0, smear: false, crouch: true }
    case 'jump':
      return { anim: 'jump', index: 0, smear: false }
    case 'walk':
      return { anim: 'walk', index: (frame >> 3) & 3, smear: false }
    case 'attack': {
      if (!f.move) return { anim: 'idle', index: 0, smear: false }
      const m = def.moves[f.move]
      // the new moves reuse the punch and kick frames
      const anim: AnimName = f.move === 'crouchPunch' ? 'punch' : f.move === 'jumpKick' ? 'kick' : f.move
      const low = f.move === 'crouchPunch' ? { crouch: true } : {}
      if (f.actionFrame < m.startup) return { anim, index: 0, smear: false, ...low }
      if (f.actionFrame < m.startup + m.active) return { anim, index: 1, smear: true, ...low }
      return { anim, index: 2, smear: false, ...low }
    }
    default:
      return { anim: 'idle', index: (frame >> 5) & 1, smear: false }
  }
}
