import { describe, expect, it, vi } from 'vitest'
import { planPublish, runPublish } from './publishCuration'

const good = () => ({
  asOf: '2026-11-12',
  rules: ['originals only'],
  runs: [
    {
      date: '2026-11-06',
      songsIn: 10,
      shelves: [{ name: 'rotation', count: 5, artists: ['Neck Deep'] }],
      otherPlaylists: 5,
      repeats: [],
      skipped: { count: 0, reasons: [] },
    },
  ],
  blurbs: [],
})

describe('planPublish', () => {
  it('accepts a clean file and reports a summary', () => {
    const p = planPublish(good())
    expect(p.errors).toEqual([])
    expect(p.payload?.runs).toHaveLength(1)
    expect(p.summary).toBe('1 run, 0 blurbs, as of 2026-11-12')
  })

  it('is strict: anything the page parser would silently drop is an error', () => {
    const bad = good()
    bad.blurbs = [{ artist: 'A', text: 'no source' }] as never
    bad.rules = ['ok', `x ${String.fromCharCode(0x2014)} y`]
    const p = planPublish(bad)
    expect(p.payload).toBeNull()
    expect(p.errors.join(' ')).toMatch(/blurb/)
    expect(p.errors.join(' ')).toMatch(/rule/)
  })

  it('rejects a too-long cover, pick note or caption instead of trimming it', () => {
    const bad = good() as Record<string, unknown>
    ;(bad.runs as Record<string, unknown>[])[0].cover = 'a'.repeat(161)
    ;(bad.runs as Record<string, unknown>[])[0].picks = [{ artist: 'A', track: 'T', note: 'a'.repeat(121) }]
    bad.captions = [{ playlist: 'x', text: 'a'.repeat(101) }]
    const p = planPublish(bad)
    expect(p.payload).toBeNull()
    expect(p.errors.join(' ')).toMatch(/cover/)
    expect(p.errors.join(' ')).toMatch(/pick/)
    expect(p.errors.join(' ')).toMatch(/caption/)
  })

  it('errors on a file with no valid run', () => {
    expect(planPublish({ asOf: '2026-11-12', runs: [] }).errors.length).toBeGreaterThan(0)
  })
})

describe('runPublish', () => {
  it('defaults to a dry run and never writes', async () => {
    const upsert = vi.fn()
    const r = await runPublish(good(), { yes: false, upsert })
    expect(r.wrote).toBe(false)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('writes the curation_log key only with yes', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined)
    const r = await runPublish(good(), { yes: true, upsert })
    expect(r.wrote).toBe(true)
    expect(upsert).toHaveBeenCalledOnce()
    expect(upsert.mock.calls[0][0]).toMatchObject({ key: 'curation_log' })
  })

  it('refuses to write an invalid file even with yes', async () => {
    const upsert = vi.fn()
    await expect(runPublish({ asOf: 'bad' }, { yes: true, upsert })).rejects.toThrow(/invalid/)
    expect(upsert).not.toHaveBeenCalled()
  })
})
