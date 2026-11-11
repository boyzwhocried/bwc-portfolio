import { describe, it, expect } from 'vitest'
import { mergeRecent } from './recentMerge'
import type { CachedTrack } from '@/types'

const t = (url: string, played_at: string, name = url): CachedTrack => ({
  name, artist: 'a', album: 'b', image: '', url, played_at,
})

describe('mergeRecent', () => {
  it('interleaves own log with spotify history, newest first', () => {
    const spotify = [t('s1', '2026-10-12T11:25:00Z')]
    const logged = [t('l1', '2026-10-12T13:30:00Z'), t('l2', '2026-10-12T12:00:00Z')]
    expect(mergeRecent(spotify, logged).map((x) => x.url)).toEqual(['l1', 'l2', 's1'])
  })

  it('dedupes by url keeping the newest play', () => {
    const spotify = [t('x', '2026-10-12T11:00:00Z', 'old')]
    const logged = [t('x', '2026-10-12T13:00:00Z', 'new')]
    const out = mergeRecent(spotify, logged)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('new')
  })

  it('caps the result', () => {
    const logged = Array.from({ length: 30 }, (_, i) =>
      t(`u${i}`, new Date(Date.UTC(2026, 9, 12, 0, i)).toISOString()),
    )
    expect(mergeRecent([], logged, 14)).toHaveLength(14)
  })

  it('tolerates empty inputs', () => {
    expect(mergeRecent([], [])).toEqual([])
  })
})
