import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ANIM_NAMES, pixelsOf, type FighterArt, type Sprite } from './sprite'
import { ART as PENYADAP } from './si-penyadap'
import { ART as AJUDAN } from './sang-ajudan'
import { STAGE_FOREST, FLOOR_Y } from './stage-forest'
import { PORTRAITS } from './portraits'
import { PORTRAIT_PX } from '../hud'
import { FIGHTER_IDS } from '../roster'

const FIGHTERS: Record<string, FighterArt> = { 'si-penyadap': PENYADAP, 'sang-ajudan': AJUDAN }
const MIN_FRAMES: Record<string, number> = { idle: 2, walk: 4, punch: 3, kick: 3, special: 3, hit: 2, block: 1, jump: 1, ko: 2 }

function allSprites(a: FighterArt): Sprite[] {
  return [a.head, a.smear, ...ANIM_NAMES.flatMap((n) => a.frames[n])]
}

describe('fighter art data', () => {
  it('uses only the three palette characters plus transparent', () => {
    for (const art of Object.values(FIGHTERS)) {
      for (const s of [...allSprites(art), STAGE_FOREST]) {
        expect(s.rows.join('')).toMatch(/^[.ipv]*$/)
      }
    }
  })

  it('rows match declared size and pixelsOf yields only 0 to 3', () => {
    for (const art of Object.values(FIGHTERS)) {
      for (const s of [...allSprites(art), STAGE_FOREST]) {
        expect(s.rows.length).toBe(s.h)
        for (const r of s.rows) expect(r.length).toBe(s.w)
        const px = pixelsOf(s)
        expect(px.length).toBe(s.w * s.h)
        expect(Math.max(...px)).toBeLessThanOrEqual(3)
      }
    }
  })

  it('head is 24x24 and body frames are 80x80', () => {
    for (const art of Object.values(FIGHTERS)) {
      expect([art.head.w, art.head.h]).toEqual([24, 24])
      for (const n of ANIM_NAMES) for (const f of art.frames[n]) expect([f.w, f.h]).toEqual([80, 80])
    }
  })

  it('every required animation has its frames', () => {
    for (const art of Object.values(FIGHTERS)) {
      for (const n of ANIM_NAMES) expect(art.frames[n].length).toBeGreaterThanOrEqual(MIN_FRAMES[n])
    }
  })

  it('the forest stage is 320x180 with the floor at 156', () => {
    expect([STAGE_FOREST.w, STAGE_FOREST.h]).toEqual([320, 180])
    expect(FLOOR_Y).toBe(156)
  })

  it('only archetype slug files live in art/', () => {
    const dir = dirname(fileURLToPath(import.meta.url))
    expect(readdirSync(dir).sort()).toEqual(['art.test.ts', 'portraits.ts', 'sang-ajudan.ts', 'si-penyadap.ts', 'sprite.ts', 'stage-forest.ts'])
  })

  it('every fighter has a fully opaque, palette-only portrait of the size the hud expects', () => {
    for (const id of FIGHTER_IDS) {
      const p = PORTRAITS[id]
      expect(p, id).toBeDefined()
      expect([p.w, p.h]).toEqual([PORTRAIT_PX, PORTRAIT_PX])
      expect(p.rows.length).toBe(p.h)
      for (const r of p.rows) expect(r).toMatch(new RegExp('^[ipv]{' + p.w + '}$'))
    }
  })
})
