import { freshFighters, stepWorld } from './world'
import type { Inputs, MatchState } from './types'

export const INTRO_FRAMES = 60
export const KO_FRAMES = 90
export const ROUND_END_FRAMES = 60
export const ROUND_FRAMES = 99 * 60
export const ROUNDS_TO_WIN = 2

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
    hitstop: 0,
    roundTimer: ROUND_FRAMES,
    fighters: freshFighters(s.defs),
    phase: s.introFrames > 0 ? 'intro' : 'fight',
    phaseFrame: 0,
  }
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
      let n = stepWorld(s, inputs)
      if (!frozen) n = { ...n, roundTimer: n.roundTimer - 1 }
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
