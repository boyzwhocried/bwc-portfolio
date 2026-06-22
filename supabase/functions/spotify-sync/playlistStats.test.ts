import { describe, it, expect } from 'vitest'
import {
  firstLastAdded, eraSpan, decadeHistogram,
  topArtists, pickSampleTracks, anchorFallback, moodPalette,
  type StatTrack,
} from './playlistStats'

function t(over: Partial<StatTrack>): StatTrack {
  return { name: 'n', artist: 'a', album: 'al', image: '', url: '', addedAt: '', releaseYear: null, ...over }
}

describe('firstLastAdded', () => {
  it('returns nulls for an empty list', () => {
    expect(firstLastAdded([])).toEqual({ first: null, last: null })
  })
  it('returns min and max ISO added dates, ignoring blanks', () => {
    const r = firstLastAdded([
      t({ addedAt: '2025-03-10T00:00:00Z' }),
      t({ addedAt: '' }),
      t({ addedAt: '2025-06-01T00:00:00Z' }),
      t({ addedAt: '2025-01-02T00:00:00Z' }),
    ])
    expect(r).toEqual({ first: '2025-01-02T00:00:00Z', last: '2025-06-01T00:00:00Z' })
  })
})

describe('eraSpan', () => {
  it('returns nulls when no release years', () => {
    expect(eraSpan([t({ releaseYear: null })])).toEqual({ from: null, to: null })
  })
  it('returns min and max release year', () => {
    expect(eraSpan([t({ releaseYear: 2018 }), t({ releaseYear: 1998 }), t({ releaseYear: 2024 })]))
      .toEqual({ from: 1998, to: 2024 })
  })
})

describe('decadeHistogram', () => {
  it('buckets release years by decade, sorted ascending', () => {
    expect(decadeHistogram([
      t({ releaseYear: 1998 }), t({ releaseYear: 1995 }),
      t({ releaseYear: 2012 }), t({ releaseYear: 2024 }), t({ releaseYear: null }),
    ])).toEqual([
      { decade: 1990, count: 2 },
      { decade: 2010, count: 1 },
      { decade: 2020, count: 1 },
    ])
  })
  it('returns empty for no dated tracks', () => {
    expect(decadeHistogram([t({ releaseYear: null })])).toEqual([])
  })
})

describe('topArtists', () => {
  it('tallies primary artists, ranks by count then name, caps at n', () => {
    const r = topArtists([
      t({ artist: 'Deftones' }), t({ artist: 'Deftones' }), t({ artist: 'Korn' }),
      t({ artist: 'Sleep Token' }), t({ artist: 'Sleep Token' }), t({ artist: 'Sleep Token' }),
      t({ artist: '' }),
    ], 2)
    expect(r).toEqual([
      { name: 'Sleep Token', count: 3 },
      { name: 'Deftones', count: 2 },
    ])
  })
})

describe('pickSampleTracks', () => {
  it('takes the first n as SampleTrack shape', () => {
    const r = pickSampleTracks([
      t({ name: 'a', artist: 'x', image: 'i', url: 'u' }),
      t({ name: 'b' }), t({ name: 'c' }),
    ], 2)
    expect(r).toEqual([
      { name: 'a', artist: 'x', image: 'i', url: 'u' },
      { name: 'b', artist: 'a', image: '', url: '' },
    ])
  })
})

describe('anchorFallback', () => {
  it('returns null for an empty list', () => {
    expect(anchorFallback([])).toBeNull()
  })
  it('picks a track by the most-featured artist', () => {
    const r = anchorFallback([
      t({ name: 'one', artist: 'Korn' }),
      t({ name: 'two', artist: 'Sleep Token' }),
      t({ name: 'three', artist: 'Sleep Token' }),
    ])
    expect(r?.artist).toBe('Sleep Token')
    expect(r?.name).toBe('two')
  })
})

describe('moodPalette', () => {
  it('maps a known mood keyword to its preset swatches', () => {
    expect(moodPalette('restless and blue')).toEqual(['#1a2233', '#2a3a55', '#3a5577', '#5a7799'])
  })
  it('falls back to the default palette for an unknown mood', () => {
    expect(moodPalette('zzz')).toEqual(['#222', '#3a3a3a', '#555', '#777'])
  })
})
