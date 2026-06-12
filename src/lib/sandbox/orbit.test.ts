import { describe, it, expect } from 'vitest'
import { step, makeBody, radiusForMass, type Body } from './orbit'

const sum = (bodies: Body[], f: (b: Body) => number) =>
  bodies.reduce((a, b) => a + (b.alive ? f(b) : 0), 0)

describe('gravity-well n-body sim', () => {
  it('pulls two separated bodies toward each other', () => {
    const a = makeBody({ x: 0, y: 0, mass: 100 })
    const b = makeBody({ x: 50, y: 0, mass: 100 })
    const next = step([a, b], 1)
    // a accelerates +x toward b; b accelerates -x toward a
    expect(next[0].vx).toBeGreaterThan(0)
    expect(next[1].vx).toBeLessThan(0)
  })

  it('conserves total linear momentum under pure gravity', () => {
    const bodies = [
      makeBody({ x: 0, y: 0, mass: 80, vx: 1, vy: 0 }),
      makeBody({ x: 60, y: 10, mass: 120, vx: -0.5, vy: 0.2 }),
      makeBody({ x: 20, y: 70, mass: 50, vx: 0, vy: -1 }),
    ]
    const p0x = sum(bodies, (b) => b.mass * b.vx)
    const p0y = sum(bodies, (b) => b.mass * b.vy)
    const next = step(bodies, 0.5)
    expect(sum(next, (b) => b.mass * b.vx)).toBeCloseTo(p0x, 4)
    expect(sum(next, (b) => b.mass * b.vy)).toBeCloseTo(p0y, 4)
  })

  it('merges overlapping bodies, conserving mass and momentum', () => {
    const a = makeBody({ x: 0, y: 0, mass: 100, vx: 2, vy: 0, radius: 10 })
    const b = makeBody({ x: 5, y: 0, mass: 100, vx: -1, vy: 0, radius: 10 })
    const p0 = a.mass * a.vx + b.mass * b.vx
    const next = step([a, b], 0.0001) // tiny dt so motion is negligible, merge dominates
    const live = next.filter((x) => x.alive)
    expect(live.length).toBe(1)
    expect(live[0].mass).toBeCloseTo(200, 5)
    expect(live[0].mass * live[0].vx).toBeCloseTo(p0, 3)
  })

  it('grows radius monotonically with mass', () => {
    expect(radiusForMass(400)).toBeGreaterThan(radiusForMass(100))
  })

  it('does not mutate the input bodies', () => {
    const a = makeBody({ x: 0, y: 0, mass: 100 })
    const snapshot = { ...a }
    step([a, makeBody({ x: 99, y: 99, mass: 100 })], 1)
    expect(a).toEqual(snapshot)
  })
})
