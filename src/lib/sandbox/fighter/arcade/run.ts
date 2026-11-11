import { FIGHTERS, type FighterId } from '../roster'
import { initMatch } from '../sim'
import { INTRO_FRAMES } from '../match'
import type { MatchState } from '../types'
import { STAGES, TICKER_LINES, WIN_ENDING, LOSE_ENDING, type ArcadeStage, type Bilingual, type Ending } from './stages'

export const CONTINUES = 3

// pre = dialogue screen before a fight, fight = match in progress, continue = lost and may retry,
// won / lost = run over.
export type RunStatus = 'pre' | 'fight' | 'continue' | 'won' | 'lost'

export type ArcadeRun = {
  hero: FighterId
  stage: number // 0-based index into STAGES
  status: RunStatus
  continuesLeft: number
  envelopes: number // the running gag: one per stage cleared
  attempt: number // continues used on the current stage; part of the match seed
}

// The hero is always player one (left); the stage opponent is player two.
export type MatchResult = 'p1' | 'p2' | 'draw'

export function startRun(hero: FighterId): ArcadeRun {
  return { hero, stage: 0, status: 'pre', continuesLeft: CONTINUES, envelopes: 0, attempt: 0 }
}

export function currentStage(r: ArcadeRun): ArcadeStage {
  return STAGES[r.stage]
}

export function beginFight(r: ArcadeRun): ArcadeRun {
  return r.status === 'pre' ? { ...r, status: 'fight' } : r
}

export function finishMatch(r: ArcadeRun, result: MatchResult): ArcadeRun {
  if (r.status !== 'fight') return r
  if (result === 'p1') {
    const envelopes = r.envelopes + 1
    if (r.stage >= STAGES.length - 1) return { ...r, envelopes, status: 'won' }
    return { ...r, envelopes, stage: r.stage + 1, attempt: 0, status: 'pre' }
  }
  // p2 and draw both lose the stage
  return { ...r, status: r.continuesLeft > 0 ? 'continue' : 'lost' }
}

export function takeContinue(r: ArcadeRun): ArcadeRun {
  return r.status === 'continue' ? { ...r, status: 'pre', continuesLeft: r.continuesLeft - 1, attempt: r.attempt + 1 } : r
}

export function giveUp(r: ArcadeRun): ArcadeRun {
  return r.status === 'continue' ? { ...r, status: 'lost' } : r
}

export function runEnding(r: ArcadeRun): Ending | null {
  return r.status === 'won' ? WIN_ENDING : r.status === 'lost' ? LOSE_ENDING : null
}

// Deterministic per hero, stage and attempt, so a replay of the same attempt is the same fight.
export function matchSeed(r: ArcadeRun): number {
  const heroBit = r.hero === 'sang-ajudan' ? 1 : 0
  return (0xa11ce + (r.stage + 1) * 1009 + r.attempt * 7919 + heroBit * 31) >>> 0
}

export function arcadeMatch(r: ArcadeRun): MatchState {
  return initMatch(matchSeed(r), [FIGHTERS[r.hero], currentStage(r).opponent], INTRO_FRAMES)
}

export function tickerFor(r: ArcadeRun): Bilingual {
  return TICKER_LINES[(r.stage * 3 + r.attempt) % TICKER_LINES.length]
}
