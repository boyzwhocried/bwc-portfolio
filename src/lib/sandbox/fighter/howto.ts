import { FIGHTERS, FIGHTER_IDS, type FighterId } from './roster'
import type { Hand } from './input'

export const HOWTO_KEYS: readonly { action: string; keys: string }[] = [
  { action: 'Walk', keys: 'A / D or arrows' },
  { action: 'Jump', keys: 'W or up arrow' },
  { action: 'Crouch', keys: 'S or down arrow' },
  { action: 'Punch', keys: 'J or Z' },
  { action: 'Kick', keys: 'K or X' },
  { action: 'Special', keys: 'L or C' },
  { action: 'Block', keys: 'Space or Shift' },
]

export const COMBO_LINE = 'Combos: once a punch or kick connects, press a stronger button: punch, kick, special.'

export const MOVES_LINE = 'Hold crouch and punch for a low poke. Press kick in the air for a dive kick.'

export const BUGGED_LINE = 'BUGGED is the red tag over a fighter the wire hit. Their next hit taken does 25% more.'

export const KEYS_LINE = 'A/D walk, W jump, S crouch, J punch, K kick, L special, Space block.'

const SPECIAL_BLURB: Record<FighterId, string> = {
  'si-penyadap': 'Press L: the wire flies far and leaves BUGGED. Next hit does 25% more.',
  'sang-ajudan': 'Guard step: a shield absorbs hits at half damage while he lunges.',
}

export function specialLines(): { label: string; text: string }[] {
  return FIGHTER_IDS.map((id) => ({ label: FIGHTERS[id].label, text: SPECIAL_BLURB[id] }))
}

// The d-pad side follows the handedness setting (see layoutFor in input.ts).
export function tutorialText(touch: boolean, hand: Hand): string {
  if (!touch) return KEYS_LINE
  return hand === 'right'
    ? 'Drag on the left to walk and jump. Right: punch, kick, special, block.'
    : 'Drag on the right to walk and jump. Left: punch, kick, special, block.'
}
