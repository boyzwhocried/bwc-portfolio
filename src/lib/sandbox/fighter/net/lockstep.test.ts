import { describe, it, expect } from 'vitest'
import { DELAY, REDUNDANCY, createLockstep, pushLocal, receiveRemote, resendPacket, tryAdvance, type Packet } from './lockstep'
import { initMatch, step, hashState } from '../sim'
import { FIGHTERS } from '../roster'
import { BTN, type Inputs } from '../types'

describe('lockstep basics', () => {
  it('lets the first DELAY frames run with no network at all', () => {
    const ls = createLockstep(0)
    for (let f = 0; f < DELAY; f++) expect(tryAdvance(ls)).toEqual([0, 0])
  })

  it('stalls at frame DELAY until the opponent input arrives', () => {
    const ls = createLockstep(0)
    for (let f = 0; f < DELAY; f++) tryAdvance(ls)
    pushLocal(ls, BTN.PUNCH)
    expect(tryAdvance(ls)).toBeNull()
  })

  it('schedules local input DELAY frames ahead and numbers packets in order', () => {
    const ls = createLockstep(0)
    const a = pushLocal(ls, 1)
    const b = pushLocal(ls, 2)
    expect(a.frame).toBe(DELAY)
    expect(b.frame).toBe(DELAY + 1)
    expect(b.bits).toBe(2)
  })

  it('returns inputs as [p1, p2] whichever side we are', () => {
    for (const side of [0, 1] as const) {
      const ls = createLockstep(side)
      for (let f = 0; f < DELAY; f++) tryAdvance(ls)
      pushLocal(ls, BTN.LEFT)
      receiveRemote(ls, { frame: DELAY, bits: BTN.KICK, history: [] })
      const got = tryAdvance(ls)
      expect(got).toEqual(side === 0 ? [BTN.LEFT, BTN.KICK] : [BTN.KICK, BTN.LEFT])
    }
  })

  it('fills a dropped packet from the redundant history of a later one', () => {
    const ls = createLockstep(0)
    for (let f = 0; f < DELAY; f++) tryAdvance(ls)
    pushLocal(ls, 0)
    pushLocal(ls, 0)
    // frame DELAY was lost; the next packet carries it in its history
    receiveRemote(ls, { frame: DELAY + 1, bits: 8, history: [{ frame: DELAY, bits: 4 }] })
    expect(tryAdvance(ls)).toEqual([0, 4])
    expect(tryAdvance(ls)).toEqual([0, 8])
  })

  it('ignores stale, duplicate and absurdly far-future frames', () => {
    const ls = createLockstep(0)
    receiveRemote(ls, { frame: 0, bits: 255, history: [] }) // already prefilled
    expect(tryAdvance(ls)).toEqual([0, 0])
    receiveRemote(ls, { frame: 10_000_000, bits: 1, history: [] })
    for (let f = 0; f < DELAY; f++) tryAdvance(ls)
    expect(tryAdvance(ls)).toBeNull()
  })

  it('masks remote bits to the 8 valid buttons', () => {
    const ls = createLockstep(0)
    for (let f = 0; f < DELAY; f++) tryAdvance(ls)
    pushLocal(ls, 0)
    receiveRemote(ls, { frame: DELAY, bits: 0xffff, history: [] })
    expect(tryAdvance(ls)).toEqual([0, 255])
  })

  it('exports sane constants', () => {
    expect(DELAY).toBeGreaterThanOrEqual(2)
    expect(REDUNDANCY).toBeGreaterThanOrEqual(4)
  })
})

describe('two instances stay in sync', () => {
  // scripted, differing button streams for each player
  const script = (who: 0 | 1, f: number): number => {
    const t = (f + who * 7) % 120
    if (t < 30) return BTN.RIGHT | (t === 10 ? BTN.PUNCH : 0)
    if (t < 50) return t % 9 === 0 ? BTN.KICK : 0
    if (t < 60) return BTN.UP | BTN.RIGHT
    if (t < 80) return BTN.DOWN | (t === 70 ? BTN.PUNCH : 0)
    if (t < 100) return BTN.SPECIAL * (t === 90 ? 1 : 0)
    return BTN.BLOCK
  }

  // deterministic pseudo-random channel: drops, delays, reorders
  function channel(seed: number) {
    let r = seed >>> 0
    const rnd = () => ((r = (Math.imul(r, 1664525) + 1013904223) >>> 0) / 2 ** 32)
    const q: { due: number; p: Packet; to: 0 | 1 }[] = []
    return {
      send(now: number, to: 0 | 1, p: Packet) {
        if (rnd() < 0.2) return // lost
        q.push({ due: now + Math.floor(rnd() * 5), p, to })
      },
      take(now: number, to: 0 | 1): Packet[] {
        const out: Packet[] = []
        for (let i = q.length - 1; i >= 0; i--) {
          if (q[i].to === to && q[i].due <= now) out.push(...q.splice(i, 1).map((x) => x.p))
        }
        return out
      },
    }
  }

  it('end on the same hash after 900 frames over a lossy, reordering channel', () => {
    const defs: [typeof FIGHTERS['si-penyadap'], typeof FIGHTERS['sang-ajudan']] = [FIGHTERS['si-penyadap'], FIGHTERS['sang-ajudan']]
    const sims = [initMatch(1234, defs, 0), initMatch(1234, defs, 0)]
    const ls = [createLockstep(0), createLockstep(1)]
    const ch = channel(99)
    const localFrame = [0, 0]
    let now = 0
    let guard = 0
    while ((sims[0].frame < 900 || sims[1].frame < 900) && guard++ < 20000) {
      now++
      for (const who of [0, 1] as const) {
        if (sims[who].frame >= 900) continue
        for (const p of ch.take(now, who)) receiveRemote(ls[who], p)
        // one local sample per tick while we are not too far ahead of the remote
        if (localFrame[who] <= sims[who].frame) {
          const pkt = pushLocal(ls[who], script(who, localFrame[who]))
          localFrame[who]++
          ch.send(now, (1 - who) as 0 | 1, pkt)
        }
        const inputs = tryAdvance(ls[who])
        if (inputs) sims[who] = step(sims[who], inputs as Inputs)
        else {
          // stalled: keep re-sending the newest packet so a lost one can never deadlock us
          const again = resendPacket(ls[who])
          if (again) ch.send(now, (1 - who) as 0 | 1, again)
        }
      }
    }
    expect(sims[0].frame).toBe(900)
    expect(sims[1].frame).toBe(900)
    expect(hashState(sims[0])).toBe(hashState(sims[1]))
  })
})
