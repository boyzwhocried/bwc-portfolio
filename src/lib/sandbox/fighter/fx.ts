import { FIGHTER_H, HALF_W, UNIT } from './constants'
import { hitRect } from './combat'
import type { FighterDef, FighterState, MatchState } from './types'

// Visual effects. Everything here is derived from pairs of sim states and never feeds back into
// the sim, so the sim stays deterministic. Positions are in screen pixels (x across the stage,
// y above the floor).

export const HURT_FLASH_FRAMES = 3
export const HEAVY_DAMAGE = 60 // hits at or above this shake the screen and flash once
export const WIRE_LINGER = 6 // frames the wire stays visible (shrinking) after its active frames
export const COMBO_WINDOW = 30 // sim frames after a hit in which the next hit still counts as part of the combo
export const COMBO_SHOW = 70 // sim frames the combo count stays on screen after the last hit
const SHAKE_HEAVY = 6
const SHAKE_KO = 10
const KO_FLASH_FRAMES = 10
const TTL = { hit: 8, block: 6, armor: 10, dust: 12 } as const

export type FxEvent =
  | { kind: 'hit' | 'block' | 'armor'; target: 0 | 1; x: number; y: number; damage: number; ko: boolean }
  | { kind: 'land'; target: 0 | 1; x: number }

export type Spark = { kind: 'hit' | 'block' | 'armor' | 'dust'; x: number; y: number; age: number; ttl: number }

export type FxState = {
  sparks: Spark[]
  hurt: [number, number] // frames of paper flash left per fighter
  shake: number // rendered frames of screen shake left
  flash: number // rendered frames of the heavy-hit screen flash left; kept until drawn
  koFlash: number // rendered frames of the KO flash left; kept until drawn
  combo: { by: 0 | 1 | null; count: number; age: number } // age = sim frames since the last counted hit
}

export function initFx(): FxState {
  return { sparks: [], hurt: [0, 0], shake: 0, flash: 0, koFlash: 0, combo: { by: null, count: 0, age: 0 } }
}

const mid = (a: [number, number], b: [number, number]) => {
  const lo = Math.max(a[0], b[0])
  const hi = Math.min(a[1], b[1])
  return (lo + hi) / 2
}

// What happened between two consecutive sim states, for the renderer.
export function detectEvents(prev: MatchState, next: MatchState): FxEvent[] {
  const out: FxEvent[] = []
  for (const i of [0, 1] as const) {
    const j = (1 - i) as 0 | 1
    const pa = prev.fighters[i]
    const na = next.fighters[i]
    if (!pa.hitConnected && na.hitConnected && pa.action === 'attack' && pa.move) {
      const move = prev.defs[i].moves[pa.move]
      const hb = hitRect({ ...pa, x: na.x, y: na.y, facing: na.facing }, move)
      const pd = prev.fighters[j]
      const nd = next.fighters[j]
      const x = mid(hb.x, [pd.x - HALF_W, pd.x + HALF_W]) / UNIT
      const y = mid(hb.y, [pd.y, pd.y + FIGHTER_H]) / UNIT
      const kind = nd.action === 'blockstun' ? 'block' : nd.action === 'attack' ? 'armor' : 'hit'
      out.push({ kind, target: j, x, y, damage: pd.hp - nd.hp, ko: nd.hp <= 0 && pd.hp > 0 })
    }
  }
  for (const i of [0, 1] as const) {
    if (prev.fighters[i].y > 0 && next.fighters[i].y === 0) out.push({ kind: 'land', target: i, x: next.fighters[i].x / UNIT })
  }
  return out
}

// Advances sim-time effects by one sim step and applies new events.
export function stepFx(fx: FxState, events: FxEvent[], reduce: boolean): FxState {
  let sparks = fx.sparks.map((p) => ({ ...p, age: p.age + 1 })).filter((p) => p.age < p.ttl)
  const hurt: [number, number] = [Math.max(0, fx.hurt[0] - 1), Math.max(0, fx.hurt[1] - 1)]
  let { shake, flash, koFlash } = fx
  let combo = { ...fx.combo, age: fx.combo.age + 1 }
  for (const e of events) {
    if (e.kind === 'land') {
      sparks = [...sparks, { kind: 'dust', x: e.x, y: 0, age: 0, ttl: TTL.dust }]
      continue
    }
    sparks = [...sparks, { kind: e.kind, x: e.x, y: e.y, age: 0, ttl: TTL[e.kind] }]
    if (e.kind === 'hit') {
      const by = (1 - e.target) as 0 | 1
      combo = combo.by === by && combo.age <= COMBO_WINDOW ? { by, count: combo.count + 1, age: 0 } : { by, count: 1, age: 0 }
    }
    if (reduce) continue
    if (e.kind === 'hit') hurt[e.target] = HURT_FLASH_FRAMES
    if (e.ko) {
      shake = Math.max(shake, SHAKE_KO)
      koFlash = KO_FLASH_FRAMES
    } else if (e.kind === 'hit' && e.damage >= HEAVY_DAMAGE) {
      shake = Math.max(shake, SHAKE_HEAVY)
      flash = 1
    }
  }
  return { sparks, hurt, shake, flash, koFlash, combo }
}

// Call once after each rendered frame: screen effects count in rendered frames, so a rendered
// frame that ran several sim steps cannot skip one.
export function afterDraw(fx: FxState): FxState {
  return { ...fx, shake: Math.max(0, fx.shake - 1), flash: Math.max(0, fx.flash - 1), koFlash: Math.max(0, fx.koFlash - 1) }
}

// The visible wire for a marking move: from the near edge to the far edge of its hitbox while
// active, then shrinking back for WIRE_LINGER frames. x1 < x0 when facing left.
export function wireFor(f: FighterState, def: FighterDef): { x0: number; x1: number; y: number } | null {
  if (f.action !== 'attack' || !f.move) return null
  const m = def.moves[f.move]
  if (!m.mark) return null
  const end = m.startup + m.active
  if (f.actionFrame < m.startup || f.actionFrame >= end + WIRE_LINGER) return null
  const k = f.actionFrame < end ? 1 : 1 - (f.actionFrame - end + 1) / (WIRE_LINGER + 1)
  const cx = f.x / UNIT
  const x0 = cx + f.facing * m.hitbox.x
  const x1 = x0 + f.facing * m.hitbox.w * k
  return { x0, x1, y: f.y / UNIT + m.hitbox.y + m.hitbox.h / 2 }
}
