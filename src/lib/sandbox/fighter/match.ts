import { freshFighters, stepWorld } from './world'
import type { Inputs, MatchState } from './types'

export const INTRO_FRAMES = 60
export const KO_FRAMES = 90
export const ROUND_END_FRAMES = 60
export const ROUND_FRAMES = 99 * 60
export const ROUNDS_TO_WIN = 2
export const RING_FRAMES = 20 * 60

const NONE: Inputs = [0, 0]

function endRound(s: MatchState, result: 'p1' | 'p2' | 'draw', byKo: boolean): MatchState {
  const wins: [number, number] = [
    s.wins[0] + (result === 'p1' || result === 'draw' ? 1 : 0),
    s.wins[1] + (result === 'p2' || result === 'draw' ? 1 : 0),
  ]
  return { ...s, wins, phase: byKo ? 'ko' : 'roundEnd', phaseFrame: 0 }
}

function nextRound(s: MatchState): MatchState {
  return {
    ...s,
    round: s.round + 1,
    reshuffles: 0,
    hitstop: 0,
    roundTimer: ROUND_FRAMES,
    fighters: freshFighters(s.defs),
    phase: s.introFrames > 0 ? 'intro' : 'fight',
    phaseFrame: 0,
  }
}

// A fighter whose def has `revive` gets up once per round instead of being KO'd.
function revive(s: MatchState): MatchState {
  const fs = s.fighters.map((f, i) => {
    const rev = s.defs[i].revive
    if (rev === undefined || f.revived || f.hp > 0) return f
    return { ...f, hp: rev, revived: true, action: f.y > 0 ? 'jump' : 'idle', move: null, actionFrame: 0, stun: 0, hitConnected: false, buffered: null, vx: 0 } as typeof f
  }) as MatchState['fighters']
  return fs[0] === s.fighters[0] && fs[1] === s.fighters[1] ? s : { ...s, fighters: fs }
}

// The desk phone: every RING_FRAMES of live round time it rings. On odd rings a fighter whose def has
// `reshuffle` is handed to an identical replacement (same hp and place, whatever it was doing is gone);
// even rings only rotate the chairs, which is cosmetic.
function ring(s: MatchState): MatchState {
  const elapsed = ROUND_FRAMES - s.roundTimer
  if (elapsed <= 0 || !s.defs.some((d) => d.reshuffle !== undefined)) return s
  if (!s.defs.some((d) => d.reshuffle !== undefined && elapsed % d.reshuffle === 0)) return s
  const reshuffles = s.reshuffles + 1
  if (reshuffles % 2 === 0) return { ...s, reshuffles }
  const fs = s.fighters.map((f, i) => {
    const every = s.defs[i].reshuffle
    if (every === undefined || elapsed % every !== 0) return f
    return { ...f, action: f.y > 0 ? 'jump' : 'idle', move: null, actionFrame: 0, stun: 0, hitConnected: false, buffered: null, vx: 0 } as typeof f
  }) as MatchState['fighters']
  return { ...s, reshuffles, fighters: fs }
}

export function stepMatch(s: MatchState, inputs: Inputs): MatchState {
  const base = { ...s, frame: s.frame + 1 }
  switch (s.phase) {
    case 'matchEnd':
      return base
    case 'intro': {
      const pf = s.phaseFrame + 1
      return pf >= s.introFrames ? { ...base, phase: 'fight', phaseFrame: 0 } : { ...base, phaseFrame: pf }
    }
    case 'fight': {
      const frozen = s.hitstop > 0
      let n = revive(stepWorld(s, inputs))
      if (!frozen) n = ring({ ...n, roundTimer: n.roundTimer - 1 })
      const [a, b] = n.fighters
      const koA = a.hp <= 0
      const koB = b.hp <= 0
      if (koA || koB) return endRound(n, koA && koB ? 'draw' : koB ? 'p1' : 'p2', true)
      if (n.roundTimer <= 0) return endRound(n, a.hp > b.hp ? 'p1' : b.hp > a.hp ? 'p2' : 'draw', false)
      return n
    }
    case 'ko': {
      const n = stepWorld(s, NONE)
      const pf = s.phaseFrame + 1
      return pf >= KO_FRAMES ? { ...n, phase: 'roundEnd', phaseFrame: 0 } : { ...n, phaseFrame: pf }
    }
    case 'roundEnd': {
      const pf = s.phaseFrame + 1
      if (pf < ROUND_END_FRAMES) return { ...base, phaseFrame: pf }
      const over = s.wins[0] >= ROUNDS_TO_WIN || s.wins[1] >= ROUNDS_TO_WIN
      return over ? { ...base, phase: 'matchEnd', phaseFrame: 0 } : nextRound(base)
    }
  }
}

export function matchWinner(s: MatchState): 'p1' | 'p2' | 'draw' | null {
  if (s.phase !== 'matchEnd') return null
  return s.wins[0] > s.wins[1] ? 'p1' : s.wins[1] > s.wins[0] ? 'p2' : 'draw'
}
