export type Rect = { x: number; y: number; w: number; h: number }

// Layout in internal 320x180 pixels. Per side: HP bar on top; below it the name plate and the
// round-win plate side by side, never stacked on each other. The right side mirrors the left.
export const TIMER_RECT: Rect = { x: 147, y: 6, w: 26, h: 14 }

const BAR_W = 124
const MARGIN = 10
const PIPS_W = 34
const NAME_W = 84
const GAP = 6

export function hudRects(side: 0 | 1): { bar: Rect; name: Rect; pips: Rect } {
  const barX = side === 0 ? MARGIN : 320 - MARGIN - BAR_W
  const bar: Rect = { x: barX, y: 6, w: BAR_W, h: 12 }
  if (side === 0) {
    return { bar, name: { x: barX, y: 20, w: NAME_W, h: 11 }, pips: { x: barX + NAME_W + GAP, y: 20, w: PIPS_W, h: 11 } }
  }
  return { bar, pips: { x: barX, y: 20, w: PIPS_W, h: 11 }, name: { x: barX + PIPS_W + GAP, y: 20, w: NAME_W, h: 11 } }
}
