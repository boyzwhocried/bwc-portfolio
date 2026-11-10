import { describe, it, expect } from 'vitest'
import { hudRects, TIMER_RECT, type Rect } from './hud'

const W = 320
const H = 180
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

describe('hud layout', () => {
  const all: [string, Rect][] = [
    ['timer', TIMER_RECT],
    ...([0, 1] as const).flatMap((s) => {
      const r = hudRects(s)
      return [[`bar${s}`, r.bar], [`name${s}`, r.name], [`pips${s}`, r.pips]] as [string, Rect][]
    }),
  ]

  it('no two hud boxes overlap', () => {
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) expect({ pair: [all[i][0], all[j][0]], hit: overlap(all[i][1], all[j][1]) }).toEqual({ pair: [all[i][0], all[j][0]], hit: false })
  })

  it('every box sits inside the screen', () => {
    for (const [, r] of all) {
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.y).toBeGreaterThanOrEqual(0)
      expect(r.x + r.w).toBeLessThanOrEqual(W)
      expect(r.y + r.h).toBeLessThanOrEqual(H)
    }
  })

  it('the two sides mirror each other', () => {
    const a = hudRects(0)
    const b = hudRects(1)
    expect(b.bar.x + b.bar.w).toBe(W - a.bar.x)
    expect(b.bar.w).toBe(a.bar.w)
  })

  it('the pips box holds two win squares', () => {
    expect(hudRects(0).pips.w).toBeGreaterThanOrEqual(2 * 7 + 4 + 2 * 6)
  })
})
