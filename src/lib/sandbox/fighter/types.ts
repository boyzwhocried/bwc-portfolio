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

export type MoveKind = 'punch' | 'kick' | 'special' | 'crouchPunch' | 'jumpKick'

// Hitbox in pixels: x = near-edge offset in front of the fighter's center,
// y = bottom edge above the floor, w/h = size.
export type MoveDef = {
  kind: MoveKind
  startup: number
  active: number
  recovery: number
  damage: number
  hitstun: number
  blockstun: number
  knockback: number // world units
  hitstop: number // frames both fighters freeze on contact
  hitbox: { x: number; y: number; w: number; h: number }
  advance?: number // world units per frame the attacker moves forward during active frames
  armor?: boolean // from its first frame until its active frames end, absorbs every hit at half damage without being interrupted
  mark?: boolean // a hit that is not blocked puts the BUGGED mark on the defender; the next unblocked hit on a marked fighter does extra damage
}

export type FighterDef = {
  id: string
  label: string
  hp: number
  walkSpeed: number // world units per frame
  jumpVelocity: number // world units per frame, upward
  moves: Record<MoveKind, MoveDef>
  reshuffle?: number // frames between phone rings; odd rings swap this fighter for an identical replacement (arcade Ruang Kurs), even rings only rotate the chairs
  revive?: number // the first KO of each round is voided: back up with this much hp (arcade Stempel Ulang)
}

export type Action = 'idle' | 'walk' | 'jump' | 'block' | 'attack' | 'hitstun' | 'blockstun' | 'ko' | 'crouch'
// New entries go at the end: the state hash uses the index.
export const ACTIONS: readonly Action[] = ['idle', 'walk', 'jump', 'block', 'attack', 'hitstun', 'blockstun', 'ko', 'crouch']
export const MOVE_KINDS: readonly MoveKind[] = ['punch', 'kick', 'special', 'crouchPunch', 'jumpKick']

export type FighterState = {
  x: number // world units (1 px = 256 units), center of the fighter
  y: number // world units above the floor, 0 = grounded
  vx: number
  vy: number
  facing: 1 | -1
  hp: number
  action: Action
  move: MoveKind | null
  actionFrame: number // frames since the current attack began
  stun: number // frames of hitstun/blockstun left
  hitConnected: boolean // current swing already hit
  buffered: MoveKind | null // attack pressed during hitstop; used on the first step after the freeze, dropped if it cannot be used then
  held: number // attack buttons that were down on the previous step; only a new press attacks
  revived: boolean // the one revive of this round is spent
  bugged: boolean // carries the BUGGED mark until the next unblocked hit or the end of the round
}

export type Phase = 'intro' | 'fight' | 'ko' | 'roundEnd' | 'matchEnd'
export const PHASES: readonly Phase[] = ['intro', 'fight', 'ko', 'roundEnd', 'matchEnd']

export type MatchState = {
  frame: number
  seed: number
  hitstop: number // frames left in the shared freeze
  phase: Phase
  phaseFrame: number // frames spent in the current phase
  introFrames: number // intro length for every round; 0 skips intros
  roundTimer: number // frames left in the round
  wins: [number, number]
  round: number // 1-based
  reshuffles: number // phone rings so far this round
  fighters: [FighterState, FighterState]
  defs: [FighterDef, FighterDef]
}
