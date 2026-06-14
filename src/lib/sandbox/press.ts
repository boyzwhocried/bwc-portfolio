// "The Press" core — a letterpress take on the block-fit puzzle. You set metal
// "sorts" (polyomino pieces) into an 8x8 forme; a full row or column "prints"
// and clears. Two inks per sort add a planning layer the genre usually lacks:
// a single-ink line is a "clean pull" worth a bonus. Pure + deterministic so
// the rules are pinned by tests and the UI stays a thin renderer.

export const SIZE = 8

/** 0 = empty paper, 1 = ink (charcoal), 2 = vermilion. */
export type Cell = 0 | 1 | 2
export type Ink = 1 | 2
export type Board = Cell[][] // SIZE x SIZE, row-major: board[r][c]

export type Shape = { id: string; cells: [number, number][]; w: number; h: number }
export type Piece = { shape: Shape; ink: Ink }

function norm(id: string, raw: [number, number][]): Shape {
  const minR = Math.min(...raw.map(([r]) => r))
  const minC = Math.min(...raw.map(([, c]) => c))
  const cells = raw.map(([r, c]) => [r - minR, c - minC] as [number, number])
  const w = Math.max(...cells.map(([, c]) => c)) + 1
  const h = Math.max(...cells.map(([r]) => r)) + 1
  return { id, cells, w, h }
}

// curated sort-case: 1..5-cell polyominoes, fixed orientation (no rotation, by
// design — you plan the gaps, not the spin). The 3x3 is the rare punisher.
export const SHAPES: Shape[] = [
  norm('mono', [[0, 0]]),
  norm('dom-h', [[0, 0], [0, 1]]),
  norm('dom-v', [[0, 0], [1, 0]]),
  norm('tri-h', [[0, 0], [0, 1], [0, 2]]),
  norm('tri-v', [[0, 0], [1, 0], [2, 0]]),
  norm('corner-tl', [[0, 0], [0, 1], [1, 0]]),
  norm('corner-tr', [[0, 0], [0, 1], [1, 1]]),
  norm('corner-br', [[0, 1], [1, 0], [1, 1]]),
  norm('corner-bl', [[0, 0], [1, 0], [1, 1]]),
  norm('square2', [[0, 0], [0, 1], [1, 0], [1, 1]]),
  norm('line4-h', [[0, 0], [0, 1], [0, 2], [0, 3]]),
  norm('line4-v', [[0, 0], [1, 0], [2, 0], [3, 0]]),
  norm('tee', [[0, 0], [0, 1], [0, 2], [1, 1]]),
  norm('jay', [[0, 0], [1, 0], [1, 1], [1, 2]]),
  norm('ess', [[0, 1], [0, 2], [1, 0], [1, 1]]),
  norm('zee', [[0, 0], [0, 1], [1, 1], [1, 2]]),
  norm('line5-h', [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]),
  norm('line5-v', [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]),
  norm('plus', [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]]),
  norm('bigL', [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]]),
  norm('square3', [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]),
]

export function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => 0 as Cell))
}

export function canPlace(board: Board, shape: Shape, r: number, c: number): boolean {
  for (const [dr, dc] of shape.cells) {
    const rr = r + dr
    const cc = c + dc
    if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) return false
    if (board[rr][cc] !== 0) return false
  }
  return true
}

/** Immutable place. Assumes canPlace already passed. */
export function place(board: Board, shape: Shape, r: number, c: number, ink: Ink): Board {
  const next = board.map((row) => row.slice())
  for (const [dr, dc] of shape.cells) next[r + dr][c + dc] = ink
  return next
}

export type ClearResult = { board: Board; lines: number; mono: number }

/** Print every full row and column. `mono` = how many cleared lines were a
 *  single ink (clean pulls). Monochrome is judged on the pre-clear board. */
export function clearLines(board: Board): ClearResult {
  const fullRows: number[] = []
  const fullCols: number[] = []
  for (let r = 0; r < SIZE; r++) if (board[r].every((c) => c !== 0)) fullRows.push(r)
  for (let c = 0; c < SIZE; c++) {
    let full = true
    for (let r = 0; r < SIZE; r++) if (board[r][c] === 0) { full = false; break }
    if (full) fullCols.push(c)
  }

  let mono = 0
  for (const r of fullRows) if (board[r].every((c) => c === board[r][0])) mono++
  for (const c of fullCols) {
    const first = board[0][c]
    let same = true
    for (let r = 1; r < SIZE; r++) if (board[r][c] !== first) { same = false; break }
    if (same) mono++
  }

  const next = board.map((row) => row.slice())
  for (const r of fullRows) for (let c = 0; c < SIZE; c++) next[r][c] = 0
  for (const c of fullCols) for (let r = 0; r < SIZE; r++) next[r][c] = 0
  return { board: next, lines: fullRows.length + fullCols.length, mono }
}

/** lines this move (rows+cols), clean pulls among them, current combo streak. */
export function scoreClear(lines: number, mono: number, combo: number): number {
  if (lines <= 0) return 0
  const base = 10 * lines * lines // 10, 40, 90, 160 — simultaneous clears scale hard
  const clean = 15 * mono
  const mult = 1 + 0.5 * combo
  return Math.round((base + clean) * mult)
}

export function anyMoveAvailable(board: Board, pieces: Piece[]): boolean {
  for (const p of pieces) {
    for (let r = 0; r <= SIZE - p.shape.h; r++)
      for (let c = 0; c <= SIZE - p.shape.w; c++)
        if (canPlace(board, p.shape, r, c)) return true
  }
  return false
}

export function makePiece(rng: () => number): Piece {
  const shape = SHAPES[Math.floor(rng() * SHAPES.length)]
  const ink: Ink = rng() < 0.5 ? 1 : 2
  return { shape, ink }
}

export function makeTray(rng: () => number): Piece[] {
  return [makePiece(rng), makePiece(rng), makePiece(rng)]
}
