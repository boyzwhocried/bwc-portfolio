import { BTN, type FighterDef, type FighterState, type Inputs, type MatchState } from './types'

export const UNIT = 256 // world units per pixel
export const STAGE_W = 320 * UNIT
export const HALF_W = 12 * UNIT
export const GRAVITY = 160

// Frames from the first airborne frame until y returns to 0 for jumpVelocity 2560.
// y after n frames = v*n - g*n*(n-1)/2, which first returns to <= 0 at n = 33.
export const JUMP_FRAMES = 33

function dirAxis(input: number, neg: number, pos: number): -1 | 0 | 1 {
  const n = (input & neg) !== 0
  const p = (input & pos) !== 0
  return n === p ? 0 : p ? 1 : -1
}

export function initMatch(seed: number, defs: [FighterDef, FighterDef]): MatchState {
  const mk = (def: FighterDef, px: number, facing: 1 | -1): FighterState => ({
    x: px * UNIT,
    y: 0,
    vx: 0,
    vy: 0,
    facing,
    hp: def.hp,
  })
  return {
    frame: 0,
    seed,
    fighters: [mk(defs[0], 100, 1), mk(defs[1], 220, -1)],
    defs,
  }
}

function stepFighter(f: FighterState, def: FighterDef, input: number): FighterState {
  const h = dirAxis(input, BTN.LEFT, BTN.RIGHT)
  const v = dirAxis(input, BTN.DOWN, BTN.UP)
  let { y, vy } = f
  if (y === 0 && vy === 0 && v === 1) vy = def.jumpVelocity
  if (vy !== 0 || y > 0) {
    y += vy
    vy -= GRAVITY
    if (y <= 0) {
      y = 0
      vy = 0
    }
  }
  const vx = h * def.walkSpeed
  const x = Math.min(STAGE_W - HALF_W, Math.max(HALF_W, f.x + vx))
  return { ...f, x, y, vx, vy }
}

export function step(s: MatchState, inputs: Inputs): MatchState {
  const a = stepFighter(s.fighters[0], s.defs[0], inputs[0])
  const b = stepFighter(s.fighters[1], s.defs[1], inputs[1])
  const face = (me: FighterState, other: FighterState): 1 | -1 =>
    other.x > me.x ? 1 : other.x < me.x ? -1 : me.facing
  return {
    ...s,
    frame: s.frame + 1,
    fighters: [{ ...a, facing: face(a, b) }, { ...b, facing: face(b, a) }],
  }
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
  for (const f of s.fighters) {
    mix(f.x)
    mix(f.y)
    mix(f.vx)
    mix(f.vy)
    mix(f.facing)
    mix(f.hp)
  }
  return h >>> 0
}
