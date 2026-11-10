import { FIGHTER_H, HALF_W, STAGE_W, UNIT } from './constants'
import type { FighterState, MatchState, MoveDef } from './types'

type Range = [number, number]
const overlaps = (a: Range, b: Range) => a[0] < b[1] && b[0] < a[1]

export function hitRect(att: FighterState, m: MoveDef): { x: Range; y: Range } {
  const near = m.hitbox.x * UNIT
  const far = (m.hitbox.x + m.hitbox.w) * UNIT
  const x: Range = att.facing === 1 ? [att.x + near, att.x + far] : [att.x - far, att.x - near]
  return { x, y: [att.y + m.hitbox.y * UNIT, att.y + (m.hitbox.y + m.hitbox.h) * UNIT] }
}

function isActive(f: FighterState, m: MoveDef): boolean {
  return f.action === 'attack' && !f.hitConnected && f.actionFrame >= m.startup && f.actionFrame < m.startup + m.active
}

// Both attackers are evaluated against the pre-hit state, so simultaneous
// hits (a trade) resolve identically regardless of player order.
export function resolveHits(s: MatchState): MatchState {
  const fs: [FighterState, FighterState] = [{ ...s.fighters[0] }, { ...s.fighters[1] }]
  let hitstop = s.hitstop
  const landed: [boolean, boolean] = [false, false]
  const hurt = (d: FighterState): { x: Range; y: Range } => ({
    x: [d.x - HALF_W, d.x + HALF_W],
    y: [d.y, d.y + FIGHTER_H],
  })

  for (const i of [0, 1] as const) {
    const j = (1 - i) as 0 | 1
    const att = s.fighters[i]
    const move = att.move ? s.defs[i].moves[att.move] : null
    if (!move || !isActive(att, move)) continue
    const hb = hitRect(att, move)
    const hu = hurt(s.fighters[j])
    if (!overlaps(hb.x, hu.x) || !overlaps(hb.y, hu.y)) continue
    landed[i] = true
    const blocked = s.fighters[j].action === 'block'
    const dmg = blocked ? Math.floor(move.damage / 10) : move.damage
    const hp = Math.max(0, fs[j].hp - dmg)
    const x = Math.min(STAGE_W - HALF_W, Math.max(HALF_W, fs[j].x + att.facing * move.knockback))
    fs[j] = {
      ...fs[j],
      hp,
      x,
      action: hp === 0 ? 'ko' : blocked ? 'blockstun' : 'hitstun',
      stun: blocked ? move.blockstun : move.hitstun,
      move: null,
      actionFrame: 0,
      hitConnected: false,
    }
    hitstop = Math.max(hitstop, move.hitstop)
  }
  for (const i of [0, 1] as const) if (landed[i]) fs[i] = { ...fs[i], hitConnected: true }
  return { ...s, fighters: fs, hitstop }
}
