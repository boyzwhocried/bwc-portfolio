import { describe, it, expect } from 'vitest'
import { rowToFrequency, PENTATONIC_SEMITONES } from './scale'

describe('pentatonic scale mapping', () => {
  it('maps the bottom degree to the base frequency', () => {
    expect(rowToFrequency(0, 220)).toBeCloseTo(220, 5)
  })

  it('wraps one full scale up to the next octave (x2)', () => {
    // 5 minor-pentatonic degrees per octave -> degree index 5 is base octave + 12 semis
    expect(rowToFrequency(PENTATONIC_SEMITONES.length, 220)).toBeCloseTo(440, 5)
  })

  it('is strictly monotonic increasing in row-from-bottom', () => {
    let prev = -Infinity
    for (let r = 0; r < 15; r++) {
      const f = rowToFrequency(r, 220)
      expect(f).toBeGreaterThan(prev)
      prev = f
    }
  })

  it('uses the minor-pentatonic interval set', () => {
    expect(PENTATONIC_SEMITONES).toEqual([0, 3, 5, 7, 10])
  })
})
