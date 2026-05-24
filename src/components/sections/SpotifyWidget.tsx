'use client'

import { useEffect, useState } from 'react'
import { SpotifyTrack } from '@/types'

export default function SpotifyWidget() {
  const [track, setTrack] = useState<SpotifyTrack | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrack() {
      try {
        const res = await fetch('/api/spotify/now-playing')
        const data = await res.json()
        setTrack(data)
      } catch {
        setTrack(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTrack()
    const interval = setInterval(fetchTrack, 30_000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !track) {
    return (
      <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
        ♫ not playing
      </p>
    )
  }

  return (
    <a
      href={track.track_url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs transition-opacity hover:opacity-70"
      style={{ color: 'var(--muted)' }}
    >
      ♫ {track.title} — {track.artist}
    </a>
  )
}
