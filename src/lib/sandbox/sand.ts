// Falling-sand cellular automaton core. Pure: `step` reads a Sim and returns a
// brand-new Sim, so it is trivially testable and never tears React state.
//
// Element set is curated (not bloated) but reactive: powders fall, liquids flow,
// gases rise, and heat drives chain reactions — fire spreads, gunpowder
// detonates, lava cools water to stone, plants grow. That emergence is the WOAH.

export const EMPTY = 0
export const SAND = 1
export const WATER = 2
export const WALL = 3
export const FIRE = 4
export const PLANT = 5
export const LAVA = 6
export const GUNPOWDER = 7
export const STEAM = 8

export const FIRE_LIFE = 8 // steps a flame burns before it dies
export const STEAM_LIFE = 70 // steps steam lingers before it dissipates

// tunables (rng-gated, so deterministic test setups can force them)
const GROW_CHANCE = 0.04
const LAVA_FLOW = 0.45 // lava is viscous: only attempts to move this often
const LAVA_EMIT = 0.06 // chance lava licks a flame upward

export type Sim = { w: number; h: number; cells: Uint8Array; age: Uint8Array }

export const idx = (x: number, y: number, w: number) => y * w + x

export function createSim(w: number, h: number): Sim {
  return { w, h, cells: new Uint8Array(w * h), age: new Uint8Array(w * h) }
}

const N4: ReadonlyArray<readonly [number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]]
const N8: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
]

const isPowder = (v: number) => v === SAND || v === GUNPOWDER
const isGas = (v: number) => v === FIRE || v === STEAM

/** Advance the simulation one tick. Returns a new Sim; the input is untouched. */
export function step(sim: Sim, rng: () => number = Math.random): Sim {
  const { w, h } = sim
  const src = sim.cells
  const cells = Uint8Array.from(src)
  const age = Uint8Array.from(sim.age)
  const moved = new Uint8Array(w * h)
  const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h
  const at = (x: number, y: number) => src[idx(x, y, w)]

  // burst a gunpowder cell: it becomes fire and torches loose neighbours, so the
  // blast walks outward one ring per tick = a visible chain reaction.
  function detonate(x: number, y: number) {
    cells[idx(x, y, w)] = FIRE
    age[idx(x, y, w)] = 0
    for (const [dx, dy] of N8) {
      if (!inB(x + dx, y + dy)) continue
      const n = idx(x + dx, y + dy, w)
      if (src[n] === EMPTY || src[n] === SAND || src[n] === GUNPOWDER) {
        cells[n] = FIRE
        age[n] = 0
      }
    }
  }

  // --- reaction pass: decided from the ORIGINAL grid so nothing chains twice/tick ---
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w)
      const v = src[i]

      if (v === FIRE) {
        // water smothers it
        let doused = false
        for (const [dx, dy] of N4) if (inB(x + dx, y + dy) && at(x + dx, y + dy) === WATER) doused = true
        if (doused) { cells[i] = EMPTY; age[i] = 0; continue }
        // ignite adjacent plant
        for (const [dx, dy] of N4) {
          if (inB(x + dx, y + dy) && at(x + dx, y + dy) === PLANT) {
            const n = idx(x + dx, y + dy, w); cells[n] = FIRE; age[n] = 0
          }
        }
        const a = sim.age[i] + 1
        if (a >= FIRE_LIFE) { cells[i] = EMPTY; age[i] = 0 } else age[i] = a
      } else if (v === LAVA) {
        // contact with water cools lava to stone and flashes the water to steam
        const waters: number[] = []
        for (const [dx, dy] of N4) if (inB(x + dx, y + dy) && at(x + dx, y + dy) === WATER) waters.push(idx(x + dx, y + dy, w))
        if (waters.length) {
          cells[i] = WALL
          for (const n of waters) { cells[n] = STEAM; age[n] = 0 }
          continue
        }
        // ignite adjacent plant; occasionally lick a flame upward
        for (const [dx, dy] of N4) {
          if (inB(x + dx, y + dy) && at(x + dx, y + dy) === PLANT) {
            const n = idx(x + dx, y + dy, w); cells[n] = FIRE; age[n] = 0
          }
        }
        if (inB(x, y - 1) && at(x, y - 1) === EMPTY && rng() < LAVA_EMIT) {
          const up = idx(x, y - 1, w); cells[up] = FIRE; age[up] = 0
        }
      } else if (v === GUNPOWDER) {
        let hot = false
        for (const [dx, dy] of N8) {
          if (!inB(x + dx, y + dy)) continue
          const nv = at(x + dx, y + dy)
          if (nv === FIRE || nv === LAVA) hot = true
        }
        if (hot) detonate(x, y)
      } else if (v === PLANT) {
        let watered = false
        for (const [dx, dy] of N4) if (inB(x + dx, y + dy) && at(x + dx, y + dy) === WATER) watered = true
        if (watered && rng() < GROW_CHANCE) {
          // prefer growing upward, then sideways, then down
          const order: ReadonlyArray<readonly [number, number]> = [[0, -1], [-1, 0], [1, 0], [0, 1]]
          for (const [dx, dy] of order) {
            if (inB(x + dx, y + dy) && at(x + dx, y + dy) === EMPTY) { cells[idx(x + dx, y + dy, w)] = PLANT; break }
          }
        }
      } else if (v === STEAM) {
        const a = sim.age[i] + 1
        if (a >= STEAM_LIFE) { cells[i] = EMPTY; age[i] = 0 } else age[i] = a
      }
    }
  }

  const swap = (i: number, j: number) => { const t = cells[i]; cells[i] = cells[j]; cells[j] = t; moved[i] = 1; moved[j] = 1 }
  const passable = (v: number) => v === EMPTY || v === WATER || v === STEAM // denser things sink through these

  // --- falling pass (powders + liquids), bottom-up so they fall multiple cells ---
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w)
      if (moved[i]) continue
      const v = cells[i]
      const liquid = v === WATER || v === LAVA
      if (!isPowder(v) && !liquid) continue
      if (v === LAVA && rng() >= LAVA_FLOW) continue // viscosity: skip most ticks

      const order = rng() < 0.5 ? [-1, 1] : [1, -1]
      const below = y + 1 < h ? idx(x, y + 1, w) : -1

      // straight down through anything lighter
      if (below >= 0 && !moved[below]) {
        const bv = cells[below]
        if (bv === EMPTY) { swap(i, below); continue }
        // powders sink through liquids/gas; water sinks through steam
        if ((isPowder(v) && (bv === WATER || bv === STEAM)) || (v === WATER && bv === STEAM) || (v === LAVA && (bv === WATER || bv === STEAM))) { swap(i, below); continue }
      }
      // diagonal down into empty
      let did = false
      for (const dx of order) {
        if (!inB(x + dx, y + 1)) continue
        const d = idx(x + dx, y + 1, w)
        if (cells[d] === EMPTY && !moved[d]) { swap(i, d); did = true; break }
      }
      if (did) continue
      // liquids creep sideways
      if (liquid) {
        for (const dx of order) {
          if (!inB(x + dx, y)) continue
          const sIdx = idx(x + dx, y, w)
          if (cells[sIdx] === EMPTY && !moved[sIdx]) { swap(i, sIdx); break }
        }
      }
    }
  }

  // --- rising pass (gases), top-down so they float multiple cells ---
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w)
      if (moved[i]) continue
      const v = cells[i]
      if (!isGas(v)) continue
      const order = rng() < 0.5 ? [-1, 1] : [1, -1]
      const above = y - 1 >= 0 ? idx(x, y - 1, w) : -1

      if (above >= 0 && !moved[above]) {
        const av = cells[above]
        if (av === EMPTY) { swap(i, above); continue }
        if (v === STEAM && av === WATER) { swap(i, above); continue } // steam bubbles up through water
      }
      let did = false
      for (const dx of order) {
        if (!inB(x + dx, y - 1)) continue
        const u = idx(x + dx, y - 1, w)
        if (cells[u] === EMPTY && !moved[u]) { swap(i, u); did = true; break }
      }
      if (did) continue
      // spread sideways when capped
      for (const dx of order) {
        if (!inB(x + dx, y)) continue
        const sIdx = idx(x + dx, y, w)
        if (passable(cells[sIdx]) && cells[sIdx] === EMPTY && !moved[sIdx]) { swap(i, sIdx); break }
      }
    }
  }

  return { w, h, cells, age }
}
