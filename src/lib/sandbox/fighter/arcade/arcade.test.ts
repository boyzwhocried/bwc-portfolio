import { describe, it, expect } from 'vitest'
import { STAGES, ARCADE_TITLE, DISCLAIMER, TICKER_LINES, WIN_ENDING, LOSE_ENDING, type Bilingual } from './stages'
import { startRun, currentStage, beginFight, finishMatch, takeContinue, giveUp, matchSeed, arcadeMatch, tickerFor, runEnding, CONTINUES } from './run'
import { FIGHTERS, FIGHTER_IDS } from '../roster'
import { MOVE_KINDS } from '../types'
import { stepMatch, ROUND_FRAMES, RING_FRAMES } from '../match'
import { bossPhase, reviewOpen, chairSide, seatPct, bossPlate, OFF_SEAT_PCT, REVIEW_CYCLE, REVIEW_OPEN } from '../boss'
import { cpuInput } from '../cpu'
import { BTN, type MatchState } from '../types'
import { initMatch, hashState, UNIT } from '../sim'
import { freshFighters } from '../world'

const EM_DASH = String.fromCharCode(0x2014)

function allText(): string[] {
  const out: string[] = []
  const add = (b: Bilingual) => out.push(b.id, b.en)
  add(ARCADE_TITLE)
  add(DISCLAIMER)
  TICKER_LINES.forEach(add)
  for (const e of [WIN_ENDING, LOSE_ENDING]) {
    e.lines.forEach(add)
    add(e.caption)
  }
  for (const s of STAGES) {
    add(s.name)
    add(s.defeat)
    s.pre.forEach((p) => add(p.text))
  }
  return out
}

describe('arcade stages', () => {
  it('has the six stages of the bible in order, ending on the standing committee boss', () => {
    expect(STAGES.map((s) => s.slug)).toEqual(['hutan-kabut', 'jalan-raya-tuntutan', 'dapur-rapat', 'loket-antrean', 'ruang-kurs', 'gerbang-kubah'])
    expect(STAGES.map((s) => s.opponent.label)).toEqual(['Sang Juru Bicara', 'Si Pelabel', 'Sang Katering', 'Sang Pengganti', 'Sang Penempatan', 'Panitia Tetap'])
    expect(STAGES.map((s) => !!s.boss)).toEqual([false, false, false, false, false, true])
  })

  it('opponent ids are unique slugs and never collide with a playable fighter', () => {
    const ids = STAGES.map((s) => s.opponent.id)
    expect(new Set(ids).size).toBe(6)
    for (const id of ids) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/)
      expect((FIGHTER_IDS as readonly string[]).includes(id)).toBe(false)
    }
  })

  it('every opponent has a legal moveset: frames >= 1, special at most 2x kick, no stolen hero mechanics', () => {
    for (const s of STAGES) {
      const d = s.opponent
      expect(d.hp).toBeGreaterThan(0)
      expect(d.walkSpeed).toBeGreaterThan(0)
      for (const k of MOVE_KINDS) {
        const m = d.moves[k]
        expect(m.kind).toBe(k)
        expect(m.startup).toBeGreaterThanOrEqual(1)
        expect(m.active).toBeGreaterThanOrEqual(1)
        expect(m.recovery).toBeGreaterThanOrEqual(1)
        expect(m.damage).toBeGreaterThan(0)
      }
      expect(d.moves.special.damage).toBeLessThanOrEqual(d.moves.kick.damage * 2)
      expect(d.moves.punch.hitstop).toBe(5)
      expect(d.moves.kick.hitstop).toBe(6)
    }
  })

  it('the ladder climbs: hp never drops from one stage to the next and the boss has the most', () => {
    const hps = STAGES.map((s) => s.opponent.hp)
    for (let i = 1; i < hps.length; i++) expect(hps[i]).toBeGreaterThanOrEqual(hps[i - 1])
    expect(hps[5]).toBeGreaterThan(hps[4])
  })

  it('cpu level is easy for the first two stages and normal after', () => {
    expect(STAGES.map((s) => s.cpu)).toEqual(['easy', 'easy', 'normal', 'normal', 'normal', 'normal'])
  })

  it('each stage names an overlay and tags whether its gimmick is real code or cosmetic', () => {
    for (const s of STAGES) {
      expect(s.overlay.length).toBeGreaterThan(0)
      expect(typeof s.gimmickReal).toBe('boolean')
    }
    expect(STAGES.filter((s) => s.gimmickReal).map((s) => s.slug)).toEqual(['loket-antrean', 'ruang-kurs', 'gerbang-kubah'])
  })

  it('pre-fight dialogue fits the box: two lines, three for the boss, opponent opens', () => {
    for (const s of STAGES) {
      expect(s.pre.length).toBeGreaterThanOrEqual(2)
      expect(s.pre.length).toBeLessThanOrEqual(s.boss ? 3 : 2)
      expect(s.pre[0].speaker).toBe('opponent')
    }
  })

  it('every text is bilingual and short enough for the dialog box', () => {
    for (const t of allText()) {
      expect(t.trim().length).toBeGreaterThan(0)
      expect(t.length).toBeLessThanOrEqual(110)
      expect(t).not.toContain('\n')
    }
  })

  it('has the eight ticker lines', () => {
    expect(TICKER_LINES).toHaveLength(8)
  })

  it('no em-dash anywhere in the arcade copy', () => {
    for (const t of allText()) expect(t).not.toContain(EM_DASH)
  })

  it('keeps the satire safeguards: no real names, no guilt words, no hashtag symbol', () => {
    const blob = allText().join(' ').toLowerCase()
    for (const bad of ['prabowo', 'gibran', 'jokowi', 'sri mulyani', 'purbaya', 'dpr', 'polri', 'tni', 'kpk', 'mbg', 'ijazah', 'korup', 'maling', 'curi', 'stole', 'corrupt', 'guilty', '#'])
      expect(blob).not.toContain(bad)
  })

  it('the satire disclaimer says fictional in both languages', () => {
    expect(DISCLAIMER.en.toLowerCase()).toContain('fiction')
    expect(DISCLAIMER.id.toLowerCase()).toContain('fiksi')
  })

  it('both endings keep the bible captions', () => {
    expect(WIN_ENDING.caption.en).toBe('Congratulations. You have restored normal.')
    expect(LOSE_ENDING.caption.en).toBe('CONTINUE? The country is still on hold.')
    expect(LOSE_ENDING.lines.map((l) => l.id).join(' ')).toContain('Kabur aja dulu?')
  })
})

describe('arcade run', () => {
  it('starts at stage 1 in the pre-fight screen with full continues and no envelopes', () => {
    const r = startRun('si-penyadap')
    expect(r.hero).toBe('si-penyadap')
    expect(r.stage).toBe(0)
    expect(r.status).toBe('pre')
    expect(r.continuesLeft).toBe(CONTINUES)
    expect(r.envelopes).toBe(0)
    expect(currentStage(r).slug).toBe('hutan-kabut')
  })

  it('beginFight moves pre to fight and nothing else', () => {
    const r = startRun('sang-ajudan')
    expect(beginFight(r)).toEqual({ ...r, status: 'fight' })
    expect(beginFight(beginFight(r))).toEqual(beginFight(r))
  })

  it('winning advances a stage, resets attempt, and collects one envelope', () => {
    let r = beginFight(startRun('si-penyadap'))
    r = finishMatch(r, 'p1')
    expect(r.stage).toBe(1)
    expect(r.status).toBe('pre')
    expect(r.envelopes).toBe(1)
    expect(r.attempt).toBe(0)
  })

  it('winning the sixth stage ends the run as a win with six envelopes', () => {
    let r = startRun('si-penyadap')
    for (let i = 0; i < 6; i++) r = finishMatch(beginFight(r), 'p1')
    expect(r.status).toBe('won')
    expect(r.envelopes).toBe(6)
    expect(runEnding(r)).toBe(WIN_ENDING)
  })

  it('losing offers a continue; using it replays the same stage with a new attempt', () => {
    let r = beginFight(startRun('si-penyadap'))
    r = finishMatch(r, 'p2')
    expect(r.status).toBe('continue')
    expect(r.stage).toBe(0)
    expect(r.envelopes).toBe(0)
    r = takeContinue(r)
    expect(r.status).toBe('pre')
    expect(r.stage).toBe(0)
    expect(r.continuesLeft).toBe(CONTINUES - 1)
    expect(r.attempt).toBe(1)
  })

  it('a draw counts as a loss', () => {
    const r = finishMatch(beginFight(startRun('sang-ajudan')), 'draw')
    expect(r.status).toBe('continue')
  })

  it('out of continues, a loss ends the run as lost', () => {
    let r = startRun('si-penyadap')
    for (let i = 0; i < CONTINUES; i++) r = takeContinue(finishMatch(beginFight(r), 'p2'))
    expect(r.continuesLeft).toBe(0)
    r = finishMatch(beginFight(r), 'p2')
    expect(r.status).toBe('lost')
    expect(runEnding(r)).toBe(LOSE_ENDING)
  })

  it('giveUp on the continue screen ends the run as lost', () => {
    const r = giveUp(finishMatch(beginFight(startRun('si-penyadap')), 'p2'))
    expect(r.status).toBe('lost')
  })

  it('actions in the wrong status change nothing', () => {
    const fresh = startRun('si-penyadap')
    expect(finishMatch(fresh, 'p1')).toBe(fresh)
    expect(takeContinue(fresh)).toBe(fresh)
    expect(giveUp(fresh)).toBe(fresh)
    const done = finishMatch(finishMatch(beginFight(fresh), 'p2'), 'p1')
    expect(done.status).toBe('continue')
    expect(beginFight(done)).toBe(done)
  })

  it('runEnding is null while the run is live', () => {
    expect(runEnding(startRun('si-penyadap'))).toBeNull()
  })

  it('the run never mutates its input', () => {
    const r = startRun('si-penyadap')
    const copy = JSON.stringify(r)
    finishMatch(beginFight(r), 'p1')
    expect(JSON.stringify(r)).toBe(copy)
  })

  it('match seed is deterministic and differs by stage and attempt', () => {
    const a = startRun('si-penyadap')
    expect(matchSeed(a)).toBe(matchSeed(startRun('si-penyadap')))
    const b = finishMatch(beginFight(a), 'p1')
    expect(matchSeed(b)).not.toBe(matchSeed(a))
    const c = takeContinue(finishMatch(beginFight(a), 'p2'))
    expect(matchSeed(c)).not.toBe(matchSeed(a))
    expect(Number.isInteger(matchSeed(a))).toBe(true)
  })

  it('arcadeMatch pits the chosen hero on the left against the stage opponent', () => {
    const r = startRun('sang-ajudan')
    const m = arcadeMatch(r)
    expect(m.defs[0]).toBe(FIGHTERS['sang-ajudan'])
    expect(m.defs[1]).toBe(STAGES[0].opponent)
    expect(m.seed).toBe(matchSeed(r))
    expect(m.fighters[1].hp).toBe(STAGES[0].opponent.hp)
  })

  it('ticker cycles through all eight lines by stage and attempt', () => {
    const seen = new Set<string>()
    let r = startRun('si-penyadap')
    for (let i = 0; i < 6; i++) {
      seen.add(tickerFor(r).en)
      r = finishMatch(beginFight(r), 'p1')
    }
    expect(seen.size).toBeGreaterThanOrEqual(5)
    for (const t of seen) expect(TICKER_LINES.map((l) => l.en)).toContain(t)
  })
})

describe('arcade opponents play', () => {
  // A cpu-driven hero against each stage opponent must finish by the round timer, never hang or throw.
  for (const [i, s] of STAGES.entries()) {
    it(`stage ${i + 1} (${s.opponent.label}) runs to match end under cpu control`, () => {
      let m = arcadeMatch(startRun('si-penyadap'))
      m = { ...m, defs: [FIGHTERS['si-penyadap'], STAGES[i].opponent], fighters: [m.fighters[0], { ...m.fighters[1], hp: STAGES[i].opponent.hp }] }
      let frames = 0
      let sawAttack = false
      while (m.phase !== 'matchEnd' && frames < 3 * (99 * 60 + 400)) {
        const a = cpuInput(m, 0, 'normal')
        m = { ...m, seed: a.seed }
        const b = cpuInput(m, 1, s.cpu)
        m = { ...m, seed: b.seed }
        m = stepMatch(m, [a.input, b.input])
        if (m.fighters[1].action === 'attack' || (b.input & (BTN.PUNCH | BTN.KICK | BTN.SPECIAL)) !== 0) sawAttack = true
        frames++
      }
      expect(m.phase).toBe('matchEnd')
      expect(sawAttack).toBe(true)
    })
  }
})

describe('stage 4 Stempel Ulang revive', () => {
  const hero = FIGHTERS['si-penyadap']
  const understudy = STAGES[3].opponent

  // hero punches an opponent that has `hp` left, standing in range; returns the state after the hit lands
  function punchFinisher(m: MatchState, hp: number): MatchState {
    let s: MatchState = { ...m, fighters: [m.fighters[0], { ...m.fighters[1], x: m.fighters[0].x + 30 * UNIT, hp }] }
    s = stepMatch(s, [BTN.PUNCH, 0])
    for (let i = 0; i < hero.moves.punch.startup + 2; i++) s = stepMatch(s, [0, 0])
    return s
  }

  it('only the understudy revives, once, at 1 hp', () => {
    expect(understudy.revive).toBe(1)
    for (const s of STAGES) if (s.slug !== 'loket-antrean') expect(s.opponent.revive).toBeUndefined()
    for (const id of FIGHTER_IDS) expect(FIGHTERS[id].revive).toBeUndefined()
  })

  it('the first KO is voided: back up at 1 hp, round still live, no win recorded', () => {
    const m = initMatch(7, [hero, understudy])
    const s = punchFinisher(m, 10)
    expect(s.phase).toBe('fight')
    expect(s.fighters[1].hp).toBe(1)
    expect(s.fighters[1].revived).toBe(true)
    expect(s.fighters[1].action).not.toBe('ko')
    expect(s.wins).toEqual([0, 0])
  })

  it('the second KO is final', () => {
    const m = initMatch(7, [hero, understudy])
    let s = punchFinisher(m, 10)
    for (let i = 0; i < 40; i++) s = stepMatch(s, [0, 0]) // let recovery end
    s = punchFinisher(s, 1)
    expect(s.phase).toBe('ko')
    expect(s.wins[0]).toBe(1)
  })

  it('a normal opponent never revives', () => {
    const m = initMatch(7, [hero, FIGHTERS['sang-ajudan']])
    const s = punchFinisher(m, 10)
    expect(s.phase).toBe('ko')
    expect(s.fighters[1].revived).toBe(false)
  })

  it('a new round gives the revive back', () => {
    const f = freshFighters([hero, understudy])
    expect(f[1].revived).toBe(false)
  })

  it('the revive flag is part of the state hash so online peers cannot drift on it', () => {
    const m = initMatch(7, [hero, understudy])
    const flipped = { ...m, fighters: [m.fighters[0], { ...m.fighters[1], revived: true }] as MatchState['fighters'] }
    expect(hashState(flipped)).not.toBe(hashState(m))
  })
})

describe('stage 5 phone reshuffle', () => {
  const hero = FIGHTERS['si-penyadap']
  const seconded = STAGES[4].opponent

  // a live match one step before the phone rings, opponent mid kick with hp 640
  function beforeRing(def = seconded, rings = 0): MatchState {
    const m = initMatch(3, [hero, def])
    return {
      ...m,
      reshuffles: rings,
      roundTimer: ROUND_FRAMES - (RING_FRAMES - 1),
      fighters: [m.fighters[0], { ...m.fighters[1], x: m.fighters[0].x + 150 * UNIT, hp: 640, action: 'attack', move: 'kick', actionFrame: 2 }],
    }
  }

  it('the phone rings every 20 seconds and only the seconded has one', () => {
    expect(RING_FRAMES).toBe(20 * 60)
    expect(seconded.reshuffle).toBe(RING_FRAMES)
    for (const s of STAGES) if (s.slug !== 'ruang-kurs') expect(s.opponent.reshuffle).toBeUndefined()
    for (const id of FIGHTER_IDS) expect(FIGHTERS[id].reshuffle).toBeUndefined()
  })

  it('first ring: he is handed to an identical replacement, mid-move cancelled, hp kept', () => {
    const s = stepMatch(beforeRing(), [0, 0])
    expect(s.reshuffles).toBe(1)
    expect(s.fighters[1].hp).toBe(640)
    expect(s.fighters[1].action).toBe('idle')
    expect(s.fighters[1].move).toBeNull()
  })

  it('second ring: the chairs rotate, the fighter is left alone', () => {
    const s = stepMatch(beforeRing(seconded, 1), [0, 0])
    expect(s.reshuffles).toBe(2)
    expect(s.fighters[1].action).toBe('attack')
  })

  it('no ring one frame early, and no double ring during hitstop', () => {
    const early = { ...beforeRing(), roundTimer: ROUND_FRAMES - (RING_FRAMES - 2) }
    expect(stepMatch(early, [0, 0]).reshuffles).toBe(0)
    const frozen = { ...beforeRing(), hitstop: 3 }
    expect(stepMatch(frozen, [0, 0]).reshuffles).toBe(0)
  })

  it('other opponents never ring', () => {
    expect(stepMatch(beforeRing(STAGES[2].opponent), [0, 0]).reshuffles).toBe(0)
  })

  it('a new round starts the phone over', () => {
    expect(initMatch(1, [hero, seconded]).reshuffles).toBe(0)
  })

  it('the ring count is part of the state hash', () => {
    const m = initMatch(1, [hero, seconded])
    expect(hashState({ ...m, reshuffles: 1 })).not.toBe(hashState(m))
  })
})

describe('stage 6 Panitia Tetap boss', () => {
  const hero = FIGHTERS['si-penyadap']
  const boss = STAGES[5].opponent

  function live(hp: number, elapsed: number, over: Partial<MatchState['fighters'][1]> = {}): MatchState {
    const m = initMatch(5, [hero, boss])
    return {
      ...m,
      roundTimer: ROUND_FRAMES - elapsed,
      fighters: [m.fighters[0], { ...m.fighters[1], x: m.fighters[0].x + 30 * UNIT, hp, ...over }],
    }
  }
  // hero throws a punch that lands; returns state after the hit
  function hit(s: MatchState): MatchState {
    let n = stepMatch(s, [BTN.PUNCH, 0])
    for (let i = 0; i < hero.moves.punch.startup + 2; i++) n = stepMatch(n, [0, 0])
    return n
  }

  it('phases follow hp thirds: statement, reshuffle, eternal review', () => {
    expect(boss.boss).toBe(true)
    expect(bossPhase(1400, 1400)).toBe(1)
    expect(bossPhase(934, 1400)).toBe(1)
    expect(bossPhase(933, 1400)).toBe(2)
    expect(bossPhase(467, 1400)).toBe(2)
    expect(bossPhase(466, 1400)).toBe(3)
    expect(bossPhase(1, 1400)).toBe(3)
  })

  it('the headline window is open for 3 seconds of every 10', () => {
    expect(REVIEW_CYCLE).toBe(600)
    expect(REVIEW_OPEN).toBe(180)
    expect(reviewOpen(0)).toBe(true)
    expect(reviewOpen(179)).toBe(true)
    expect(reviewOpen(180)).toBe(false)
    expect(reviewOpen(599)).toBe(false)
    expect(reviewOpen(600)).toBe(true)
  })

  it('phase 1: the statement special has armor (We Are Listening)', () => {
    expect(boss.moves.special.armor).toBe(true)
  })

  it('phase 3: a KO with the headline down is voided, back up at 1 hp, as many times as it takes', () => {
    let s = hit(live(10, 400)) // 400 % 600 = 400, window closed
    expect(s.phase).toBe('fight')
    expect(s.fighters[1].hp).toBe(1)
    s = hit(live(5, 1000)) // fresh hero again; 1000 % 600 = 400, closed again
    expect(s.phase).toBe('fight')
    expect(s.fighters[1].hp).toBe(1)
  })

  it('phase 3: a hit while the headline is up ends it for good', () => {
    const s = hit(live(10, 620)) // 620 % 600 = 20, window open
    expect(s.phase).toBe('ko')
    expect(s.wins[0]).toBe(1)
  })

  it('phase 2: the table reshuffles every 5 seconds, cancelling what it was doing; phase 1 and 3 do not', () => {
    const attacking = { action: 'attack' as const, move: 'kick' as const, actionFrame: 2 }
    const at = (hp: number) => stepMatch({ ...live(hp, 299, attacking), fighters: [live(hp, 299).fighters[0], { ...live(hp, 299, attacking).fighters[1], x: live(hp, 299).fighters[0].x + 150 * UNIT }] }, [0, 0])
    expect(at(700).reshuffles).toBe(1)
    expect(at(700).fighters[1].action).toBe('idle')
    expect(at(1300).reshuffles).toBe(0)
    expect(at(300).reshuffles).toBe(0)
  })

  it('phase 2: the chair in office alternates sides with each reshuffle, and only full-damage hits come from that side', () => {
    expect(chairSide(0)).toBe(-1)
    expect(chairSide(1)).toBe(1)
    expect(chairSide(2)).toBe(-1)
    expect(chairSide(3)).toBe(1)
    expect(OFF_SEAT_PCT).toBe(25)
    // boss at x = 100, chair on the left (reshuffles 0)
    expect(seatPct(2, 90, 100, 0)).toBe(100)
    expect(seatPct(2, 110, 100, 0)).toBe(OFF_SEAT_PCT)
    expect(seatPct(2, 110, 100, 1)).toBe(100)
    expect(seatPct(2, 90, 100, 1)).toBe(OFF_SEAT_PCT)
    expect(seatPct(2, 100, 100, 1)).toBe(100) // dead centre counts as in office
    for (const phase of [1, 3] as const) expect(seatPct(phase, 110, 100, 0)).toBe(100)
  })

  it('phase 2 sim: a hit from the wrong side of the boss does a quarter damage; from the chair side, full', () => {
    const dealt = (s: MatchState) => 700 - hit(s).fighters[1].hp
    const full = hero.moves.punch.damage
    const quarter = Math.floor((full * OFF_SEAT_PCT) / 100)
    // hero starts left of the boss
    expect(dealt({ ...live(700, 100), reshuffles: 0 })).toBe(full)
    expect(dealt({ ...live(700, 100), reshuffles: 1 })).toBe(quarter)
    // hero crosses over to the right of the boss
    const flipped = (reshuffles: number): MatchState => {
      const m = live(700, 100)
      return { ...m, reshuffles, fighters: [{ ...m.fighters[0], x: m.fighters[1].x + 30 * UNIT }, m.fighters[1]] }
    }
    expect(dealt(flipped(0))).toBe(quarter)
    expect(dealt(flipped(1))).toBe(full)
  })

  it('the boss plate names the phase; in phase 2 its arrows point at the side of the chair in office', () => {
    expect(bossPlate(1, false, 0)).toBe('PERNYATAAN')
    expect(bossPlate(2, false, 0)).toBe('<< ROMBAK')
    expect(bossPlate(2, false, 1)).toBe('ROMBAK >>')
    expect(bossPlate(3, false, 0)).toBe('TINJAU ABADI')
    expect(bossPlate(3, true, 0)).toBe('LIVE: HIT NOW')
    for (const t of [bossPlate(2, false, 0), bossPlate(2, false, 1)]) expect(t).not.toContain(EM_DASH)
  })

  it('the seat rule only applies in phase 2 and only to the boss', () => {
    const full = hero.moves.punch.damage
    expect(1300 - hit({ ...live(1300, 100), reshuffles: 1 }).fighters[1].hp).toBe(full)
    expect(300 - hit({ ...live(300, 100), reshuffles: 1 }).fighters[1].hp).toBe(full)
    const m = initMatch(5, [FIGHTERS['sang-ajudan'], hero])
    const near = { ...m, reshuffles: 1, fighters: [{ ...m.fighters[0], x: m.fighters[1].x - 30 * UNIT }, m.fighters[1]] as MatchState['fighters'] }
    let n = stepMatch({ ...near, phase: 'fight', introFrames: 0 }, [BTN.PUNCH, 0])
    for (let i = 0; i < 8; i++) n = stepMatch(n, [0, 0])
    expect(n.fighters[1].hp).toBeLessThan(hero.hp)
  })

  it('only the boss is a boss', () => {
    for (const s of STAGES) if (s.slug !== 'gerbang-kubah') expect(s.opponent.boss).toBeUndefined()
  })
})
