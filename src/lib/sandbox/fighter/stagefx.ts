import { FLOOR_Y } from './art/stage-forest'

// Animated layer over the baked forest stage: flickering flames at the trunk bases and rising
// embers. Pure and deterministic (a function of the sim frame only), so it never touches the sim
// and loops every PERIOD frames. Three colors only.

export type StagePixel = { x: number; y: number; color: string }

const INK = '#1a1a1a'
const PAPER = '#ece7de'
const VERM = '#e84c28'

export const PERIOD = 240
// Same x positions as the baked fire in scripts/fighter-art/build.py.
export const FIRE_BASES: readonly number[] = [30, 84, 124, 176, 208, 262, 300, 12, 302]

function hash(a: number, b: number): number {
  let h = Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 7, 0x85ebca6b)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 13
  return h >>> 0
}

function inside(x: number, y: number): boolean {
  return x >= 0 && x < 320 && y >= 0 && y < FLOOR_Y
}

export function stageFx(frame: number): StagePixel[] {
  const t = ((frame % PERIOD) + PERIOD) % PERIOD
  const tick = Math.floor(t / 4) // flame shape changes every 4 frames; 240 / 4 = 60 steps per loop
  const out: StagePixel[] = []
  const put = (x: number, y: number, color: string) => {
    if (inside(x, y)) out.push({ x, y, color })
  }

  FIRE_BASES.forEach((bx, i) => {
    for (let k = 0; k < 2; k++) {
      const h = hash(i * 2 + k, tick)
      const height = 6 + (h % 9)
      const fx = bx + (k === 0 ? -3 : 4) + ((h >>> 8) % 3) - 1
      for (let yy = 0; yy < height; yy++) {
        const half = Math.floor((height - yy) / 7)
        const color = yy >= height - 2 ? PAPER : VERM
        for (let x = fx - half; x <= fx + half; x++) put(x, FLOOR_Y - 1 - yy, color)
      }
      put(fx, FLOOR_Y - 1 - height, INK)
    }
  })

  // embers drift up and sway, one per base, each on its own phase
  FIRE_BASES.forEach((bx, i) => {
    const phase = (hash(i, 99) % PERIOD)
    const age = (t + phase) % PERIOD
    const y = FLOOR_Y - 6 - Math.floor(age * 0.45)
    const x = bx + Math.round(Math.sin((age / PERIOD) * Math.PI * 4 + i) * 4)
    put(x, y, age < PERIOD * 0.7 ? VERM : INK)
  })

  return out
}
