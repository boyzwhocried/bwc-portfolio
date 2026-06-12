// Minor-pentatonic mapping for the Tone Garden. Any subset of the grid you light
// up lands on this scale, so there is no "wrong" note -> it always sounds musical.
export const PENTATONIC_SEMITONES = [0, 3, 5, 7, 10] as const

/**
 * Map a row (counted from the bottom of the grid) to a frequency in Hz.
 * Each step climbs one pentatonic degree; wrapping past the 5 degrees jumps
 * a full octave. `base` is the frequency of the bottom row.
 */
export function rowToFrequency(rowFromBottom: number, base = 220): number {
  const n = PENTATONIC_SEMITONES.length
  const octave = Math.floor(rowFromBottom / n)
  const degree = ((rowFromBottom % n) + n) % n
  const semitones = octave * 12 + PENTATONIC_SEMITONES[degree]
  return base * Math.pow(2, semitones / 12)
}
