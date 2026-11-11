import { FLOOR_Y } from './art/stage-forest'
import { stageFx, PERIOD, type StagePixel } from './stagefx'

// Per-stage backdrops for arcade mode, drawn from rectangles (no baked pixel data) plus an
// animated pixel layer. Pure and deterministic: rects depend only on the stage, fx only on the
// stage and the sim frame (loops every PERIOD). Scene 0 is the baked forest: it adds only haze.
// Three colors only.

export type SceneColor = 'i' | 'p' | 'v'
export type Rect = { x: number; y: number; w: number; h: number; c: SceneColor }

export const SCENE_COUNT = 6
const W = 320
const H = 180
const INK = '#1a1a1a'
const PAPER = '#ece7de'
const VERM = '#e84c28'

function hash(a: number, b: number): number {
  let h = Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 7, 0x85ebca6b)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 13
  return h >>> 0
}

class Pen {
  out: Rect[] = []
  r(x: number, y: number, w: number, h: number, c: SceneColor) {
    const x0 = Math.max(0, x)
    const y0 = Math.max(0, y)
    const x1 = Math.min(W, x + w)
    const y1 = Math.min(H, y + h)
    if (x1 > x0 && y1 > y0) this.out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, c })
  }
  frame(x: number, y: number, w: number, h: number, c: SceneColor, t = 1) {
    this.r(x, y, w, t, c)
    this.r(x, y + h - t, w, t, c)
    this.r(x, y, t, h, c)
    this.r(x + w - t, y, t, h, c)
  }
  disc(cx: number, cy: number, rad: number, c: SceneColor) {
    for (let dy = -rad; dy <= rad; dy++) {
      const half = Math.floor(Math.sqrt(rad * rad - dy * dy + 0.25))
      this.r(cx - half, cy + dy, half * 2 + 1, 1, c)
    }
  }
  // ring (outline) of a circle, upper half only (dy <= 0), thickness t
  arc(cx: number, cy: number, rad: number, t: number, c: SceneColor) {
    for (let dy = -rad; dy <= 0; dy++) {
      const outer = Math.floor(Math.sqrt(rad * rad - dy * dy + 0.25))
      const ri = rad - t
      const inner = Math.abs(dy) <= ri ? Math.floor(Math.sqrt(ri * ri - dy * dy + 0.25)) : -1
      if (inner < 0) this.r(cx - outer, cy + dy, outer * 2 + 1, 1, c)
      else {
        this.r(cx - outer, cy + dy, outer - inner, 1, c)
        this.r(cx + inner + 1, cy + dy, outer - inner, 1, c)
      }
    }
  }
  backdrop() {
    this.r(0, 0, W, H, 'i')
  }
  floor() {
    this.r(0, FLOOR_Y, W, H - FLOOR_Y, 'i')
    this.r(0, FLOOR_Y, W, 1, 'p')
    for (let x = 0; x < W; x += 16) this.r(x, FLOOR_Y + 10, 8, 1, 'p')
    for (let x = 8; x < W; x += 16) this.r(x, FLOOR_Y + 20, 8, 1, 'p')
  }
}

// Demand Avenue: a skyline of low blocks, banner poles, and a crowd with signs.
function street(): Rect[] {
  const p = new Pen()
  p.backdrop()
  let x = 0
  for (let i = 0; x < W; i++) {
    const w = 26 + (hash(i, 1) % 22)
    const h = 40 + (hash(i, 2) % 50)
    p.frame(x, FLOOR_Y - h, Math.min(w, W - x), h, 'p')
    for (let wy = FLOOR_Y - h + 6; wy < FLOOR_Y - 12; wy += 10) {
      for (let wx = x + 5; wx < x + w - 6 && wx < W - 3; wx += 8) p.r(wx, wy, 3, 4, hash(wx, wy) % 5 === 0 ? 'v' : 'p')
    }
    x += w + 2
  }
  for (const bx of [40, 120, 200, 280]) {
    p.r(bx, 64, 2, FLOOR_Y - 64, 'p')
    p.r(bx + 2, 66, 24, 14, 'v')
    p.frame(bx + 2, 66, 24, 14, 'p')
    p.r(bx + 6, 71, 16, 2, 'p')
  }
  for (let cx = 6; cx < W; cx += 13 + (hash(cx, 3) % 5)) {
    p.r(cx - 3, FLOOR_Y - 12, 7, 12, 'i')
    p.disc(cx, FLOOR_Y - 15, 4, 'p')
  }
  p.floor()
  return p.out
}

// The Meeting Kitchen: tiled wall, shelf of lunch boxes, counter, a pot on the stove.
function kitchen(): Rect[] {
  const p = new Pen()
  p.backdrop()
  for (let y = 18; y < 124; y += 16) {
    for (let x = 0; x < W; x += 20) p.r(x, y, 12, 1, 'p')
  }
  p.r(18, 76, 108, 3, 'p')
  for (const [sx, n] of [[22, 4], [76, 3]] as const) {
    for (let k = 0; k < n; k++) {
      p.frame(sx + k * 14, 64, 12, 12, 'p')
      p.r(sx + k * 14, 69, 12, 2, k % 2 === 0 ? 'v' : 'p')
    }
  }
  for (let k = 0; k < 3; k++) {
    p.frame(30 + k * 14, 52, 12, 12, 'p')
    p.r(30 + k * 14, 57, 12, 2, 'p')
  }
  p.r(0, 124, W, FLOOR_Y - 124, 'i')
  p.r(0, 124, W, 2, 'p')
  for (let x = 6; x < W - 30; x += 40) p.frame(x, 130, 34, 22, 'p')
  p.r(236, 100, 56, 24, 'p')
  p.r(240, 104, 48, 16, 'i')
  p.r(240, 108, 48, 3, 'v')
  p.r(232, 98, 64, 3, 'p')
  p.r(262, 84, 4, 14, 'p')
  p.floor()
  return p.out
}

// The Queue Counter: a service window under a number board, stanchions with rope, a distant line.
function queue(): Rect[] {
  const p = new Pen()
  p.backdrop()
  p.frame(116, 56, 88, 26, 'p', 2)
  p.r(120, 60, 80, 2, 'v')
  p.r(100, 88, 120, 68, 'i')
  p.frame(100, 88, 120, 68, 'p', 2)
  p.r(112, 100, 96, 30, 'i')
  p.frame(112, 100, 96, 30, 'p')
  p.r(112, 130, 96, 3, 'p')
  p.r(150, 104, 20, 20, 'p')
  p.disc(160, 110, 4, 'i')
  p.r(155, 116, 10, 8, 'i')
  for (let x = 228; x < 312; x += 14) {
    p.disc(x, 118 - ((x - 228) >> 4), 3, 'p')
    p.r(x - 2, 121 - ((x - 228) >> 4), 5, 8, 'p')
  }
  for (const sx of [24, 58, 92]) {
    p.r(sx, FLOOR_Y - 26, 2, 26, 'p')
    p.disc(sx + 1, FLOOR_Y - 28, 2, 'v')
  }
  p.r(26, FLOOR_Y - 22, 32, 1, 'v')
  p.r(60, FLOOR_Y - 22, 32, 1, 'v')
  p.floor()
  return p.out
}

// The Exchange Room: a wall board of rates, desk phone, ceiling lights.
function exchange(): Rect[] {
  const p = new Pen()
  p.backdrop()
  p.frame(36, 52, 248, 76, 'p', 2)
  p.r(38, 54, 244, 10, 'v')
  for (let y = 78; y < 126; y += 12) p.r(38, y, 244, 1, 'p')
  for (const cx of [90, 160, 230]) {
    p.r(cx, 0, 1, 18, 'p')
    p.r(cx - 12, 18, 25, 3, 'p')
    p.r(cx - 8, 21, 17, 2, 'v')
  }
  p.r(14, FLOOR_Y - 18, 44, 18, 'p')
  p.r(16, FLOOR_Y - 16, 40, 14, 'i')
  p.r(24, FLOOR_Y - 26, 22, 8, 'p')
  p.r(26, FLOOR_Y - 24, 18, 4, 'i')
  p.r(266, FLOOR_Y - 14, 40, 14, 'p')
  p.r(268, FLOOR_Y - 12, 36, 10, 'i')
  p.floor()
  return p.out
}

// The Dome Gate: a big dome, columns, steps and a small door.
function dome(): Rect[] {
  const p = new Pen()
  p.backdrop()
  p.arc(160, 120, 92, 3, 'p')
  for (const rx of [-60, -30, 0, 30, 60]) p.r(160 + rx, 120 - Math.floor(Math.sqrt(92 * 92 - rx * rx)) + 3, 1, 14, 'p')
  p.r(158, 24, 4, 8, 'v')
  p.r(66, 120, 188, 4, 'p')
  for (const cx of [74, 112, 192, 230]) {
    p.frame(cx, 124, 14, 32, 'p')
    p.r(cx + 4, 128, 1, 24, 'p')
    p.r(cx + 9, 128, 1, 24, 'p')
  }
  p.r(144, 124, 32, 32, 'i')
  p.frame(144, 124, 32, 32, 'p', 2)
  p.r(158, 130, 4, 26, 'v')
  p.r(56, 148, 208, 3, 'p')
  p.r(46, 152, 228, 4, 'p')
  p.floor()
  return p.out
}

const BUILDERS: Record<number, () => Rect[]> = { 1: street, 2: kitchen, 3: queue, 4: exchange, 5: dome }
const cache = new Map<number, Rect[]>()

export function sceneRects(scene: number): Rect[] {
  const build = BUILDERS[scene]
  if (!build) return []
  let r = cache.get(scene)
  if (!r) {
    r = build()
    cache.set(scene, r)
  }
  return r
}

// ---------- animated layer ----------

const DIGITS = [
  '111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
  '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111',
]

function digit(put: (x: number, y: number, c: string) => void, n: number, x: number, y: number, c: string) {
  const g = DIGITS[((n % 10) + 10) % 10]
  for (let i = 0; i < 15; i++) if (g[i] === '1') put(x + (i % 3), y + Math.floor(i / 3), c)
}

function wave(t: number, k: number, phase = 0): number {
  return Math.sin((t / PERIOD) * Math.PI * 2 * k + phase)
}

export function sceneFx(scene: number, frame: number): StagePixel[] {
  const t = ((frame % PERIOD) + PERIOD) % PERIOD
  const out: StagePixel[] = []
  const put = (x: number, y: number, color: string) => {
    if (x >= 0 && x < W && y >= 0 && y < FLOOR_Y) out.push({ x, y, color })
  }

  if (scene === 0) {
    out.push(...stageFx(frame))
    // haze: a drifting dither band over the lower trees
    const drift = Math.floor(t / 6)
    for (let y = 96; y < 150; y += 3) {
      for (let x = 0; x < W; x += 4) {
        const xx = (x + drift + (y % 6 === 0 ? 2 : 0)) % W
        if (hash(x, y) % 3 === 0) put(xx, y, PAPER)
      }
    }
  } else if (scene === 1) {
    // banners flutter at the trailing edge; crowd signs swing
    for (const [i, bx] of [40, 120, 200, 280].entries()) {
      for (let y = 66; y < 80; y++) put(bx + 26, y, INK)
      for (let y = 66; y < 80; y++) put(bx + 26 + Math.round(wave(t, 2, i + y * 0.5) * 2), y, y % 4 < 2 ? VERM : PAPER)
    }
    for (let cx = 20; cx < W - 10; cx += 46) {
      const sway = Math.round(wave(t, 3, cx) * 2)
      for (let y = 118; y < 140; y++) put(cx + (y < 124 ? sway : 0), y, PAPER)
      for (let x = -5; x <= 5; x++) for (let y = 108; y < 117; y++) put(cx + x + sway, y, (x + y + cx) % 5 === 0 ? VERM : PAPER)
    }
  } else if (scene === 2) {
    // steam off the pot and a pot-lid rattle
    for (let k = 0; k < 6; k++) {
      const age = (t + k * 40) % PERIOD
      const y = 98 - Math.floor(age * 0.3)
      const x = 258 + (k % 3) * 10 + Math.round(wave(age, 2, k) * 3)
      put(x, y, age < PERIOD * 0.7 ? PAPER : INK)
      put(x + 1, y, PAPER)
    }
    const lid = Math.floor(t / 5) % 2
    put(261 + lid, 97, VERM)
  } else if (scene === 3) {
    // number board counts up; call lamp blinks
    const n = 41 + Math.floor(t / 60)
    digit(put, Math.floor(n / 10), 148, 66, PAPER)
    digit(put, n, 154, 66, PAPER)
    digit(put, hash(n, 5), 160, 66, PAPER)
    if (Math.floor(t / 20) % 2 === 0) for (let x = 180; x < 196; x++) for (let y = 62; y < 66; y++) put(x, y, VERM)
    // someone steps forward in the far line
    const step = Math.floor(t / 60)
    for (let y = 112; y < 120; y++) put(228 + step * 14, y, INK)
  } else if (scene === 4) {
    // the rate board flickers: every cell re-rolls on its own slow beat
    const tick = Math.floor(t / 20)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        const seed = hash(row * 10 + col, Math.floor((tick + col * 2 + row) / 3))
        const up = seed % 7 === 0
        for (let d = 0; d < 3; d++) digit(put, (seed >>> (d * 4)) % 10, 44 + col * 40 + d * 4, 82 + row * 12, up ? VERM : PAPER)
      }
    }
    for (const cx of [90, 160, 230]) {
      const f = Math.floor(t / 30 + cx) % 5
      if (f === 0) for (let x = -3; x <= 3; x++) put(cx + x, 24, INK)
    }
  } else if (scene === 5) {
    // two searchlight beams sweep the dome
    for (const [i, base] of [95, 225].entries()) {
      const sweep = Math.round(wave(t, 1, i * Math.PI) * 26)
      for (let y = 0; y < FLOOR_Y; y += 2) {
        const x = base + Math.round(((FLOOR_Y - y) / FLOOR_Y) * sweep * 0.2) + Math.round((y / FLOOR_Y) * sweep)
        put(x, y, PAPER)
        if (y % 4 === 0) put(x + 1, y, PAPER)
      }
    }
    if (Math.floor(t / 30) % 2 === 0) for (let y = 26; y < 30; y++) put(160, y, PAPER)
  }
  return out
}
