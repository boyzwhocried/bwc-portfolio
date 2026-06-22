import { describe, it, expect } from 'vitest'
import { firstLastAdded, eraSpan, decadeHistogram, type StatTrack } from './playlistStats'

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
