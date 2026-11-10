import { describe, it, expect } from 'vitest'
import { loadSettings, saveSettings, DEFAULT_SETTINGS, STRIP_MATCHES, stripVisible, afterMatch, withStrip, type StorageLike } from './settings'

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
    expect(s).toEqual({ ...DEFAULT_SETTINGS, hand: 'left' })
  })

  it('round trips', () => {
    const st = mem()
    const v = { hand: 'left', cpu: 'normal', tutorialSeen: true, strip: false, matches: 2 } as const
    saveSettings(v, st)
    expect(loadSettings(st)).toEqual(v)
  })

  it('saveSettings does not throw when storage is full or blocked', () => {
    expect(() => saveSettings(DEFAULT_SETTINGS, throwing)).not.toThrow()
    expect(() => saveSettings(DEFAULT_SETTINGS, null)).not.toThrow()
  })

  it('defaults match the spec: right hand, easy CPU, tutorial unseen', () => {
    expect(DEFAULT_SETTINGS).toEqual({ hand: 'right', cpu: 'easy', tutorialSeen: false, strip: true, matches: 0 })
  })

  it('old saved settings without the strip fields load with the defaults', () => {
    const s = loadSettings(mem(JSON.stringify({ hand: 'left', cpu: 'normal', tutorialSeen: true })))
    expect(s.strip).toBe(true)
    expect(s.matches).toBe(0)
  })

  it('drops a bad match count', () => {
    for (const bad of [-1, 1.5, 'x', null]) expect(loadSettings(mem(JSON.stringify({ matches: bad }))).matches).toBe(0)
  })
})

describe('controls strip', () => {
  const S = DEFAULT_SETTINGS
  it('shows on desktop for the first few matches only', () => {
    expect(stripVisible(S, false)).toBe(true)
    expect(stripVisible({ ...S, matches: STRIP_MATCHES - 1 }, false)).toBe(true)
    expect(stripVisible({ ...S, matches: STRIP_MATCHES }, false)).toBe(false)
  })

  it('never shows on touch devices, and not when switched off', () => {
    expect(stripVisible(S, true)).toBe(false)
    expect(stripVisible({ ...S, strip: false }, false)).toBe(false)
  })

  it('a finished match counts toward the limit', () => {
    expect(afterMatch(S).matches).toBe(1)
    expect(afterMatch({ ...S, matches: 7 }).matches).toBe(8)
  })

  it('switching it back on resets the count so it shows again', () => {
    const spent = { ...S, matches: 9, strip: false }
    const on = withStrip(spent, true)
    expect(on.strip).toBe(true)
    expect(stripVisible(on, false)).toBe(true)
    expect(withStrip(S, false).strip).toBe(false)
  })
})
