import { describe, it, expect } from 'vitest'
import { SCENE_COUNT, sceneRects, sceneFx } from './scenes'
import { stageFx, PERIOD } from './stagefx'
import { FLOOR_Y } from './art/stage-forest'

const W = 320
const H = 180
const COLORS = new Set(['#1a1a1a', '#ece7de', '#e84c28'])
const key = (p: { x: number; y: number; color: string }) => p.x + ',' + p.y + ',' + p.color
const sig = (i: number) => sceneRects(i).map((r) => [r.x, r.y, r.w, r.h, r.c].join(',')).join('|')

describe('arcade stage scenes', () => {
  it('has one scene per arcade stage', () => {
    expect(SCENE_COUNT).toBe(6)
  })

  it('stage 1 keeps the baked forest (no extra rectangles)', () => {
    expect(sceneRects(0)).toEqual([])
  })

  it('stages 2 to 6 each draw a backdrop of their own', () => {
    const seen = new Set<string>()
    for (let i = 1; i < SCENE_COUNT; i++) {
      expect(sceneRects(i).length).toBeGreaterThan(10)
      seen.add(sig(i))
    }
    expect(seen.size).toBe(SCENE_COUNT - 1)
  })

  it('rects are whole pixels inside the screen with only the three palette colors', () => {
    for (let i = 1; i < SCENE_COUNT; i++) {
      for (const r of sceneRects(i)) {
        expect(Number.isInteger(r.x + r.y + r.w + r.h)).toBe(true)
        expect(r.w).toBeGreaterThan(0)
        expect(r.h).toBeGreaterThan(0)
        expect(r.x).toBeGreaterThanOrEqual(0)
        expect(r.y).toBeGreaterThanOrEqual(0)
        expect(r.x + r.w).toBeLessThanOrEqual(W)
        expect(r.y + r.h).toBeLessThanOrEqual(H)
        expect('ipv').toContain(r.c)
      }
    }
  })

  it('every drawn scene has a floor line where the fighters stand', () => {
    for (let i = 1; i < SCENE_COUNT; i++) {
      expect(sceneRects(i).some((r) => r.y === FLOOR_Y && r.w === W && r.c === 'p')).toBe(true)
    }
  })

  it('scene fx are deterministic, loop on the period and move', () => {
    for (let i = 0; i < SCENE_COUNT; i++) {
      expect(sceneFx(i, 33)).toEqual(sceneFx(i, 33))
      expect(sceneFx(i, 7)).toEqual(sceneFx(i, 7 + PERIOD))
      expect(sceneFx(i, 10).map(key).join('|')).not.toBe(sceneFx(i, 70).map(key).join('|'))
    }
  })

  it('scene fx stay on whole pixels, on screen, above the floor, in palette colors', () => {
    for (let i = 0; i < SCENE_COUNT; i++) {
      for (const f of [0, 13, 59, 120, 200, 239]) {
        for (const p of sceneFx(i, f)) {
          expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true)
          expect(p.x).toBeGreaterThanOrEqual(0)
          expect(p.x).toBeLessThan(W)
          expect(p.y).toBeGreaterThanOrEqual(0)
          expect(p.y).toBeLessThan(FLOOR_Y)
          expect(COLORS.has(p.color)).toBe(true)
        }
      }
    }
  })

  it('the forest keeps its fire and embers and adds haze on top', () => {
    const base = new Set(stageFx(50).map(key))
    const withHaze = sceneFx(0, 50).map(key)
    expect(withHaze.length).toBeGreaterThan(base.size)
    for (const k of base) expect(withHaze).toContain(k)
  })

  it('other stages do not carry the forest fire', () => {
    const fire = new Set(stageFx(50).filter((p) => p.color === '#e84c28').map(key))
    for (let i = 1; i < SCENE_COUNT; i++) {
      const own = sceneFx(i, 50).map(key)
      const shared = own.filter((k) => fire.has(k))
      expect(shared.length).toBeLessThan(fire.size / 2)
    }
  })

  it('has no em-dash in its source strings', () => {
    expect(sig(1) + sig(2)).not.toContain(String.fromCharCode(0x2014))
  })
})
