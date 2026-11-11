import { describe, it, expect } from 'vitest'
import type { CachedTrack } from '@/types'
import { buildObsessionLog, logIsWorthShowing, narrateLog, type ObsessionLogEntry, type TimelineEvent } from './obsessionLog'

const track = (name: string, artist: string, album: string): CachedTrack => ({
  name,
  artist,
  album,
  image: '',
  url: `u/${name}`,
})

// 7 of 10 tracks one album = clear obsession snapshot
const injuryDay = (n: number) => ({
  date: `2026-06-${String(n).padStart(2, '0')}`,
  tracks: [
    ...Array.from({ length: 7 }, (_, i) => track(`t${i}`, 'Static Dress', 'Injury Episode')),
    track('x1', 'Koyo', 'Barely Here'),
    track('x2', 'Bleachers', 'everyone'),
    track('x3', 'Dagny', 'Single'),
  ],
})

const tsunamiDay = (date: string) => ({
  date,
  tracks: [
    ...Array.from({ length: 6 }, (_, i) => track(`s${i}`, 'Spiritbox', 'Tsunami Sea')),
    track('y1', 'Koyo', 'Barely Here'),
    track('y2', 'Dagny', 'Single'),
  ],
})

const spreadDay = (date: string) => ({
  date,
  tracks: [
    track('a', 'A', 'A1'), track('b', 'B', 'B1'), track('c', 'C', 'C1'),
    track('d', 'D', 'D1'), track('e', 'E', 'E1'),
  ],
})

describe('buildObsessionLog', () => {
  it('produces one entry per month from the modal obsession of its snapshots', () => {
    const log = buildObsessionLog([
      tsunamiDay('2026-05-20'), tsunamiDay('2026-05-25'), spreadDay('2026-05-28'),
      injuryDay(5), injuryDay(8), injuryDay(12),
    ])
    expect(log).toHaveLength(2)
    expect(log[0]).toMatchObject({ month: '2026-05', subject: 'Tsunami Sea', artist: 'Spiritbox', kind: 'album' })
    expect(log[1]).toMatchObject({ month: '2026-06', subject: 'Injury Episode', artist: 'Static Dress', kind: 'album' })
  })

  it('marks an all-spread month as none', () => {
    const log = buildObsessionLog([spreadDay('2026-05-02'), spreadDay('2026-05-20')])
    expect(log).toHaveLength(1)
    expect(log[0].kind).toBe('none')
    expect(log[0].subject).toBeNull()
  })

  it('returns chronological months', () => {
    const log = buildObsessionLog([injuryDay(10), tsunamiDay('2026-04-15')])
    expect(log.map(e => e.month)).toEqual(['2026-04', '2026-06'])
  })

  it('is empty for no snapshots', () => {
    expect(buildObsessionLog([])).toEqual([])
  })
})

describe('logIsWorthShowing', () => {
  const e = (month: string, subject: string | null): ObsessionLogEntry =>
    ({ month, subject, artist: subject ? 'X' : null, kind: subject ? 'album' : 'none' })

  it('hides a single-month single-subject log (nothing to compare yet)', () => {
    expect(logIsWorthShowing([e('2026-06', 'Injury Episode')])).toBe(false)
  })

  it('shows once two months exist', () => {
    expect(logIsWorthShowing([e('2026-05', 'Tsunami Sea'), e('2026-06', 'Injury Episode')])).toBe(true)
  })

  it('hides an empty log', () => {
    expect(logIsWorthShowing([])).toBe(false)
  })
})

describe('narrateLog', () => {
  const album = (month: string, subject: string, artist: string): ObsessionLogEntry =>
    ({ month, subject, artist, kind: 'album' })
  const artist = (month: string, name: string): ObsessionLogEntry =>
    ({ month, subject: name, artist: name, kind: 'artist' })
  const none = (month: string): ObsessionLogEntry =>
    ({ month, subject: null, artist: null, kind: 'none' })

  it('is empty for an empty log', () => {
    expect(narrateLog([])).toEqual([])
  })

  it('marks a first appearance and a second-month streak differently', () => {
    const lines = narrateLog([
      album('2026-05', 'Tsunami Sea', 'Spiritbox'),
      album('2026-06', 'Tsunami Sea', 'Spiritbox'),
    ])
    expect(lines).toHaveLength(2)
    expect(lines[0].text).not.toEqual(lines[1].text)
    expect(lines[1].text.toLowerCase()).toMatch(/second month|two months|still/)
  })

  it('gives a long streak (3+) different phrasing than a fresh 2-month streak', () => {
    const lines = narrateLog([
      album('2026-04', 'Tsunami Sea', 'Spiritbox'),
      album('2026-05', 'Tsunami Sea', 'Spiritbox'),
      album('2026-06', 'Tsunami Sea', 'Spiritbox'),
    ])
    expect(lines[1].text).not.toEqual(lines[2].text)
  })

  it('marks a subject change from the prior month distinctly from a repeat', () => {
    const lines = narrateLog([
      artist('2026-05', 'Koyo'),
      album('2026-06', 'Tsunami Sea', 'Spiritbox'),
    ])
    expect(lines[1].text).toContain('Tsunami Sea')
    expect(lines[1].text).not.toContain('Koyo')
  })

  it('handles a none month without crashing and without inventing a subject', () => {
    const lines = narrateLog([album('2026-05', 'Tsunami Sea', 'Spiritbox'), none('2026-06')])
    expect(lines[1].text).not.toMatch(/null|undefined/)
  })

  it('varies none-month phrasing across two consecutive none months', () => {
    const lines = narrateLog([none('2026-05'), none('2026-06')])
    expect(lines[0].text).not.toEqual(lines[1].text)
  })

  it('appends timeline context only for the matching month', () => {
    const events: TimelineEvent[] = [{ month: '2026-06', label: 'he shipped the personal os wiki' }]
    const lines = narrateLog([album('2026-05', 'Tsunami Sea', 'Spiritbox'), album('2026-06', 'Injury Episode', 'Static Dress')], events)
    expect(lines[0].text).not.toContain('shipped')
    expect(lines[1].text).toContain('he shipped the personal os wiki')
  })

  it('never emits an em-dash', () => {
    const events: TimelineEvent[] = [{ month: '2026-06', label: 'he shipped the personal os wiki' }]
    const lines = narrateLog(
      [none('2026-04'), artist('2026-05', 'Koyo'), album('2026-06', 'Tsunami Sea', 'Spiritbox')],
      events,
    )
    for (const l of lines) expect(l.text).not.toContain('—')
  })
})
