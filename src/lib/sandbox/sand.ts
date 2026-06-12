// Falling-sand cellular automaton core. Pure: `step` reads a Sim and returns a
// brand-new Sim, so it is trivially testable and never tears the React state.
// The canvas shell just paints `cells` each frame and calls `step` on a timer.

export const EMPTY = 0
export const SAND = 1
export const WATER = 2
export const WALL = 3
export const FIRE = 4
export const PLANT = 5

export const FIRE_LIFE = 6 // steps a flame burns before it dies to EMPTY

export type Sim = { w: number; h: number; cells: Uint8Array; age: Uint8Array }

export const idx = (x: number, y: number, w: number) => y * w + x

export function createSim(w: number, h: number): Sim {
  return { w, h, cells: new Uint8Array(w * h), age: new Uint8Array(w * h) }
}

const N4: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
]

/** Advance the simulation one tick. Returns a new Sim; the input is untouched. */
export function step(sim: Sim, rng: () => number = Math.random): Sim {
  const { w, h } = sim
  const src = sim.cells
  const cells = Uint8Array.from(src)
  const age = Uint8Array.from(sim.age)
  const moved = new Uint8Array(w * h)
  const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h

  // --- fire pass: decided from the ORIGINAL grid so it cannot chain in one tick ---
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w)
      if (src[i] !== FIRE) continue

      let doused = false
      for (const [dx, dy] of N4) {
        if (inB(x + dx, y + dy) && src[idx(x + dx, y + dy, w)] === WATER) doused = true
      }
      if (doused) {
        cells[i] = EMPTY
        age[i] = 0
        continue
      }
      // spread into adjacent plant
      for (const [dx, dy] of N4) {
        if (inB(x + dx, y + dy)) {
          const ni = idx(x + dx, y + dy, w)
          if (src[ni] === PLANT) {
            cells[ni] = FIRE
            age[ni] = 0
          }
        }
      }
      const a = sim.age[i] + 1
      if (a >= FIRE_LIFE) {
        cells[i] = EMPTY
        age[i] = 0
      } else {
        age[i] = a
      }
    }
  }

  // --- movement pass: bottom-up so grains can fall multiple cells per tick ---
  const swap = (i: number, j: number) => {
    const t = cells[i]
    cells[i] = cells[j]
    cells[j] = t
    moved[i] = 1
    moved[j] = 1
  }

  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w)
      if (moved[i]) continue
      const v = cells[i]
      if (v !== SAND && v !== WATER) continue

      const below = y + 1 < h ? idx(x, y + 1, w) : -1
      // straight down into empty
      if (below >= 0 && cells[below] === EMPTY && !moved[below]) {
        swap(i, below)
        continue
      }
      // sand sinks through water
      if (v === SAND && below >= 0 && cells[below] === WATER && !moved[below]) {
        swap(i, below)
        continue
      }
      // diagonal down (random tie-break so piles look natural)
      const order = rng() < 0.5 ? [-1, 1] : [1, -1]
      let did = false
      for (const dx of order) {
        if (!inB(x + dx, y + 1)) continue
        const d = idx(x + dx, y + 1, w)
        if (cells[d] === EMPTY && !moved[d]) {
          swap(i, d)
          did = true
          break
        }
      }
      if (did) continue

      // water also creeps sideways when it cannot fall
      if (v === WATER) {
        for (const dx of order) {
          if (!inB(x + dx, y)) continue
          const s = idx(x + dx, y, w)
          if (cells[s] === EMPTY && !moved[s]) {
            swap(i, s)
            break
          }
        }
      }
    }
  }

  return { w, h, cells, age }
}
