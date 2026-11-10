// Input bitmask, one number per player per frame.
export const BTN = {
  LEFT: 1,
  RIGHT: 2,
  UP: 4,
  DOWN: 8,
  PUNCH: 16,
  KICK: 32,
  SPECIAL: 64,
  BLOCK: 128,
} as const

export type Inputs = [number, number]

export type FighterDef = {
  id: string
  label: string
  hp: number
  walkSpeed: number // world units per frame
  jumpVelocity: number // world units per frame, upward
}

export type FighterState = {
  x: number // world units (1 px = 256 units), center of the fighter
  y: number // world units above the floor, 0 = grounded
  vx: number
  vy: number
  facing: 1 | -1
  hp: number
}

export type MatchState = {
  frame: number
  seed: number
  fighters: [FighterState, FighterState]
  defs: [FighterDef, FighterDef]
}
