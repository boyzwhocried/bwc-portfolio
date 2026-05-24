'use client'

import { useEffect, useRef, useState } from 'react'
import { SpotifyTrack } from '@/types'

const POLL_PLAYING = 30_000
const POLL_IDLE = 120_000

export default function SpotifyWidget() {
  const [track, setTrack] = useState<SpotifyTrack | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function scheduleNext(isPlaying: boolean) {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const delay = isPlaying ? POLL_PLAYING : POLL_IDLE
    intervalRef.current = setInterval(fetchTrack, delay)
  }

  async function fetchTrack() {
    if (document.hidden) return
    try {
      const res = await fetch('/api/spotify/now-playing')
      if (res.status === 429) return
      const data: SpotifyTrack | null = await res.json()
      setTrack(data)
      scheduleNext(!!data?.is_playing)
    } catch {
      setTrack(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrack()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (loading || !track) {
    return (
      <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
        not playing
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
      {track.is_playing ? '▶' : '■'} {track.title} — {track.artist}
    </a>
  )
}
