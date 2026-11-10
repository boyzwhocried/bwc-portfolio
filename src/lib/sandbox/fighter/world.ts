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
    buffered: null,
    held: 0,
  })
  return [mk(defs[0], 100, 1), mk(defs[1], 220, -1)]
}

// A connected move can be cancelled into a stronger one: punch, then kick, then special.
// The jump kick never cancels into anything.
const TIER: Record<MoveKind, number> = { punch: 0, kick: 1, special: 2, crouchPunch: 0, jumpKick: 99 }

const ATTACK_BITS = BTN.PUNCH | BTN.KICK | BTN.SPECIAL

// Attack priority when several buttons go down together: special, kick, punch.
function attackPressed(input: number): MoveKind | null {
  if (input & BTN.SPECIAL) return 'special'
  if (input & BTN.KICK) return 'kick'
  if (input & BTN.PUNCH) return 'punch'
  return null
}

// Which move a fresh button press starts, from the stance: down plus punch on the ground is the
// crouch punch, kick in the air is the jump kick, and the other buttons do nothing in the air.
function resolveMove(base: MoveKind | null, grounded: boolean, crouching: boolean): MoveKind | null {
  if (!base) return null
  if (!grounded) return base === 'kick' ? 'jumpKick' : null
  return crouching && base === 'punch' ? 'crouchPunch' : base
}

function stepFighter(f: FighterState, def: FighterDef, input: number): FighterState {
  let { y, vy, action, move, actionFrame, stun, hitConnected } = f
  // only a new press attacks: a button still held from the previous step does nothing
  const atkInput = attackPressed(input & ~f.held) ?? f.buffered
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
  if (action === 'idle' || action === 'walk' || action === 'jump' || action === 'block' || action === 'crouch') {
    const grounded = y === 0 && vy === 0
    const h = dirAxis(input, BTN.LEFT, BTN.RIGHT)
    const v = dirAxis(input, BTN.DOWN, BTN.UP)
    const atk = resolveMove(atkInput, grounded, grounded && v === -1)
    if (atk) {
      action = 'attack'
      move = atk
      actionFrame = 0
      hitConnected = false
    } else if (grounded && input & BTN.BLOCK) {
      action = 'block'
    } else if (grounded && v === -1) {
      action = 'crouch'
    } else {
      if (grounded && v === 1) vy = def.jumpVelocity
      vx = h * def.walkSpeed
      action = grounded && vy === 0 ? (h !== 0 ? 'walk' : 'idle') : 'jump'
    }
  } else if (action === 'attack' && move && hitConnected && atkInput && TIER[atkInput] > TIER[move]) {
    move = atkInput
    actionFrame = 0
    hitConnected = false
  }

  if (action === 'attack' && move) {
    const m = def.moves[move]
    // the jump kick keeps the air momentum it started with, until it lands
    if (move === 'jumpKick' && (f.y > 0 || f.vy !== 0)) vx = f.vx
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
      // landing during a jump kick skips the rest of the swing and goes straight to recovery
      else if (action === 'attack' && move === 'jumpKick') actionFrame = Math.max(actionFrame, def.moves.jumpKick.startup + def.moves.jumpKick.active)
    }
  }
  const x = Math.min(STAGE_W - HALF_W, Math.max(HALF_W, f.x + vx))
  return { ...f, x, y, vx, vy, action, move, actionFrame, stun, hitConnected, buffered: null, held: input & ATTACK_BITS }
}

// One frame of fighter physics and combat. Round flow lives in match.ts.
export function stepWorld(s: MatchState, inputs: Inputs): MatchState {
  if (s.hitstop > 0) {
    // inputs are ignored during the freeze, but the last attack press is kept for the first free frame
    const keep = (f: FighterState, input: number): FighterState => ({ ...f, buffered: attackPressed(input & ~f.held) ?? f.buffered, held: input & ATTACK_BITS })
    return { ...s, frame: s.frame + 1, hitstop: s.hitstop - 1, fighters: [keep(s.fighters[0], inputs[0]), keep(s.fighters[1], inputs[1])] }
  }
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
