import { describe, it, expect } from 'vitest'
import { fitScale } from './scale'

describe('fitScale', () => {
  it('fills a phone landscape box instead of dropping to 1x', () => {
    // about 844 x 300 usable: height limits it, 300 / 180
    const s = fitScale(844, 300)
    expect(s).toBeGreaterThan(1.6)
    expect(s * 180).toBeLessThanOrEqual(300)
  })

  it('never overflows the box in either direction', () => {
    for (const [w, h] of [[844, 390], [667, 375], [1920, 1000], [500, 900], [320, 180], [1280, 720]]) {
      const s = fitScale(w, h)
      expect(s * 320).toBeLessThanOrEqual(w + 1e-9)
      expect(s * 180).toBeLessThanOrEqual(h + 1e-9)
    }
  })

  it('stays crisp: lands on a whole number when the box is just over one', () => {
    expect(fitScale(1280, 720)).toBe(4)
    expect(fitScale(1290, 730)).toBe(4) // 4.03 snaps down to 4
    expect(fitScale(640, 360)).toBe(2)
    expect(fitScale(700, 370)).toBe(2) // 2.05 snaps to 2
  })

  it('uses a fraction when whole steps would waste more than about 15%', () => {
    expect(fitScale(1100, 620)).toBeCloseTo(3.44, 1) // not 3
  })

  it('works on tiny boxes without hitting zero', () => {
    expect(fitScale(100, 50)).toBeGreaterThanOrEqual(0.25)
    expect(fitScale(0, 0)).toBe(1)
  })
})
