import { describe, it, expect } from 'vitest'
import {
  SIZE, SHAPES, emptyBoard, canPlace, place, clearLines, scoreClear,
  anyMoveAvailable, makePiece, makeTray, type Board, type Shape,
} from './press'

const shape = (id: string): Shape => {
  const s = SHAPES.find((x) => x.id === id)
  if (!s) throw new Error(`no shape ${id}`)
  return s
}

describe('the press core', () => {
  it('empty board is SIZE x SIZE of zeros', () => {
    const b = emptyBoard()
    expect(b).toHaveLength(SIZE)
    expect(b[0]).toHaveLength(SIZE)
    expect(b.flat().every((c) => c === 0)).toBe(true)
  })

  it('every shape is normalized to the top-left origin with matching w/h', () => {
    for (const s of SHAPES) {
      const minR = Math.min(...s.cells.map(([r]) => r))
      const minC = Math.min(...s.cells.map(([, c]) => c))
      expect(minR).toBe(0)
      expect(minC).toBe(0)
      expect(s.w).toBe(Math.max(...s.cells.map(([, c]) => c)) + 1)
      expect(s.h).toBe(Math.max(...s.cells.map(([r]) => r)) + 1)
    }
  })

  it('canPlace respects bounds and occupancy', () => {
    const b = emptyBoard()
    const dom = shape('dom-h')
    expect(canPlace(b, dom, 0, 0)).toBe(true)
    expect(canPlace(b, dom, 0, SIZE - 1)).toBe(false) // overflows the right edge
    const b2 = place(b, shape('mono'), 0, 1, 1)
    expect(canPlace(b2, dom, 0, 0)).toBe(false) // overlaps the placed cell at (0,1)
  })

  it('place is immutable and writes the ink color', () => {
    const b = emptyBoard()
    const b2 = place(b, shape('dom-h'), 2, 3, 2)
    expect(b[2][3]).toBe(0) // original untouched
    expect(b2[2][3]).toBe(2)
    expect(b2[2][4]).toBe(2)
  })

  it('clears a full row and a full column', () => {
    let b = emptyBoard()
    for (let c = 0; c < SIZE; c++) b[0][c] = 1
    expect(clearLines(b).lines).toBe(1)
    expect(clearLines(b).board[0].every((c) => c === 0)).toBe(true)

    b = emptyBoard()
    for (let r = 0; r < SIZE; r++) b[r][2] = 1
    const res = clearLines(b)
    expect(res.lines).toBe(1)
    expect(res.board.every((row) => row[2] === 0)).toBe(true)
  })

  it('counts a monochrome line as a clean pull, a mixed one as not', () => {
    const b = emptyBoard()
    for (let c = 0; c < SIZE; c++) b[0][c] = 1 // all ink -> clean pull
    for (let c = 0; c < SIZE; c++) b[1][c] = c === 0 ? 2 : 1 // mixed -> not clean
    const res = clearLines(b)
    expect(res.lines).toBe(2)
    expect(res.mono).toBe(1)
  })

  it('does not clear a partial line', () => {
    const b = emptyBoard()
    for (let c = 0; c < SIZE - 1; c++) b[0][c] = 1
    const res = clearLines(b)
    expect(res.lines).toBe(0)
    expect(res.board[0][0]).toBe(1)
  })

  it('scores by line count, clean pulls, and combo', () => {
    expect(scoreClear(0, 0, 0)).toBe(0)
    expect(scoreClear(1, 0, 0)).toBe(10)
    expect(scoreClear(2, 0, 0)).toBe(40) // 10 * 2^2
    expect(scoreClear(3, 0, 0)).toBe(90)
    expect(scoreClear(1, 1, 0)).toBe(25) // +15 clean pull
    expect(scoreClear(2, 2, 2)).toBe(140) // (40 + 30) * (1 + 0.5*2)
  })

  it('detects when no move is available (game over)', () => {
    const full: Board = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => 1 as const))
    expect(anyMoveAvailable(full, [{ shape: shape('mono'), ink: 1 }])).toBe(false)
    expect(anyMoveAvailable(emptyBoard(), [{ shape: shape('mono'), ink: 1 }])).toBe(true)
  })

  it('generates in-range pieces and a tray of three', () => {
    const seq = [0.0, 0.4, 0.99, 0.6, 0.2, 0.8]
    let i = 0
    const rng = () => seq[i++ % seq.length]
    const p = makePiece(rng)
    expect(SHAPES).toContain(p.shape)
    expect([1, 2]).toContain(p.ink)
    expect(makeTray(() => 0.3)).toHaveLength(3)
  })
})
