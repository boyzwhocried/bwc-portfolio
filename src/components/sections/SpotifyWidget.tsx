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
    <>
      <style>{`
        @keyframes barPulse {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        .bar { transform-origin: bottom; display: inline-block; width: 2px; background: currentColor; margin: 0 1px; }
        .bar-1 { height: 8px; animation: barPulse 0.8s ease-in-out infinite; }
        .bar-2 { height: 8px; animation: barPulse 0.8s ease-in-out 0.2s infinite; }
        .bar-3 { height: 8px; animation: barPulse 0.8s ease-in-out 0.4s infinite; }
      `}</style>
      <a
        href={track.track_url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono transition-opacity hover:opacity-70 inline-flex flex-col gap-0.5 min-w-0 max-w-[40%]"
        style={{ color: 'var(--muted)' }}
      >
        <span className="flex items-center gap-2 text-xs min-w-0">
          {track.is_playing ? (
            <span className="flex items-end h-3 flex-shrink-0" aria-hidden>
              <span className="bar bar-1" />
              <span className="bar bar-2" />
              <span className="bar bar-3" />
            </span>
          ) : (
            <span className="flex-shrink-0 text-xs">■</span>
          )}
          <span className="truncate" style={{ color: 'var(--fg)' }}>{track.title}</span>
        </span>
        <span className="text-xs truncate" style={{ paddingLeft: '14px' }}>by {track.artist}</span>
      </a>
    </>
  )
}
