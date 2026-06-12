import { describe, it, expect } from 'vitest'
import { createSim, step, idx, EMPTY, SAND, WATER, WALL, FIRE, PLANT, FIRE_LIFE } from './sand'

// helper: build a sim from a string map. '.'=empty s=sand w=water #=wall f=fire p=plant
function make(rows: string[]) {
  const h = rows.length
  const w = rows[0].length
  const sim = createSim(w, h)
  const m: Record<string, number> = { '.': EMPTY, s: SAND, w: WATER, '#': WALL, f: FIRE, p: PLANT }
  rows.forEach((row, y) => [...row].forEach((ch, x) => { sim.cells[idx(x, y, w)] = m[ch] }))
  return sim
}

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
})
