// Falling-sand cellular automaton core. Pure: `step` reads a Sim and returns a
// brand-new Sim, so it is trivially testable and never tears React state.
//
// Movement runs on a simple DENSITY model (heavy sinks, light floats, gas
// rises) so interactions like "oil floats on water" fall out for free. On top
// of that sits a reaction matrix: fire spreads, gunpowder chain-detonates, lava
// cools water/ice to stone, acid dissolves solids, ice freezes/melts. That
// emergence is the depth.

export const EMPTY = 0
export const SAND = 1
export const WATER = 2
export const WALL = 3
export const FIRE = 4
export const PLANT = 5
export const LAVA = 6
export const GUNPOWDER = 7
export const STEAM = 8
export const ACID = 9
export const OIL = 10
export const ICE = 11

export const FIRE_LIFE = 8
export const STEAM_LIFE = 70

// rng-gated tunables (deterministic test setups force them with rng = () => 0)
const GROW_CHANCE = 0.04
const LAVA_FLOW = 0.45
const LAVA_EMIT = 0.06
const FREEZE_CHANCE = 0.05
const ACID_CHANCE = 0.3
const ACID_CONSUME = 0.5

// relative densities for the movement model (solids use 0 but are gated out)
const DENSITY = [0, 9, 5, 0, 1, 0, 8, 7, 1, 5, 3, 0]

export type Sim = { w: number; h: number; cells: Uint8Array; age: Uint8Array }

export const idx = (x: number, y: number, w: number) => y * w + x

export function createSim(w: number, h: number): Sim {
  return { w, h, cells: new Uint8Array(w * h), age: new Uint8Array(w * h) }
}

const N4: ReadonlyArray<readonly [number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]]
const N8: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
]

const isSolid = (v: number) => v === WALL || v === PLANT || v === ICE
const isGas = (v: number) => v === FIRE || v === STEAM
const isPowder = (v: number) => v === SAND || v === GUNPOWDER
const isLiquid = (v: number) => v === WATER || v === LAVA || v === ACID || v === OIL

/** Advance the simulation one tick. Returns a new Sim; the input is untouched. */
export function step(sim: Sim, rng: () => number = Math.random): Sim {
  const { w, h } = sim
  const src = sim.cells
  const cells = Uint8Array.from(src)
  const age = Uint8Array.from(sim.age)
  const moved = new Uint8Array(w * h)
  const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h
  const at = (x: number, y: number) => src[idx(x, y, w)]

  function detonate(x: number, y: number) {
    cells[idx(x, y, w)] = FIRE
    age[idx(x, y, w)] = 0
    for (const [dx, dy] of N8) {
      if (!inB(x + dx, y + dy)) continue
      const n = idx(x + dx, y + dy, w)
      if (src[n] === EMPTY || src[n] === SAND || src[n] === GUNPOWDER || src[n] === OIL) { cells[n] = FIRE; age[n] = 0 }
    }
  }

  // --- reaction pass: decided from the ORIGINAL grid so nothing chains twice/tick ---
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w)
      const v = src[i]

      if (v === FIRE) {
        let doused = false
        for (const [dx, dy] of N4) if (inB(x + dx, y + dy) && at(x + dx, y + dy) === WATER) doused = true
        if (doused) { cells[i] = EMPTY; age[i] = 0; continue }
        for (const [dx, dy] of N4) {
          if (!inB(x + dx, y + dy)) continue
          const nb = at(x + dx, y + dy)
          if (nb === PLANT || nb === OIL) { const n = idx(x + dx, y + dy, w); cells[n] = FIRE; age[n] = 0 }
        }
        const a = sim.age[i] + 1
        if (a >= FIRE_LIFE) { cells[i] = EMPTY; age[i] = 0 } else age[i] = a
      } else if (v === LAVA) {
        let cooled = false
        for (const [dx, dy] of N4) {
          if (!inB(x + dx, y + dy)) continue
          const nb = at(x + dx, y + dy)
          if (nb === WATER) { cells[idx(x + dx, y + dy, w)] = STEAM; age[idx(x + dx, y + dy, w)] = 0; cooled = true }
          else if (nb === ICE) { cells[idx(x + dx, y + dy, w)] = WATER; cooled = true }
        }
        if (cooled) { cells[i] = WALL; continue }
        for (const [dx, dy] of N4) {
          if (!inB(x + dx, y + dy)) continue
          const nb = at(x + dx, y + dy)
          if (nb === PLANT || nb === OIL) { const n = idx(x + dx, y + dy, w); cells[n] = FIRE; age[n] = 0 }
        }
        if (inB(x, y - 1) && at(x, y - 1) === EMPTY && rng() < LAVA_EMIT) { const up = idx(x, y - 1, w); cells[up] = FIRE; age[up] = 0 }
      } else if (v === GUNPOWDER) {
        let hot = false
        for (const [dx, dy] of N8) { if (inB(x + dx, y + dy)) { const nv = at(x + dx, y + dy); if (nv === FIRE || nv === LAVA) hot = true } }
        if (hot) detonate(x, y)
      } else if (v === PLANT) {
        let watered = false
        for (const [dx, dy] of N4) if (inB(x + dx, y + dy) && at(x + dx, y + dy) === WATER) watered = true
        if (watered && rng() < GROW_CHANCE) {
          const order: ReadonlyArray<readonly [number, number]> = [[0, -1], [-1, 0], [1, 0], [0, 1]]
          for (const [dx, dy] of order) if (inB(x + dx, y + dy) && at(x + dx, y + dy) === EMPTY) { cells[idx(x + dx, y + dy, w)] = PLANT; break }
        }
      } else if (v === ACID) {
        for (const [dx, dy] of N4) {
          if (!inB(x + dx, y + dy)) continue
          const nb = at(x + dx, y + dy)
          if ((nb === SAND || nb === WALL || nb === PLANT || nb === GUNPOWDER) && rng() < ACID_CHANCE) {
            cells[idx(x + dx, y + dy, w)] = EMPTY
            if (rng() < ACID_CONSUME) cells[i] = EMPTY
            break
          }
        }
      } else if (v === ICE) {
        let melt = false
        for (const [dx, dy] of N4) { if (inB(x + dx, y + dy)) { const nb = at(x + dx, y + dy); if (nb === FIRE || nb === LAVA) melt = true } }
        if (melt) { cells[i] = WATER; continue }
        for (const [dx, dy] of N4) {
          if (inB(x + dx, y + dy) && at(x + dx, y + dy) === WATER && rng() < FREEZE_CHANCE) { cells[idx(x + dx, y + dy, w)] = ICE; break }
        }
      } else if (v === STEAM) {
        const a = sim.age[i] + 1
        if (a >= STEAM_LIFE) { cells[i] = EMPTY; age[i] = 0 } else age[i] = a
      }
    }
  }

  const swap = (i: number, j: number) => { const t = cells[i]; cells[i] = cells[j]; cells[j] = t; moved[i] = 1; moved[j] = 1 }
  const canSink = (tv: number, dens: number) => !isSolid(tv) && DENSITY[tv] < dens

  // --- falling pass (powders + liquids), bottom-up, density-driven ---
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w)
      if (moved[i]) continue
      const v = cells[i]
      if (!isPowder(v) && !isLiquid(v)) continue
      if (v === LAVA && rng() >= LAVA_FLOW) continue
      const dens = DENSITY[v]
      const order = rng() < 0.5 ? [-1, 1] : [1, -1]

      if (y + 1 < h) { const b = idx(x, y + 1, w); if (!moved[b] && canSink(cells[b], dens)) { swap(i, b); continue } }
      let did = false
      for (const dx of order) {
        if (!inB(x + dx, y + 1)) continue
        const d = idx(x + dx, y + 1, w)
        if (!moved[d] && canSink(cells[d], dens)) { swap(i, d); did = true; break }
      }
      if (did) continue
      if (isLiquid(v)) {
        for (const dx of order) {
          if (!inB(x + dx, y)) continue
          const sI = idx(x + dx, y, w)
          if (cells[sI] === EMPTY && !moved[sI]) { swap(i, sI); break }
        }
      }
    }
  }

  // --- rising pass (gases), top-down ---
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w)
      if (moved[i]) continue
      const v = cells[i]
      if (!isGas(v)) continue
      const dens = DENSITY[v]
      const canRise = (tv: number) => !isSolid(tv) && (tv === EMPTY || DENSITY[tv] > dens)
      const order = rng() < 0.5 ? [-1, 1] : [1, -1]

      if (y - 1 >= 0) { const a = idx(x, y - 1, w); if (!moved[a] && canRise(cells[a])) { swap(i, a); continue } }
      let did = false
      for (const dx of order) {
        if (!inB(x + dx, y - 1)) continue
        const u = idx(x + dx, y - 1, w)
        if (!moved[u] && canRise(cells[u])) { swap(i, u); did = true; break }
      }
      if (did) continue
      for (const dx of order) {
        if (!inB(x + dx, y)) continue
        const sI = idx(x + dx, y, w)
        if (cells[sI] === EMPTY && !moved[sI]) { swap(i, sI); break }
      }
    }
  }

  return { w, h, cells, age }
}
