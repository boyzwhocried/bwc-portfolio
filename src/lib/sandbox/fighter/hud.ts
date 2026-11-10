export type Rect = { x: number; y: number; w: number; h: number }

// Layout in internal 320x180 pixels. Per side, from the outer edge in: the portrait plate, then a
// block with the name plate and round-win plate on top and the thin HP bar under them. The right
// side mirrors the left.
export const TIMER_RECT: Rect = { x: 147, y: 6, w: 26, h: 14 }
export const NAME_FONT_PX = 9
export const PORTRAIT_PX = 40 // the generated portrait sprite is 40x40

const MARGIN = 10
const PLATE = PORTRAIT_PX + 2 // portrait plus its frame
const PGAP = 4
const BLOCK_W = 86
const PIPS_W = 34
const ROW_Y = 4
const ROW_H = 13

export function hudRects(side: 0 | 1): { bar: Rect; name: Rect; pips: Rect; portrait: Rect } {
  const portraitX = side === 0 ? MARGIN : 320 - MARGIN - PLATE
  const blockX = side === 0 ? MARGIN + PLATE + PGAP : 320 - MARGIN - PLATE - PGAP - BLOCK_W
  const portrait: Rect = { x: portraitX, y: 3, w: PLATE, h: PLATE }
  const name: Rect = { x: blockX, y: ROW_Y, w: BLOCK_W, h: ROW_H }
  const bar: Rect = { x: blockX, y: ROW_Y + ROW_H + 2, w: BLOCK_W, h: 7 }
  const pipsY = bar.y + bar.h + 3
  const pips: Rect = { x: side === 0 ? blockX : blockX + BLOCK_W - PIPS_W, y: pipsY, w: PIPS_W, h: ROW_H }
  return { bar, name, pips, portrait }
}
