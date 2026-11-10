import type { AnimName } from './art/sprite'
import type { FighterDef, FighterState } from './types'

export type Pose = { anim: AnimName; index: number; smear: boolean }

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
    case 'jump':
      return { anim: 'jump', index: 0, smear: false }
    case 'walk':
      return { anim: 'walk', index: (frame >> 3) & 3, smear: false }
    case 'attack': {
      if (!f.move) return { anim: 'idle', index: 0, smear: false }
      const m = def.moves[f.move]
      if (f.actionFrame < m.startup) return { anim: f.move, index: 0, smear: false }
      if (f.actionFrame < m.startup + m.active) return { anim: f.move, index: 1, smear: true }
      return { anim: f.move, index: 2, smear: false }
    }
    default:
      return { anim: 'idle', index: (frame >> 5) & 1, smear: false }
  }
}
