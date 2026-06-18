import { describe, it, expect } from 'vitest'
import { pickLines, MAX_PER_SONG } from './pick.mjs'

const lyrics = (arr) => arr.join('\n')

describe('pickLines (catchy)', () => {
  it('returns the repeated chorus line first (the hook is the catchiest)', () => {
    const text = lyrics([
      'the city lights were fading into gray',
      'i was made for loving you my dear',
      'we counted every reason to be afraid',
      'i was made for loving you my dear',
      'holding onto something we could not name',
      'i was made for loving you my dear',
    ])
    const out = pickLines(text, 'Gray Morning')
    expect(out[0]).toBe('i was made for loving you my dear')
  })

  it('prefers a title-containing line over a plain line when neither repeats', () => {
    const text = lyrics([
      'the tide came in and pulled us under',
      'we found love in a hopeless place',
    ])
    const out = pickLines(text, 'Hopeless Place')
    expect(out[0]).toBe('we found love in a hopeless place')
  })

  it('skips section markers, bracketed ad-libs and lines with digits', () => {
    const text = lyrics([
      '[Chorus]',
      'i got 99 problems but a glitch aint one',
      '(oh oh oh)',
      'the velvet morning broke across the sky',
    ])
    const out = pickLines(text, 'Velvet')
    expect(out).toContain('the velvet morning broke across the sky')
    expect(out.some((l) => l.includes('99'))).toBe(false)
    expect(out.some((l) => l.includes('['))).toBe(false)
  })

  it('returns at most MAX_PER_SONG lines and dedupes a repeated line', () => {
    const text = lyrics([
      'the harbour glowed beneath a copper moon',
      'the harbour glowed beneath a copper moon',
      'she traced a map across the kitchen floor',
      'we drove until the radio gave out',
      'a lantern swayed against the harbour wind',
      'the quiet broke the moment that you spoke',
    ])
    const out = pickLines(text, 'Copper Moon')
    expect(out.length).toBeLessThanOrEqual(MAX_PER_SONG)
    // the repeated line appears once, not twice
    expect(out.filter((l) => l === 'the harbour glowed beneath a copper moon').length).toBe(1)
  })

  it('returns [] for empty or missing lyrics', () => {
    expect(pickLines('', 'x')).toEqual([])
    expect(pickLines(null, 'x')).toEqual([])
  })
})
