import { describe, expect, it } from 'vitest'
import { curationView, parseCurationLog, readIsWorthShowing } from './curationLog'

const EM = String.fromCharCode(0x2014)

const run = (over: Record<string, unknown> = {}) => ({
  date: '2026-11-06',
  songsIn: 425,
  shelves: [
    { name: 'wander pt.2', count: 203, artists: ['Bassvictim'] },
    { name: 'thrust', count: 122, artists: [] },
    { name: 'beam', count: 88, artists: [] },
    { name: 'haze', count: 47, artists: [] },
  ],
  otherPlaylists: 0,
  artists: ['Bassvictim', 'Jessie Reyez', 'Good Charlotte'],
  cover: 'a loud week that needed somewhere to go.',
  picks: [{ artist: 'Neck Deep', track: 'Sorry', note: 'too loud for a car, play it anyway' }],
  skipped: { count: 202, reasons: [{ reason: 'not followed', count: 202 }] },
  ...over,
})

const log = (over: Record<string, unknown> = {}) => ({
  asOf: '2026-11-12',
  rules: ['originals only'],
  captions: [{ playlist: 'wander pt.2', text: 'songs for getting lost on purpose' }],
  runs: [run()],
  blurbs: [{ artist: 'Neck Deep', text: 'welsh pop punk.', source: 'https://example.com/a' }],
  ...over,
})

describe('parseCurationLog', () => {
  it('returns null for non-objects and logs without runs', () => {
    expect(parseCurationLog(null)).toBeNull()
    expect(parseCurationLog('x')).toBeNull()
    expect(parseCurationLog(log({ runs: [] }))).toBeNull()
  })

  it('keeps a well formed log, shelves biggest first', () => {
    const p = parseCurationLog(log({ runs: [run({ shelves: [{ name: 'a', count: 1, artists: [] }, { name: 'b', count: 9, artists: [] }] })] }))
    expect(p?.runs[0].shelves.map((s) => s.name)).toEqual(['b', 'a'])
    expect(p?.runs[0].picks[0].note).toBe('too loud for a car, play it anyway')
    expect(p?.captions).toHaveLength(1)
  })

  it('treats cover, picks, artists and captions as optional', () => {
    const r = run()
    delete (r as Record<string, unknown>).cover
    delete (r as Record<string, unknown>).picks
    delete (r as Record<string, unknown>).artists
    const p = parseCurationLog({ asOf: '2026-11-12', runs: [r] })
    expect(p?.runs[0].cover).toBeNull()
    expect(p?.runs[0].picks).toEqual([])
    expect(p?.runs[0].artists).toEqual([])
    expect(p?.captions).toEqual([])
  })

  it('drops a run with a bad date or negative counts', () => {
    const p = parseCurationLog(log({ runs: [run(), run({ date: 'nov 6' }), run({ songsIn: -1 })] }))
    expect(p?.runs).toHaveLength(1)
  })

  it('drops a blurb with no source, a non-http source, or over 280 chars', () => {
    const base = { artist: 'A', text: 'ok' }
    const p = parseCurationLog(
      log({
        blurbs: [
          { ...base },
          { ...base, source: 'javascript:alert(1)' },
          { ...base, source: 'https://x.test', text: 'a'.repeat(281) },
          { ...base, source: 'https://x.test' },
        ],
      }),
    )
    expect(p?.blurbs).toHaveLength(1)
  })

  it('drops a cover over 160 chars, a pick note over 120, a caption over 100', () => {
    const p = parseCurationLog(
      log({
        captions: [{ playlist: 'x', text: 'a'.repeat(101) }],
        runs: [run({ cover: 'a'.repeat(161), picks: [{ artist: 'A', track: 'T', note: 'a'.repeat(121) }] })],
      }),
    )
    expect(p?.runs[0].cover).toBeNull()
    expect(p?.runs[0].picks).toEqual([])
    expect(p?.captions).toEqual([])
  })

  it('never lets an em-dash through', () => {
    const p = parseCurationLog(
      log({
        rules: ['fine', `bad ${EM} rule`],
        captions: [{ playlist: 'x', text: `a ${EM} b` }],
        blurbs: [{ artist: 'A', text: `x ${EM} y`, source: 'https://x.test' }],
        runs: [run({ cover: `a ${EM} b` })],
      }),
    )
    expect(p?.rules).toEqual(['fine'])
    expect(p?.captions).toEqual([])
    expect(p?.blurbs).toHaveLength(0)
    expect(p?.runs[0].cover).toBeNull()
  })

  it('sorts runs newest first', () => {
    const p = parseCurationLog(log({ runs: [run({ date: '2026-11-01' }), run({ date: '2026-11-06' })] }))
    expect(p?.runs.map((r) => r.date)).toEqual(['2026-11-06', '2026-11-01'])
  })
})

const month = (over: Record<string, unknown> = {}) => ({
  month: '2026-11',
  asOf: '2026-11-12',
  closed: false,
  cover: 'stuck on one record because it matched the weather.',
  tracks: [
    { artist: 'FKA Rayne', track: 'Creature of fear', note: 'sad but it slaps' },
    { artist: 'Neck Deep', track: 'Sorry', note: null },
  ],
  artists: [{ name: 'FKA Rayne', note: 'whole month' }, { name: 'Neck Deep', note: null }],
  ...over,
})

describe('months (the on repeat stream)', () => {
  it('parses a month with his cover, track notes and artist notes', () => {
    const p = parseCurationLog(log({ months: [month()] }))
    expect(p?.months).toHaveLength(1)
    expect(p?.months[0].cover).toBe('stuck on one record because it matched the weather.')
    expect(p?.months[0].tracks[0]).toEqual({ artist: 'FKA Rayne', track: 'Creature of fear', note: 'sad but it slaps' })
    expect(p?.months[0].artists[1]).toEqual({ name: 'Neck Deep', note: null })
    expect(p?.months[0].closed).toBe(false)
  })

  it('has no months by default, and a log of only months is valid', () => {
    expect(parseCurationLog(log())?.months).toEqual([])
    const p = parseCurationLog({ asOf: '2026-11-12', runs: [], months: [month()] })
    expect(p?.runs).toEqual([])
    expect(p?.months).toHaveLength(1)
  })

  it('drops a month with a bad key or bad asOf, or with nothing in it', () => {
    const p = parseCurationLog(
      log({
        months: [month(), month({ month: '2026-13' }), month({ month: 'nov' }), month({ month: '2026-10', asOf: 'x' }), month({ month: '2026-09', cover: null, tracks: [], artists: [] })],
      }),
    )
    expect(p?.months.map((m) => m.month)).toEqual(['2026-11'])
  })

  it('caps tracks and artists at 5, notes at 120, cover at 160, and drops em-dashes', () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ artist: `a${i}`, track: `t${i}`, note: null }))
    const p = parseCurationLog(
      log({
        months: [
          month({
            cover: 'a'.repeat(161),
            tracks: [...many, { artist: 'X', track: 'Y', note: 'a'.repeat(121) }],
            artists: [{ name: 'A', note: `a ${EM} b` }, ...many.map((m) => ({ name: m.artist, note: null }))],
          }),
        ],
      }),
    )
    const m = p!.months[0]
    expect(m.cover).toBeNull()
    expect(m.tracks).toHaveLength(5)
    expect(m.artists).toHaveLength(5)
    expect(m.artists.some((a) => a.name === 'A')).toBe(false)
  })

  it('sorts months newest first and ignores the old nested run.onRepeat', () => {
    const p = parseCurationLog(log({ months: [month({ month: '2026-10' }), month()], runs: [run({ onRepeat: { tracks: [], artists: ['A'], note: 'x' } })] }))
    expect(p?.months.map((m) => m.month)).toEqual(['2026-11', '2026-10'])
    expect(p?.runs[0]).not.toHaveProperty('onRepeat')
  })
})

describe('onRepeatView', () => {
  it('leads with the newest month: so far while open, footnote from his top plays', () => {
    const v = curationView(parseCurationLog(log({ months: [month()] })))!
    expect(v.onRepeat?.latest.heading).toBe('november 2026')
    expect(v.onRepeat?.latest.soFar).toBe(true)
    expect(v.onRepeat?.latest.footnote).toBe('from my top plays, as of 12 nov')
    expect(v.onRepeat?.past).toEqual([])
  })

  it('a closed month is not "so far"; older months go to past', () => {
    const v = curationView(parseCurationLog(log({ months: [month({ month: '2026-10', closed: true, asOf: '2026-10-31' }), month()] })))!
    expect(v.onRepeat?.latest.month).toBe('2026-11')
    expect(v.onRepeat?.past.map((m) => [m.heading, m.soFar])).toEqual([['october 2026', false]])
    expect(v.onRepeat?.past[0].footnote).toBe('from my top plays, as of 31 oct')
  })

  it('is null with no months, and the curation issues still lead nothing extra', () => {
    expect(curationView(parseCurationLog(log()))!.onRepeat).toBeNull()
  })

  it('works with months only: no issue to show', () => {
    const v = curationView(parseCurationLog({ asOf: '2026-11-12', runs: [], months: [month()] }))!
    expect(v.latest).toBeNull()
    expect(v.past).toEqual([])
    expect(v.legend).toEqual([])
  })
})

describe('curationView', () => {
  it('is null with no log', () => {
    expect(curationView(null)).toBeNull()
  })

  it('leads with the newest issue: number, cover, artists, picks', () => {
    const v = curationView(parseCurationLog(log({ runs: [run({ date: '2026-11-01', cover: null }), run()] })))!
    expect(v.asOf).toBe('as of 12 nov 2026')
    expect(v.latest!.number).toBe(2)
    expect(v.latest!.heading).toBe('6 nov 2026')
    expect(v.latest!.cover).toBe('a loud week that needed somewhere to go.')
    expect(v.latest!.artistsLine).toBe('Bassvictim · Jessie Reyez · Good Charlotte')
    expect(v.latest!.picks).toHaveLength(1)
    expect(v.past.map((p) => p.number)).toEqual([1])
  })

  it('demotes the counts to a footnote with no playlist names', () => {
    const v = curationView(parseCurationLog(log()))!
    expect(v.latest!.footnote).toBe('425 songs in · 4 playlists · 202 skipped')
    expect(v.latest!.footnote).not.toContain('wander')
  })

  it('omits the skipped part of the footnote when nothing was skipped', () => {
    const v = curationView(parseCurationLog(log({ runs: [run({ skipped: { count: 0, reasons: [] } })] })))!
    expect(v.latest!.footnote).toBe('425 songs in · 4 playlists')
  })

  it('tags the latest issue with its 3 biggest playlists and a legend of their captions', () => {
    const v = curationView(
      parseCurationLog(
        log({
          captions: [
            { playlist: 'wander pt.2', text: 'songs for getting lost on purpose' },
            { playlist: 'haze', text: 'not in the top 3, no legend line' },
          ],
        }),
      ),
    )!
    expect(v.latest!.tags).toEqual(['wander pt.2', 'thrust', 'beam'])
    expect(v.legend).toEqual([{ playlist: 'wander pt.2', text: 'songs for getting lost on purpose' }])
  })

  it('has no artists line when the run lists none', () => {
    const v = curationView(parseCurationLog(log({ runs: [run({ artists: [] })] })))!
    expect(v.latest!.artistsLine).toBeNull()
  })
})

describe('readIsWorthShowing', () => {
  it('hides the read when nothing owns the month', () => {
    expect(readIsWorthShowing(null)).toBe(false)
    expect(readIsWorthShowing({ kind: 'none' } as never)).toBe(false)
  })
  it('shows it when something owns the month', () => {
    expect(readIsWorthShowing({ kind: 'album' } as never)).toBe(true)
    expect(readIsWorthShowing({ kind: 'artist' } as never)).toBe(true)
  })
})
