import { describe, it, expect } from 'vitest'
import { step, makeBody, radiusForMass, supernova, spawnRing, G, SUPERNOVA_MASS, type Body } from './orbit'

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

  describe('supernova', () => {
    it('shatters a star into an outward-flying debris ring', () => {
      const star = makeBody({ x: 100, y: 100, mass: 5000, vx: 1, vy: 0 })
      const debris = supernova(star, 12)
      expect(debris).toHaveLength(12)
      for (const d of debris) {
        // each fragment sits off-centre and is moving
        expect(Math.hypot(d.x - star.x, d.y - star.y)).toBeGreaterThan(0)
        expect(Math.hypot(d.vx, d.vy)).toBeGreaterThan(0)
      }
    })

    it('does not create mass out of nothing', () => {
      const star = makeBody({ x: 0, y: 0, mass: 4000 })
      const total = supernova(star, 10).reduce((a, b) => a + b.mass, 0)
      expect(total).toBeGreaterThan(0)
      expect(total).toBeLessThanOrEqual(star.mass)
    })

    it('exposes a sane detonation threshold', () => {
      expect(SUPERNOVA_MASS).toBeGreaterThan(0)
    })
  })

  describe('spawnRing', () => {
    it('places bodies on a circle at circular-orbit speed, perpendicular to the radius', () => {
      const ring = spawnRing(100, 100, 6, 120, 4000)
      expect(ring).toHaveLength(6)
      const vCirc = Math.sqrt((G * 4000) / 120)
      for (const b of ring) {
        expect(Math.hypot(b.x - 100, b.y - 100)).toBeCloseTo(120, 4)
        expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(vCirc, 4)
        // velocity perpendicular to the radius => dot product ~ 0
        const dot = (b.x - 100) * b.vx + (b.y - 100) * b.vy
        expect(Math.abs(dot)).toBeLessThan(1e-6)
      }
    })
  })
})
