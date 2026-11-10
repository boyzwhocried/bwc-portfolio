import type { Hand } from './input'
import type { CpuLevel } from './cpu'

export type Settings = { hand: Hand; cpu: CpuLevel; tutorialSeen: boolean }
export type StorageLike = { getItem(k: string): string | null; setItem(k: string, v: string): void }

export const DEFAULT_SETTINGS: Settings = { hand: 'right', cpu: 'easy', tutorialSeen: false }
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
