import { describe, expect, it } from 'vitest'
import { curationView, parseCurationLog, readIsWorthShowing } from './curationLog'

const EM = String.fromCharCode(0x2014)

const run = (over: Record<string, unknown> = {}) => ({
  date: '2026-11-06',
  songsIn: 772,
  shelves: [{ name: 'rotation', count: 40, artists: ['blink-182', 'Neck Deep'] }],
  otherPlaylists: 12,
  repeats: [{ artist: 'Neck Deep', track: 'Sorry' }],
  skipped: { count: 202, reasons: [{ reason: 'not followed', count: 202 }] },
  ...over,
})

const log = (over: Record<string, unknown> = {}) => ({
  asOf: '2026-11-12',
  rules: ['originals only'],
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

  it('keeps a well formed log', () => {
    const p = parseCurationLog(log())
    expect(p?.asOf).toBe('2026-11-12')
    expect(p?.runs).toHaveLength(1)
    expect(p?.runs[0].shelves[0].artists).toEqual(['blink-182', 'Neck Deep'])
    expect(p?.blurbs).toHaveLength(1)
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

  it('never lets an em-dash through: strings carrying one are dropped', () => {
    const p = parseCurationLog(
      log({
        rules: ['fine', `bad ${EM} rule`],
        blurbs: [{ artist: 'A', text: `x ${EM} y`, source: 'https://x.test' }],
      }),
    )
    expect(p?.rules).toEqual(['fine'])
    expect(p?.blurbs).toHaveLength(0)
  })

  it('sorts runs newest first', () => {
    const p = parseCurationLog(log({ runs: [run({ date: '2026-11-01' }), run({ date: '2026-11-06' })] }))
    expect(p?.runs.map((r) => r.date)).toEqual(['2026-11-06', '2026-11-01'])
  })
})

describe('curationView', () => {
  it('is null with no log', () => {
    expect(curationView(null)).toBeNull()
  })

  it('builds an as-of label and per-run summary lines', () => {
    const v = curationView(parseCurationLog(log()))!
    expect(v.asOf).toBe('as of 12 nov 2026')
    expect(v.runs[0].heading).toBe('6 nov 2026')
    expect(v.runs[0].summary).toBe('772 songs in. 40 to rotation, 12 to other playlists. 202 skipped.')
  })

  it('caps the summary at the 5 biggest shelves and counts the rest', () => {
    const shelves = Array.from({ length: 8 }, (_, i) => ({ name: `s${i}`, count: 10 - i, artists: [] }))
    const v = curationView(parseCurationLog(log({ runs: [run({ shelves, otherPlaylists: 0, skipped: { count: 0, reasons: [] } })] })))!
    expect(v.runs[0].summary).toBe('772 songs in. 10 to s0, 9 to s1, 8 to s2, 7 to s3, 6 to s4, and 3 more playlists.')
    expect(v.runs[0].shelves).toHaveLength(8)
  })

  it('omits the skipped clause when nothing was skipped', () => {
    const v = curationView(parseCurationLog(log({ runs: [run({ skipped: { count: 0, reasons: [] } })] })))!
    expect(v.runs[0].summary).not.toContain('skipped')
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
