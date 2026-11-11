import { bossPhase, seatPct } from './boss'
import { BUG_BONUS_PCT, CROUCH_H, FIGHTER_H, HALF_W, STAGE_W, UNIT } from './constants'
import type { FighterDef, FighterState, MatchState, MoveDef } from './types'

type Range = [number, number]
const overlaps = (a: Range, b: Range) => a[0] < b[1] && b[0] < a[1]

export function hitRect(att: FighterState, m: MoveDef): { x: Range; y: Range } {
  const near = m.hitbox.x * UNIT
  const far = (m.hitbox.x + m.hitbox.w) * UNIT
  const x: Range = att.facing === 1 ? [att.x + near, att.x + far] : [att.x - far, att.x - near]
  return { x, y: [att.y + m.hitbox.y * UNIT, att.y + (m.hitbox.y + m.hitbox.h) * UNIT] }
}

// How tall the fighter's hurtbox is right now: short while crouching or throwing the crouch punch.
export function hurtHeight(f: FighterState): number {
  return f.action === 'crouch' || (f.action === 'attack' && f.move === 'crouchPunch') ? CROUCH_H : FIGHTER_H
}

// True while an armored move absorbs hits: from its first frame until its active frames end.
export function isArmed(f: FighterState, def: FighterDef): boolean {
  if (f.action !== 'attack' || !f.move) return false
  const m = def.moves[f.move]
  return !!m.armor && f.actionFrame < m.startup + m.active
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
    y: [d.y, d.y + hurtHeight(d)],
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
    hitstop = Math.max(hitstop, move.hitstop)
    const dstate = s.fighters[j]
    const blocked = dstate.action === 'block'
    // a hit that is not blocked uses up the BUGGED mark for bonus damage; a marking move then re-marks
    // the boss's phase 2 chair rule: only hits from the side of the chair in office land in full
    const seat = s.defs[j].boss ? seatPct(bossPhase(dstate.hp, s.defs[j].hp), att.x, dstate.x, s.reshuffles) : 100
    const raw = Math.floor((move.damage * seat) / 100)
    const base = dstate.bugged && !blocked ? Math.floor((raw * (100 + BUG_BONUS_PCT)) / 100) : raw
    const bugged = blocked ? dstate.bugged : !!move.mark
    if (isArmed(dstate, s.defs[j])) {
      const hpA = Math.max(0, fs[j].hp - Math.floor(base / 2))
      fs[j] = { ...fs[j], hp: hpA, bugged, action: hpA === 0 ? 'ko' : fs[j].action }
      continue
    }
    const dmg = blocked ? Math.floor(raw / 10) : base
    const hp = Math.max(0, fs[j].hp - dmg)
    const x = Math.min(STAGE_W - HALF_W, Math.max(HALF_W, fs[j].x + att.facing * move.knockback))
    fs[j] = {
      ...fs[j],
      hp,
      bugged,
      x,
      action: hp === 0 ? 'ko' : blocked ? 'blockstun' : 'hitstun',
      stun: blocked ? move.blockstun : move.hitstun,
      move: null,
      actionFrame: 0,
      hitConnected: false,
    }
  }
  for (const i of [0, 1] as const) if (landed[i]) fs[i] = { ...fs[i], hitConnected: true }
  return { ...s, fighters: fs, hitstop }
}
