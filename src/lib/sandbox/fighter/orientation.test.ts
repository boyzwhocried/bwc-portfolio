import { describe, it, expect } from 'vitest'
import { needsRotate, tryLandscape, ROTATE_LINE } from './orientation'

describe('needsRotate', () => {
  it('asks a touch device held upright to rotate', () => {
    expect(needsRotate(true, 390, 844)).toBe(true)
  })
  it('lets a touch device in landscape play', () => {
    expect(needsRotate(true, 844, 390)).toBe(false)
  })
  it('never nags a mouse and keyboard desktop, even in a tall window', () => {
    expect(needsRotate(false, 500, 900)).toBe(false)
  })
  it('treats a square viewport as landscape enough', () => {
    expect(needsRotate(true, 600, 600)).toBe(false)
  })
})

describe('tryLandscape', () => {
  const calls: string[] = []
  const el = () => ({
    requestFullscreen: async () => {
      calls.push('fullscreen')
    },
  })
  const scr = (lock?: (o: string) => Promise<void>) => ({ orientation: lock ? { lock } : undefined })

  it('goes fullscreen first, then locks to landscape', async () => {
    calls.length = 0
    const ok = await tryLandscape(el(), scr(async (o) => void calls.push('lock:' + o)))
    expect(ok).toBe(true)
    expect(calls).toEqual(['fullscreen', 'lock:landscape'])
  })
  it('reports false when the browser has no orientation lock (iPhone Safari)', async () => {
    expect(await tryLandscape(el(), scr())).toBe(false)
  })
  it('reports false instead of throwing when fullscreen is refused', async () => {
    const refused = {
      requestFullscreen: async () => {
        throw new Error('denied')
      },
    }
    expect(await tryLandscape(refused, scr(async () => undefined))).toBe(false)
  })
  it('reports false instead of throwing when the lock is refused', async () => {
    expect(
      await tryLandscape(el(), scr(async () => {
        throw new Error('NotSupportedError')
      })),
    ).toBe(false)
  })
  it('reports false when the element cannot go fullscreen at all', async () => {
    expect(await tryLandscape({}, scr(async () => undefined))).toBe(false)
  })
})

describe('ROTATE_LINE', () => {
  it('is Indonesian with an English subtitle and no em-dash', () => {
    expect(ROTATE_LINE.id.length).toBeGreaterThan(0)
    expect(ROTATE_LINE.en.length).toBeGreaterThan(0)
    expect(ROTATE_LINE.id + ROTATE_LINE.en).not.toContain(String.fromCharCode(0x2014))
  })
})
