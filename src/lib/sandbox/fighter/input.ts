import { BTN } from './types'

// KeyboardEvent.code -> bit. Two keys per action so left and right hands both work.
const KEY_BITS: Record<string, number> = {
  KeyA: BTN.LEFT,
  ArrowLeft: BTN.LEFT,
  KeyD: BTN.RIGHT,
  ArrowRight: BTN.RIGHT,
  KeyW: BTN.UP,
  ArrowUp: BTN.UP,
  KeyS: BTN.DOWN,
  ArrowDown: BTN.DOWN,
  KeyJ: BTN.PUNCH,
  KeyZ: BTN.PUNCH,
  KeyK: BTN.KICK,
  KeyX: BTN.KICK,
  KeyL: BTN.SPECIAL,
  KeyC: BTN.SPECIAL,
  Space: BTN.BLOCK,
  ShiftLeft: BTN.BLOCK,
}

export const GAME_KEYS: ReadonlySet<string> = new Set(Object.keys(KEY_BITS))

export function keysToInput(down: ReadonlySet<string>): number {
  let bits = 0
  for (const k of down) bits |= KEY_BITS[k] ?? 0
  return bits
}

const DEAD_ZONE = 14

// Drag vector from the d-pad anchor (screen coords, y grows downward) to direction bits.
// A small off-axis component is dropped so a sideways drag does not flick up or down.
export function dpadDirs(dx: number, dy: number, dead = DEAD_ZONE): number {
  if (Math.hypot(dx, dy) < dead) return 0
  const big = Math.max(Math.abs(dx), Math.abs(dy))
  const keep = (v: number) => Math.abs(v) >= 0.4 * big
  let bits = 0
  if (keep(dx)) bits |= dx < 0 ? BTN.LEFT : BTN.RIGHT
  if (keep(dy)) bits |= dy < 0 ? BTN.UP : BTN.DOWN
  return bits
}

// One d-pad pointer move. With no anchor (cleared by a resize while the thumb stayed down)
// the pointer re-anchors where it is, instead of leaving the d-pad dead until it is lifted.
export function dpadStep(
  anchor: { x: number; y: number } | undefined,
  x: number,
  y: number,
): { anchor: { x: number; y: number }; bits: number } {
  if (!anchor) return { anchor: { x, y }, bits: 0 }
  return { anchor, bits: dpadDirs(x - anchor.x, y - anchor.y) }
}

export type TouchState = { readonly held: Readonly<Record<number, number>> }
export type TouchEvent =
  | { type: 'set'; id: number; bits: number }
  | { type: 'end'; id: number }
  | { type: 'clear' }

export const EMPTY_TOUCH: TouchState = { held: {} }

export function touchReduce(s: TouchState, e: TouchEvent): TouchState {
  switch (e.type) {
    case 'set':
      return { held: { ...s.held, [e.id]: e.bits } }
    case 'end': {
      const { [e.id]: _gone, ...rest } = s.held
      void _gone
      return { held: rest }
    }
    case 'clear':
      return EMPTY_TOUCH
  }
}

export function touchToInput(s: TouchState): number {
  let bits = 0
  for (const v of Object.values(s.held)) bits |= v
  return bits
}

export const TOUCH_BUTTONS = [
  { label: 'Punch', bits: BTN.PUNCH },
  { label: 'Kick', bits: BTN.KICK },
  { label: 'Special', bits: BTN.SPECIAL },
  { label: 'Block', bits: BTN.BLOCK },
] as const

export type Hand = 'right' | 'left'
export function layoutFor(hand: Hand): { dpadSide: Hand; buttonSide: Hand } {
  return hand === 'right' ? { dpadSide: 'left', buttonSide: 'right' } : { dpadSide: 'right', buttonSide: 'left' }
}
