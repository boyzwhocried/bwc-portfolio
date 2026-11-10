import { describe, it, expect } from 'vitest'
import { nextRng } from './rng'

describe('nextRng', () => {
  it('same seed gives same sequence', () => {
    const run = (seed: number) => {
      const out: number[] = []
      let s = seed
      for (let i = 0; i < 50; i++) {
        const [v, n] = nextRng(s)
        out.push(v)
        s = n
      }
      return out
    }
    expect(run(12345)).toEqual(run(12345))
    expect(run(12345)).not.toEqual(run(54321))
  })

  it('a zero seed still produces a non-zero value', () => {
    const [v] = nextRng(0)
    expect(v).not.toBe(0)
  })
})
