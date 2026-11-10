export type Rect = { x: number; y: number; w: number; h: number }

// Layout in internal 320x180 pixels. Per side: the name plate and the round-win plate side by side
// on top, then a thin HP bar under them. The right side mirrors the left.
export const TIMER_RECT: Rect = { x: 147, y: 6, w: 26, h: 14 }
export const NAME_FONT_PX = 11

const BAR_W = 124
const MARGIN = 10
const PIPS_W = 34
const NAME_W = 84
const GAP = 6
const ROW_Y = 4
const ROW_H = 13

export function hudRects(side: 0 | 1): { bar: Rect; name: Rect; pips: Rect } {
  const barX = side === 0 ? MARGIN : 320 - MARGIN - BAR_W
  const bar: Rect = { x: barX, y: ROW_Y + ROW_H + 2, w: BAR_W, h: 7 }
  if (side === 0) {
    return { bar, name: { x: barX, y: ROW_Y, w: NAME_W, h: ROW_H }, pips: { x: barX + NAME_W + GAP, y: ROW_Y, w: PIPS_W, h: ROW_H } }
  }
  return { bar, pips: { x: barX, y: ROW_Y, w: PIPS_W, h: ROW_H }, name: { x: barX + PIPS_W + GAP, y: ROW_Y, w: NAME_W, h: ROW_H } }
}
