// Pixel data as readable rows. '.' transparent, 'i' ink, 'p' paper, 'v' vermilion.
export type Sprite = { w: number; h: number; rows: string[] }

export const PALETTE: Record<string, string> = {
  i: '#1a1a1a',
  p: '#ece7de',
  v: '#e84c28',
}

export type AnimName = 'idle' | 'walk' | 'punch' | 'kick' | 'special' | 'hit' | 'block' | 'jump' | 'ko'
export const ANIM_NAMES: readonly AnimName[] = ['idle', 'walk', 'punch', 'kick', 'special', 'hit', 'block', 'jump', 'ko']

export type FighterArt = {
  head: Sprite // 24x24
  frames: Record<AnimName, Sprite[]> // 80x80 each, facing right, feet on the last row
  smear: Sprite // 80x80 strike streak, drawn on active frames
}

// 0 transparent, 1 ink, 2 paper, 3 vermilion
export function pixelsOf(s: Sprite): Uint8Array {
  const out = new Uint8Array(s.w * s.h)
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const c = s.rows[y][x]
      out[y * s.w + x] = c === 'i' ? 1 : c === 'p' ? 2 : c === 'v' ? 3 : 0
    }
  }
  return out
}
