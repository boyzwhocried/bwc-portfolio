import { describe, it, expect } from 'vitest'
import type { CachedTrack } from '@/types'
import { buildObsessionLog, logIsWorthShowing, type ObsessionLogEntry } from './obsessionLog'

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
