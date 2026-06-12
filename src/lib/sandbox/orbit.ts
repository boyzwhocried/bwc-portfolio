// Gravity-well n-body core. Pure: `step` returns a fresh body array. Uses
// semi-implicit Euler with softened gravity (no singularities) and perfectly
// inelastic merges that conserve mass + linear momentum.

export type Body = {
  x: number
  y: number
  vx: number
  vy: number
  mass: number
  radius: number
  alive: boolean
  color: string
  trail: { x: number; y: number }[]
}

export const G = 6 // tuned for screen-space feel, not physical units
const SOFTENING = 4 // px, keeps acceleration finite at close range

/** Mass at which an over-fed star detonates into a supernova. */
export const SUPERNOVA_MASS = 9000

export function radiusForMass(mass: number): number {
  return Math.cbrt(mass) * 1.4
}

/**
 * Shatter a star into `count` fragments on an outward-flying ring. ~40% of the
 * mass is lost to radiation, so it never manufactures mass. Pure.
 */
export function supernova(star: Body, count = 14, speed = 7): Body[] {
  const fragMass = (star.mass * 0.6) / count
  const r = star.radius + 4
  const out: Body[] = []
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    out.push(
      makeBody({
        x: star.x + cos * r,
        y: star.y + sin * r,
        vx: cos * speed + star.vx,
        vy: sin * speed + star.vy,
        mass: fragMass,
        color: '#ffd27a',
      })
    )
  }
  return out
}

/** Drop `n` bodies on a circle at the exact circular-orbit speed for `centerMass`. Pure. */
export function spawnRing(cx: number, cy: number, n: number, dist: number, centerMass: number): Body[] {
  const v = Math.sqrt((G * centerMass) / dist)
  const palette = ['#ece7de', '#9aa0a6', '#e84c28', '#6ea2c4', '#d8a24a']
  const out: Body[] = []
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    out.push(
      makeBody({
        x: cx + cos * dist,
        y: cy + sin * dist,
        vx: -sin * v, // tangential => perpendicular to the radius
        vy: cos * v,
        mass: 50 + (k % 3) * 30,
        color: palette[k % palette.length],
      })
    )
  }
  return out
}

export function makeBody(p: Partial<Body> & { x: number; y: number; mass: number }): Body {
  return {
    x: p.x,
    y: p.y,
    vx: p.vx ?? 0,
    vy: p.vy ?? 0,
    mass: p.mass,
    radius: p.radius ?? radiusForMass(p.mass),
    alive: p.alive ?? true,
    color: p.color ?? 'var(--paper)',
    trail: p.trail ?? [],
  }
}

/** Advance one tick: gravity -> integrate -> merge collisions. Input untouched. */
export function step(input: Body[], dt: number): Body[] {
  // work on copies
  const bodies = input.map((b) => ({ ...b, trail: b.trail.slice() }))
  const live = bodies.filter((b) => b.alive)

  // pairwise gravity (equal-and-opposite -> momentum conserved exactly)
  const ax = new Float64Array(live.length)
  const ay = new Float64Array(live.length)
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i]
      const b = live[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d2 = dx * dx + dy * dy + SOFTENING * SOFTENING
      const inv = 1 / Math.sqrt(d2)
      const f = (G * a.mass * b.mass) / d2
      const fx = f * dx * inv
      const fy = f * dy * inv
      ax[i] += fx / a.mass
      ay[i] += fy / a.mass
      ax[j] -= fx / b.mass
      ay[j] -= fy / b.mass
    }
  }

  for (let i = 0; i < live.length; i++) {
    const b = live[i]
    b.vx += ax[i] * dt
    b.vy += ay[i] * dt
    b.x += b.vx * dt
    b.y += b.vy * dt
    b.trail.push({ x: b.x, y: b.y })
    if (b.trail.length > 40) b.trail.shift()
  }

  // merge overlapping pairs (inelastic: conserve mass + momentum)
  for (let i = 0; i < live.length; i++) {
    const a = live[i]
    if (!a.alive) continue
    for (let j = i + 1; j < live.length; j++) {
      const b = live[j]
      if (!b.alive) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.hypot(dx, dy)
      if (dist < Math.max(a.radius, b.radius)) {
        const m = a.mass + b.mass
        a.vx = (a.mass * a.vx + b.mass * b.vx) / m
        a.vy = (a.mass * a.vy + b.mass * b.vy) / m
        a.x = (a.mass * a.x + b.mass * b.x) / m
        a.y = (a.mass * a.y + b.mass * b.y) / m
        a.mass = m
        a.radius = radiusForMass(m)
        if (b.mass > a.mass / 2) a.color = b.color // bias color to the heavier contributor
        b.alive = false
      }
    }
  }

  return bodies
}
