import { describe, it, expect } from 'vitest'
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type StorageLike } from './settings'

const mem = (init?: string): StorageLike & { data: Record<string, string> } => {
  const data: Record<string, string> = init === undefined ? {} : { 'fighter:settings:v1': init }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v
    },
  }
}
const throwing: StorageLike = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('full')
  },
}

describe('settings', () => {
  it('returns defaults when storage throws', () => {
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS)
  })

  it('returns defaults when there is no storage at all', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('ignores corrupt JSON', () => {
    expect(loadSettings(mem('{nope'))).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps valid fields and drops wrong-typed ones', () => {
    const s = loadSettings(mem(JSON.stringify({ hand: 'left', cpu: 'insane', tutorialSeen: 'yes' })))
    expect(s).toEqual({ hand: 'left', cpu: DEFAULT_SETTINGS.cpu, tutorialSeen: DEFAULT_SETTINGS.tutorialSeen })
  })

  it('round trips', () => {
    const st = mem()
    saveSettings({ hand: 'left', cpu: 'normal', tutorialSeen: true }, st)
    expect(loadSettings(st)).toEqual({ hand: 'left', cpu: 'normal', tutorialSeen: true })
  })

  it('saveSettings does not throw when storage is full or blocked', () => {
    expect(() => saveSettings(DEFAULT_SETTINGS, throwing)).not.toThrow()
    expect(() => saveSettings(DEFAULT_SETTINGS, null)).not.toThrow()
  })

  it('defaults match the spec: right hand, easy CPU, tutorial unseen', () => {
    expect(DEFAULT_SETTINGS).toEqual({ hand: 'right', cpu: 'easy', tutorialSeen: false })
  })
})
