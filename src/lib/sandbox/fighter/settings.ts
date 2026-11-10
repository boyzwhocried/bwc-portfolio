import type { Hand } from './input'
import type { CpuLevel } from './cpu'

export type Settings = { hand: Hand; cpu: CpuLevel; tutorialSeen: boolean; strip: boolean; matches: number }
export type StorageLike = { getItem(k: string): string | null; setItem(k: string, v: string): void }

export const DEFAULT_SETTINGS: Settings = { hand: 'right', cpu: 'easy', tutorialSeen: false, strip: true, matches: 0 }
export const STRIP_MATCHES = 3 // the controls strip shows for this many finished matches
const KEY = 'fighter:settings:v1'

// Reading window.localStorage can itself throw (blocked site data, private windows).
function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function loadSettings(storage: StorageLike | null = defaultStorage()): Settings {
  try {
    const raw = storage?.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const o = JSON.parse(raw) as Record<string, unknown>
    return {
      hand: o.hand === 'left' || o.hand === 'right' ? o.hand : DEFAULT_SETTINGS.hand,
      cpu: o.cpu === 'easy' || o.cpu === 'normal' ? o.cpu : DEFAULT_SETTINGS.cpu,
      tutorialSeen: typeof o.tutorialSeen === 'boolean' ? o.tutorialSeen : DEFAULT_SETTINGS.tutorialSeen,
      strip: typeof o.strip === 'boolean' ? o.strip : DEFAULT_SETTINGS.strip,
      matches: typeof o.matches === 'number' && Number.isInteger(o.matches) && o.matches >= 0 ? o.matches : DEFAULT_SETTINGS.matches,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: Settings, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(s))
  } catch {
    // storage is a convenience; the toy works without it
  }
}

export function stripVisible(s: Settings, touch: boolean): boolean {
  return !touch && s.strip && s.matches < STRIP_MATCHES
}

export function afterMatch(s: Settings): Settings {
  return { ...s, matches: s.matches + 1 }
}

// Turning the strip on again restarts its count so it actually shows.
export function withStrip(s: Settings, on: boolean): Settings {
  return on ? { ...s, strip: true, matches: 0 } : { ...s, strip: false }
}
