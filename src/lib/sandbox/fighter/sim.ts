import { FIGHTER_H, GRAVITY, HALF_W, STAGE_W, UNIT } from './constants'
import { ROUND_FRAMES, stepMatch } from './match'
import { ACTIONS, MOVE_KINDS, PHASES, type FighterDef, type Inputs, type MatchState } from './types'
import { JUMP_FRAMES, freshFighters } from './world'

export { FIGHTER_H, GRAVITY, HALF_W, JUMP_FRAMES, STAGE_W, UNIT }

// introFrames = 0 starts straight in the fight phase (used by tests); the game passes INTRO_FRAMES.
export function initMatch(seed: number, defs: [FighterDef, FighterDef], introFrames = 0): MatchState {
  return {
    frame: 0,
    seed,
    hitstop: 0,
    phase: introFrames > 0 ? 'intro' : 'fight',
    phaseFrame: 0,
    introFrames,
    roundTimer: ROUND_FRAMES,
    wins: [0, 0],
    round: 1,
    fighters: freshFighters(defs),
    defs,
  }
}

export function step(s: MatchState, inputs: Inputs): MatchState {
  return stepMatch(s, inputs)
}

// FNV-1a over a fixed field order.
export function hashState(s: MatchState): number {
  let h = 0x811c9dc5
  const mix = (n: number) => {
    h ^= n | 0
    h = Math.imul(h, 0x01000193)
  }
  mix(s.frame)
  mix(s.seed)
  mix(s.hitstop)
  mix(PHASES.indexOf(s.phase))
  mix(s.phaseFrame)
  mix(s.introFrames)
  mix(s.roundTimer)
  mix(s.wins[0])
  mix(s.wins[1])
  mix(s.round)
  for (const f of s.fighters) {
    mix(f.x)
    mix(f.y)
    mix(f.vx)
    mix(f.vy)
    mix(f.facing)
    mix(f.hp)
    mix(ACTIONS.indexOf(f.action))
    mix(f.move ? MOVE_KINDS.indexOf(f.move) : -1)
    mix(f.actionFrame)
    mix(f.stun)
    mix(f.hitConnected ? 1 : 0)
    mix(f.bugged ? 1 : 0)
    mix(f.buffered ? MOVE_KINDS.indexOf(f.buffered) : -1)
  }
  return h >>> 0
}
