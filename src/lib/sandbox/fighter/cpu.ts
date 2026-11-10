import { UNIT } from './constants'
import { nextRng } from './rng'
import { BTN, type MatchState } from './types'

export type CpuLevel = 'easy' | 'normal'

// Per-frame percentages. Easy is slow and passive; normal is busier and blocks more.
const RATES: Record<CpuLevel, { approach: number; punch: number; kick: number; special: number; block: number; cancel: number }> = {
  easy: { approach: 55, punch: 7, kick: 3, special: 2, block: 15, cancel: 0 },
  normal: { approach: 85, punch: 14, kick: 7, special: 4, block: 45, cancel: 6 },
}

const BUSY = new Set(['attack', 'hitstun', 'blockstun', 'ko'])

// Pure and seeded. The caller writes `seed` back into the state before stepping.
// It looks at the current match state only, never at the other side's input for this frame.
export function cpuInput(s: MatchState, side: 0 | 1, level: CpuLevel): { input: number; seed: number } {
  const [r1, seed1] = nextRng(s.seed)
  const [r2, seed2] = nextRng(seed1)
  const none = { input: 0, seed: seed2 }
  if (s.phase !== 'fight') return none

  const me = s.fighters[side]
  const opp = s.fighters[(1 - side) as 0 | 1]
  const rate = RATES[level]
  // a swing that connected can be cancelled into a stronger move (punch, kick, special)
  if (me.action === 'attack' && me.hitConnected && me.move && me.move !== 'special' && rate.cancel > 0) {
    const [c1, seedC] = nextRng(seed2)
    if (c1 % 100 < rate.cancel) {
      const next = me.move === 'punch' ? (c1 % 2 === 0 ? BTN.KICK : BTN.SPECIAL) : BTN.SPECIAL
      return { input: next, seed: seedC }
    }
    return { input: 0, seed: seedC }
  }
  if (BUSY.has(me.action)) return none

  const a = r1 % 100
  const b = r2 % 100
  const dist = Math.abs(opp.x - me.x) / UNIT
  const moves = s.defs[side].moves
  const reach = (k: 'punch' | 'special') => moves[k].hitbox.x + moves[k].hitbox.w
  const toward = opp.x > me.x ? BTN.RIGHT : BTN.LEFT

  if (dist <= reach('punch')) {
    if (opp.action === 'attack' && a < rate.block) return { input: BTN.BLOCK, seed: seed2 }
    if (a < rate.punch) return { input: BTN.PUNCH, seed: seed2 }
    if (b < rate.kick) return { input: BTN.KICK, seed: seed2 }
    return none
  }
  if (dist <= reach('special') && b < rate.special) return { input: BTN.SPECIAL, seed: seed2 }
  return a < rate.approach ? { input: toward, seed: seed2 } : none
}
