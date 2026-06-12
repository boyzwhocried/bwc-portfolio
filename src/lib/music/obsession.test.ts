import { describe, it, expect } from 'vitest'
import type { CachedArtist, CachedTrack, MusicData } from '@/types'
import {
  primaryArtist,
  detectObsession,
  classifyOnset,
  findGateway,
  findSpine,
  findFading,
  moodShift,
  detectGrazing,
  buildObsessionReport,
  themesFor,
} from './obsession'

// ---- fixture helpers --------------------------------------------------------

const track = (name: string, artist: string, album: string): CachedTrack => ({
  name,
  artist,
  album,
  image: '',
  url: `https://open.spotify.com/track/${name.replace(/\s/g, '-')}`,
})

const artist = (name: string, genre?: string): CachedArtist => ({
  name,
  image: '',
  url: `https://open.spotify.com/artist/${name.replace(/\s/g, '-')}`,
  genre,
})

// A Static-Dress-shaped month: one album dominating short_term, absent from
// medium/long artists, one gateway track in medium tracks, two spine artists.
function fixture(): MusicData {
  const shortTracks = [
    track('hospice', 'Static Dress', 'Injury Episode'),
    track('dull blade', 'Static Dress', 'Injury Episode'),
    track('human props', 'Static Dress', 'Injury Episode'),
    track('adapter', 'Static Dress', 'Injury Episode'),
    track('farewell', 'Static Dress', 'Injury Episode'),
    track('death pose', 'Static Dress', 'Injury Episode'),
    track('treading', 'Static Dress', 'Injury Episode'),
    track('you hate me', 'Koyo', 'Barely Here'),
    track('we should talk', 'Bleachers', 'everyone'),
    track('faint', 'Linkin Park', 'Meteora'),
  ]
  const mediumTracks = [
    track('just the way', 'Milky', 'Single'),
    track('hospice', 'Static Dress', 'Injury Episode'), // the gateway
    track('shed', 'Title Fight', 'Shed'),
    track('take my head', 'Turnover', 'Peripheral Vision'),
  ]
  const longTracks = [
    track('your graduation', 'Modern Baseball', 'YGMIA'),
    track('take my head', 'Turnover', 'Peripheral Vision'),
  ]
  const shortArtists = [
    artist('Static Dress', 'shoegaze'),
    artist('The Smashing Pumpkins', 'alternative rock'),
    artist('Turnover', 'midwest emo'),
    artist('Deftones', 'nu metal'),
    artist('Linkin Park', 'nu metal'),
    artist('Koyo', 'post-hardcore'),
  ]
  const mediumArtists = [
    artist('The Story So Far', 'pop punk'),
    artist('Turnover', 'midwest emo'),
    artist('Deftones', 'nu metal'),
    artist('Title Fight', 'midwest emo'),
  ]
  const longArtists = [
    artist('blink-182', 'pop punk'),
    artist('Turnover', 'midwest emo'),
    artist('Deftones', 'nu metal'),
    artist('Clairo', 'bedroom pop'),
    artist('Pale Waves', 'pop punk'),
    artist('The Story So Far', 'pop punk'),
  ]
  const recent = [
    { ...track('hospice', 'Static Dress', 'Injury Episode'), played_at: '2026-06-12T11:58:00Z' },
    { ...track('dancer', 'The Band CAMINO', 'tryhard'), played_at: '2026-06-12T11:36:00Z' },
    { ...track('playlist', 'fakemink', 'mixtape'), played_at: '2026-06-12T11:33:00Z' },
    { ...track('ramona', 'TEEN BLUSH', 'EP'), played_at: '2026-06-12T11:19:00Z' },
    { ...track('rain', 'Dagny', 'Single'), played_at: '2026-06-12T10:56:00Z' },
    { ...track('stay with me', 'CASTLEBEAT', 'VHS'), played_at: '2026-06-12T11:04:00Z' },
  ]
  return {
    topTracks: { short_term: shortTracks, medium_term: mediumTracks, long_term: longTracks },
    topArtists: { short_term: shortArtists, medium_term: mediumArtists, long_term: longArtists },
    recentlyPlayed: recent,
    shelf: null,
    thisMonth: null,
    ofInsta: null,
    obsessionThemes: null,
    updatedAt: '2026-06-12T12:00:00Z',
  }
}

// ---- primaryArtist ----------------------------------------------------------

describe('primaryArtist', () => {
  it('takes the first name from a joined artist string', () => {
    expect(primaryArtist('Static Dress, Underoath')).toBe('Static Dress')
  })

  it('returns a plain single artist unchanged', () => {
    expect(primaryArtist('Turnover')).toBe('Turnover')
  })
})

// ---- detectObsession --------------------------------------------------------

describe('detectObsession', () => {
  it('detects an album obsession when one album dominates the short-term tracks', () => {
    const d = detectObsession(fixture().topTracks!.short_term)
    expect(d.kind).toBe('album')
    expect(d.subject).toBe('Injury Episode')
    expect(d.artist).toBe('Static Dress')
    expect(d.count).toBe(7)
    expect(d.total).toBe(10)
  })

  it('detects an artist obsession when one artist dominates across different albums', () => {
    const tracks = [
      track('a', 'Spiritbox', 'Tsunami Sea'),
      track('b', 'Spiritbox', 'Eternal Blue'),
      track('c', 'Spiritbox', 'Rotoscope'),
      track('d', 'Spiritbox', 'The Fear of Fear'),
      track('e', 'Koyo', 'Barely Here'),
      track('f', 'Bleachers', 'everyone'),
      track('g', 'Dagny', 'Single'),
      track('h', 'Milky', 'Single'),
    ]
    const d = detectObsession(tracks)
    expect(d.kind).toBe('artist')
    expect(d.subject).toBe('Spiritbox')
    expect(d.count).toBe(4)
  })

  it('reports none when the rotation is spread wide', () => {
    const tracks = [
      track('a', 'A', 'A1'),
      track('b', 'B', 'B1'),
      track('c', 'C', 'C1'),
      track('d', 'D', 'D1'),
      track('e', 'E', 'E1'),
      track('f', 'F', 'F1'),
    ]
    expect(detectObsession(tracks).kind).toBe('none')
  })
})

// ---- classifyOnset ----------------------------------------------------------

describe('classifyOnset', () => {
  it('classifies new when the artist is absent from medium and long ranges', () => {
    const ta = fixture().topArtists!
    expect(classifyOnset('Static Dress', ta)).toBe('new')
  })

  it('classifies building when present in medium but absent from long', () => {
    const ta = fixture().topArtists!
    expect(classifyOnset('Title Fight', ta)).toBe('building')
  })

  it('classifies long-running when present in all ranges', () => {
    const ta = fixture().topArtists!
    expect(classifyOnset('Turnover', ta)).toBe('long-running')
  })
})

// ---- findGateway ------------------------------------------------------------

describe('findGateway', () => {
  it('finds the medium-term track by the obsession artist (the way in)', () => {
    const m = fixture()
    expect(findGateway('Static Dress', m.topTracks!.medium_term)).toBe('hospice')
  })

  it('returns null when the artist has no medium-term track', () => {
    const m = fixture()
    expect(findGateway('Koyo', m.topTracks!.medium_term)).toBeNull()
  })
})

// ---- findSpine / findFading -------------------------------------------------

describe('findSpine', () => {
  it('returns artists present in all three ranges', () => {
    const spine = findSpine(fixture().topArtists!)
    expect(spine).toContain('Turnover')
    expect(spine).toContain('Deftones')
    expect(spine).not.toContain('Static Dress')
  })
})

describe('findFading', () => {
  it('flags an artist high in medium but absent from short', () => {
    const fading = findFading(fixture().topArtists!)
    expect(fading).toContain('The Story So Far')
    expect(fading).not.toContain('Turnover')
  })
})

// ---- moodShift ----------------------------------------------------------------

describe('moodShift', () => {
  it('reads heavier when short-term genres outweigh the long-term baseline', () => {
    const ta = {
      short_term: [
        artist('A', 'metalcore'),
        artist('B', 'post-hardcore'),
        artist('C', 'nu metal'),
        artist('D', 'screamo'),
      ],
      medium_term: [],
      long_term: [
        artist('E', 'pop punk'),
        artist('F', 'bedroom pop'),
        artist('G', 'indie'),
        artist('H', 'dream pop'),
      ],
    }
    expect(moodShift(ta)).toBe('heavier')
  })

  it('reads lighter in the reverse direction', () => {
    const ta = {
      short_term: [
        artist('E', 'bedroom pop'),
        artist('F', 'dream pop'),
        artist('G', 'indie'),
      ],
      medium_term: [],
      long_term: [
        artist('A', 'metalcore'),
        artist('B', 'nu metal'),
        artist('C', 'screamo'),
      ],
    }
    expect(moodShift(ta)).toBe('lighter')
  })

  it('stays steady when genres are unknown (no guessing)', () => {
    const ta = {
      short_term: [artist('A', 'zydeco'), artist('B')],
      medium_term: [],
      long_term: [artist('C', 'klezmer'), artist('D')],
    }
    expect(moodShift(ta)).toBe('steady')
  })
})

// ---- detectGrazing ------------------------------------------------------------

describe('detectGrazing', () => {
  it('detects a second passive stream when most recent plays are outside the top rotation', () => {
    const m = fixture()
    expect(detectGrazing(m.recentlyPlayed!, m.topArtists!.short_term)).toBe(true)
  })

  it('reports false when recent plays mirror the top rotation', () => {
    const recent = [
      { ...track('a', 'Static Dress', 'Injury Episode'), played_at: '' },
      { ...track('b', 'Turnover', 'Peripheral Vision'), played_at: '' },
      { ...track('c', 'Deftones', 'private music'), played_at: '' },
    ]
    expect(detectGrazing(recent, fixture().topArtists!.short_term)).toBe(false)
  })
})

// ---- buildObsessionReport -----------------------------------------------------

describe('buildObsessionReport', () => {
  it('returns null when there is no short-term data', () => {
    const empty: MusicData = {
      topTracks: null,
      topArtists: null,
      recentlyPlayed: null,
      shelf: null,
      thisMonth: null,
      ofInsta: null,
      obsessionThemes: null,
      updatedAt: null,
    }
    expect(buildObsessionReport(empty)).toBeNull()
  })

  it('builds the full report for an album obsession month', () => {
    const r = buildObsessionReport(fixture())!
    expect(r.kind).toBe('album')
    expect(r.subject).toBe('Injury Episode')
    expect(r.artist).toBe('Static Dress')
    expect(r.sharePct).toBe(70)
    expect(r.onset).toBe('new')
    expect(r.gatewayTrack).toBe('hospice')
    expect(r.spine).toContain('Turnover')
    expect(r.fading).toContain('The Story So Far')
    expect(r.grazing).toBe(true)
    expect(r.stillActive).toBe(true)
    expect(r.titles.length).toBeGreaterThan(3)
    expect(r.titles).toContain('hospice')
    expect(r.headline.length).toBeGreaterThan(0)
    expect(r.placard.length).toBeGreaterThanOrEqual(3)
    expect(r.placard.join(' ')).toContain('70%')
    expect(r.paragraphs.length).toBeGreaterThanOrEqual(2)
    expect(r.paragraphs[0]).toContain('Injury Episode')
    expect(r.paragraphs[0]).toContain('70%')
  })

  it('still reports spine and mood when no single obsession exists', () => {
    const m = fixture()
    m.topTracks!.short_term = [
      track('a', 'A', 'A1'),
      track('b', 'B', 'B1'),
      track('c', 'C', 'C1'),
      track('d', 'D', 'D1'),
      track('e', 'E', 'E1'),
      track('f', 'F', 'F1'),
    ]
    const r = buildObsessionReport(m)!
    expect(r.kind).toBe('none')
    expect(r.subject).toBeNull()
    expect(r.spine).toContain('Turnover')
    expect(r.paragraphs.length).toBeGreaterThanOrEqual(1)
  })

  it('never emits an em-dash anywhere in generated text', () => {
    const r = buildObsessionReport(fixture())!
    expect(JSON.stringify(r)).not.toContain('—')
  })

  it('speaks about the listener in third person, not second', () => {
    const r = buildObsessionReport(fixture())!
    const text = r.paragraphs.join(' ')
    expect(text).toMatch(/\bhe\b|\bhis\b/)
    expect(text).not.toMatch(/\byou\b|\byour\b/)
  })
})

// ---- themesFor ----------------------------------------------------------------

describe('themesFor', () => {
  const themes = { subject: 'Injury Episode', artist: 'Static Dress', themes: ['grief', 'dissociation', 'nostalgia'] }

  it('returns tags when the cached subject matches the live detection', () => {
    const r = buildObsessionReport(fixture())!
    expect(themesFor(r, themes)).toEqual(['grief', 'dissociation', 'nostalgia'])
  })

  it('returns null when the cached subject is stale (obsession moved on)', () => {
    const r = buildObsessionReport(fixture())!
    expect(themesFor(r, { ...themes, subject: 'Tsunami Sea' })).toBeNull()
  })

  it('returns null without a report or without cached themes', () => {
    expect(themesFor(null, themes)).toBeNull()
    expect(themesFor(buildObsessionReport(fixture()), null)).toBeNull()
  })

  it('returns null for a none-kind report', () => {
    const m = fixture()
    m.topTracks!.short_term = [
      track('a', 'A', 'A1'), track('b', 'B', 'B1'), track('c', 'C', 'C1'),
      track('d', 'D', 'D1'), track('e', 'E', 'E1'), track('f', 'F', 'F1'),
    ]
    expect(themesFor(buildObsessionReport(m), themes)).toBeNull()
  })
})
