import { describe, it, expect } from 'vitest'
import { stageFx, FIRE_BASES, type StagePixel } from './stagefx'
import { FLOOR_Y } from './art/stage-forest'

const W = 320
const H = 180
const ALLOWED = new Set(['#1a1a1a', '#ece7de', '#e84c28'])
const key = (p: StagePixel) => p.x + ',' + p.y + ',' + p.color

describe('animated stage layer', () => {
  it('is deterministic: the same frame gives the same pixels', () => {
    expect(stageFx(123)).toEqual(stageFx(123))
  })

  it('actually moves: different frames give different pixels', () => {
    const a = stageFx(10).map(key).join('|')
    const b = stageFx(20).map(key).join('|')
    expect(a).not.toBe(b)
  })

  it('loops: frame and frame plus the period are identical', () => {
    const period = 240
    expect(stageFx(7)).toEqual(stageFx(7 + period))
  })

  it('stays inside the screen, above the ash ground, on whole pixels', () => {
    for (const f of [0, 1, 17, 59, 120, 239]) {
      for (const p of stageFx(f)) {
        expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true)
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.x).toBeLessThan(W)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeLessThan(Math.min(H, FLOOR_Y))
      }
    }
  })

  it('uses only the three palette colors', () => {
    for (const f of [0, 31, 90, 200]) for (const p of stageFx(f)) expect(ALLOWED.has(p.color)).toBe(true)
  })

  it('has flames above every fire base', () => {
    const px = stageFx(40)
    for (const bx of FIRE_BASES) expect(px.some((p) => Math.abs(p.x - bx) <= 12 && p.color === '#e84c28')).toBe(true)
  })

  it('stays cheap: a few hundred pixels per frame at most', () => {
    for (const f of [0, 50, 100]) expect(stageFx(f).length).toBeLessThan(700)
  })
})
