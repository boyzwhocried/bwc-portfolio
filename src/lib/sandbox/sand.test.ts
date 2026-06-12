import { describe, it, expect } from 'vitest'
import { createSim, step, idx, EMPTY, SAND, WATER, WALL, FIRE, PLANT, LAVA, GUNPOWDER, STEAM, FIRE_LIFE, STEAM_LIFE } from './sand'

// helper: build a sim from a string map.
// '.'=empty s=sand w=water #=wall f=fire p=plant l=lava g=gunpowder T=steam
function make(rows: string[]) {
  const h = rows.length
  const w = rows[0].length
  const sim = createSim(w, h)
  const m: Record<string, number> = { '.': EMPTY, s: SAND, w: WATER, '#': WALL, f: FIRE, p: PLANT, l: LAVA, g: GUNPOWDER, T: STEAM }
  rows.forEach((row, y) => [...row].forEach((ch, x) => { sim.cells[idx(x, y, w)] = m[ch] }))
  return sim
}

// always-grow / always-flow rng for deterministic reaction tests
const RNG0 = () => 0

describe('falling-sand cellular automaton', () => {
  it('drops a lone sand grain straight down into empty space', () => {
    const s = make(['s', '.', '.'])
    const next = step(s)
    expect(next.cells[idx(0, 0, 1)]).toBe(EMPTY)
    expect(next.cells[idx(0, 1, 1)]).toBe(SAND)
  })

  it('rests sand on top of a wall', () => {
    const s = make(['s', '#'])
    const next = step(s)
    expect(next.cells[idx(0, 0, 1)]).toBe(SAND)
    expect(next.cells[idx(0, 1, 1)]).toBe(WALL)
  })

  it('lets water fall then spread sideways on the floor', () => {
    // water sits on the bottom row with empty neighbours -> spreads
    const s = make(['.w.'])
    const next = step(s)
    const here = next.cells[idx(1, 0, 3)]
    const left = next.cells[idx(0, 0, 3)]
    const right = next.cells[idx(2, 0, 3)]
    // it moved to one side (deterministic-or-not, exactly one side now holds it)
    expect(here === EMPTY).toBe(true)
    expect((left === WATER) !== (right === WATER)).toBe(true)
  })

  it('fire ignites an adjacent plant cell', () => {
    const s = make(['fp'])
    const next = step(s)
    expect(next.cells[idx(1, 0, 2)]).toBe(FIRE)
  })

  it('fire dies out once it exceeds its lifetime', () => {
    const s = make(['f.'])
    s.age[idx(0, 0, 2)] = FIRE_LIFE // already at end of life
    const next = step(s)
    expect(next.cells[idx(0, 0, 2)]).toBe(EMPTY)
  })

  it('water douses adjacent fire (flame gone, water preserved)', () => {
    const s = make(['fw'])
    const next = step(s)
    // the flame is extinguished; water survives (it may creep into the vacated cell)
    expect([...next.cells]).not.toContain(FIRE)
    expect([...next.cells]).toContain(WATER)
  })

  it('does not mutate the input sim', () => {
    const s = make(['s', '.'])
    const before = Uint8Array.from(s.cells)
    step(s)
    expect(s.cells).toEqual(before)
  })

  // ---- reactive elements (the WOAH upgrade) ----

  it('lava + water cools to stone and flashes the water to steam', () => {
    const s = make(['lw'])
    const next = step(s, RNG0)
    expect(next.cells[idx(0, 0, 2)]).toBe(WALL) // lava cooled
    expect(next.cells[idx(1, 0, 2)]).toBe(STEAM) // water flashed
  })

  it('lava ignites an adjacent plant', () => {
    const s = make(['lp'])
    const next = step(s, RNG0)
    expect(next.cells[idx(1, 0, 2)]).toBe(FIRE)
  })

  it('gunpowder chain-detonates when fire touches it (burst becomes fire)', () => {
    const s = make(['fg.'])
    const next = step(s, RNG0)
    // the gunpowder becomes fire and its burst sets the empty neighbour alight
    expect(next.cells[idx(1, 0, 3)]).toBe(FIRE)
    expect(next.cells[idx(2, 0, 3)]).toBe(FIRE)
  })

  it('steam rises and eventually dissipates to empty', () => {
    const s = make(['.', '.', 'T']) // steam at the bottom of a 3-tall column
    const next = step(s, RNG0)
    // it climbed at least one cell
    expect(next.cells[idx(0, 2, 1)]).not.toBe(STEAM)
    expect([next.cells[idx(0, 1, 1)], next.cells[idx(0, 0, 1)]]).toContain(STEAM)
    // and at end of life it is gone
    const old = make(['T'])
    old.age[idx(0, 0, 1)] = STEAM_LIFE
    expect(step(old, RNG0).cells[idx(0, 0, 1)]).toBe(EMPTY)
  })

  it('plant grows into empty space when watered', () => {
    // plant with water beside it and empty above -> grows up
    const s = make(['.', 'p', 'w'])
    const next = step(s, RNG0) // RNG0 forces the growth roll
    expect(next.cells[idx(0, 0, 1)]).toBe(PLANT)
  })

  it('gunpowder falls like a powder when nothing ignites it', () => {
    const s = make(['g', '.'])
    const next = step(s, RNG0)
    expect(next.cells[idx(0, 1, 1)]).toBe(GUNPOWDER)
  })
})
