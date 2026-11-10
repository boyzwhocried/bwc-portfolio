import { GRAVITY, HALF_W, STAGE_W, UNIT } from './constants'
import { resolveHits } from './combat'
import { BTN, type FighterDef, type FighterState, type Inputs, type MatchState, type MoveKind } from './types'

// Frames from the first airborne frame until y returns to 0 for jumpVelocity 2560.
// y after n frames = v*n - g*n*(n-1)/2, which first returns to <= 0 at n = 33.
export const JUMP_FRAMES = 33

function dirAxis(input: number, neg: number, pos: number): -1 | 0 | 1 {
  const n = (input & neg) !== 0
  const p = (input & pos) !== 0
  return n === p ? 0 : p ? 1 : -1
}

export function freshFighters(defs: [FighterDef, FighterDef]): [FighterState, FighterState] {
  const mk = (def: FighterDef, px: number, facing: 1 | -1): FighterState => ({
    x: px * UNIT,
    y: 0,
    vx: 0,
    vy: 0,
    facing,
    hp: def.hp,
    action: 'idle',
    move: null,
    actionFrame: 0,
    stun: 0,
    hitConnected: false,
    bugged: false,
  })
  return [mk(defs[0], 100, 1), mk(defs[1], 220, -1)]
}

// Attack priority when several buttons are held: special, kick, punch.
function attackPressed(input: number): MoveKind | null {
  if (input & BTN.SPECIAL) return 'special'
  if (input & BTN.KICK) return 'kick'
  if (input & BTN.PUNCH) return 'punch'
  return null
}

function stepFighter(f: FighterState, def: FighterDef, input: number): FighterState {
  let { y, vy, action, move, actionFrame, stun, hitConnected } = f
  let vx = 0

  // timers
  if (action === 'attack' && move) {
    actionFrame++
    const m = def.moves[move]
    if (actionFrame >= m.startup + m.active + m.recovery) {
      action = 'idle'
      move = null
      actionFrame = 0
    }
  } else if (action === 'hitstun' || action === 'blockstun') {
    stun--
    if (stun <= 0) {
      action = 'idle'
      stun = 0
    }
  }

  // decisions (only when free to act)
  if (action === 'idle' || action === 'walk' || action === 'jump' || action === 'block') {
    const grounded = y === 0 && vy === 0
    const atk = attackPressed(input)
    if (grounded && atk) {
      action = 'attack'
      move = atk
      actionFrame = 0
      hitConnected = false
    } else if (grounded && input & BTN.BLOCK) {
      action = 'block'
    } else {
      const h = dirAxis(input, BTN.LEFT, BTN.RIGHT)
      const v = dirAxis(input, BTN.DOWN, BTN.UP)
      if (grounded && v === 1) vy = def.jumpVelocity
      vx = h * def.walkSpeed
      action = grounded && vy === 0 ? (h !== 0 ? 'walk' : 'idle') : 'jump'
    }
  }

  if (action === 'attack' && move) {
    const m = def.moves[move]
    if (m.advance && actionFrame >= m.startup && actionFrame < m.startup + m.active) vx = f.facing * m.advance
  }

  // vertical physics
  if (vy !== 0 || y > 0) {
    y += vy
    vy -= GRAVITY
    if (y <= 0) {
      y = 0
      vy = 0
      if (action === 'jump') action = 'idle'
    }
  }
  const x = Math.min(STAGE_W - HALF_W, Math.max(HALF_W, f.x + vx))
  return { ...f, x, y, vx, vy, action, move, actionFrame, stun, hitConnected }
}

// One frame of fighter physics and combat. Round flow lives in match.ts.
export function stepWorld(s: MatchState, inputs: Inputs): MatchState {
  if (s.hitstop > 0) return { ...s, frame: s.frame + 1, hitstop: s.hitstop - 1 }
  const a = stepFighter(s.fighters[0], s.defs[0], inputs[0])
  const b = stepFighter(s.fighters[1], s.defs[1], inputs[1])
  const face = (me: FighterState, other: FighterState): 1 | -1 =>
    other.x > me.x ? 1 : other.x < me.x ? -1 : me.facing
  const moved: MatchState = {
    ...s,
    frame: s.frame + 1,
    fighters: [{ ...a, facing: face(a, b) }, { ...b, facing: face(b, a) }],
  }
  return resolveHits(moved)
}
