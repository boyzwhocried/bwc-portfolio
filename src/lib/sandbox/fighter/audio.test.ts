import { describe, it, expect } from 'vitest'
import { soundsFor, toneScript, SOUND_NAMES } from './audio'
import type { FxEvent } from './fx'

const hit: FxEvent = { kind: 'hit', target: 1, x: 100, y: 30, damage: 35, ko: false }

describe('soundsFor', () => {
  it('a phone ring plays the ring, odd or even', () => {
    expect(soundsFor([{ kind: 'ring', swapped: true }])).toEqual(['ring'])
    expect(soundsFor([{ kind: 'ring', swapped: false }])).toEqual(['ring'])
  })

  it('a revive plays the revive stamp', () => {
    expect(soundsFor([{ kind: 'revive', target: 1, x: 120 }])).toEqual(['revive'])
  })

  it('hits, blocks and landings stay silent for now', () => {
    expect(soundsFor([hit, { ...hit, kind: 'block' }, { ...hit, kind: 'armor' }, { kind: 'land', target: 0, x: 50 }])).toEqual([])
  })

  it('plays each sound at most once per call and keeps event order', () => {
    const ev: FxEvent[] = [{ kind: 'revive', target: 1, x: 1 }, { kind: 'ring', swapped: true }, { kind: 'ring', swapped: false }, hit]
    expect(soundsFor(ev)).toEqual(['revive', 'ring'])
  })
})

describe('toneScript', () => {
  it('has a script for every sound name', () => {
    expect([...SOUND_NAMES].sort()).toEqual(['revive', 'ring'])
    for (const n of SOUND_NAMES) expect(toneScript(n).length).toBeGreaterThan(0)
  })

  it('every note is finite, positive, quiet and short', () => {
    for (const n of SOUND_NAMES) {
      const notes = toneScript(n)
      for (const t of notes) {
        expect(t.at).toBeGreaterThanOrEqual(0)
        expect(t.dur).toBeGreaterThan(0)
        expect(t.freq).toBeGreaterThan(20)
        expect(t.freq).toBeLessThan(4000)
        expect(t.gain).toBeGreaterThan(0)
        expect(t.gain).toBeLessThanOrEqual(0.25)
        expect(['sine', 'square', 'triangle', 'sawtooth']).toContain(t.wave)
      }
      expect(Math.max(...notes.map((t) => t.at + t.dur))).toBeLessThanOrEqual(1.6)
    }
  })

  it('the ring is a two-tone trill: four or more notes alternating two pitches', () => {
    const notes = toneScript('ring')
    expect(notes.length).toBeGreaterThanOrEqual(4)
    expect(new Set(notes.map((t) => t.freq)).size).toBe(2)
    for (let i = 1; i < notes.length; i++) expect(notes[i].freq).not.toBe(notes[i - 1].freq)
  })

  it('the revive is a low thump whose pitch only falls', () => {
    const notes = toneScript('revive')
    expect(notes[0].freq).toBeLessThan(200)
    for (let i = 1; i < notes.length; i++) expect(notes[i].freq).toBeLessThanOrEqual(notes[i - 1].freq)
  })
})
