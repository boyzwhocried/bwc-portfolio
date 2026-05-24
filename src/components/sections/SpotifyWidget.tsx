'use client'

import { useEffect, useRef, useState } from 'react'
import { SpotifyTrack } from '@/types'

function SpotifyScrollText({ text }: { text: string }) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    const container = containerRef.current
    const textEl = textRef.current
    if (!container || !textEl) return

    const overflow = textEl.scrollWidth - container.clientWidth
    if (overflow > 4) {
      const dur = Math.max(6, overflow / 40)
      setStyle({
        '--scroll-dist': `-${overflow}px`,
        '--scroll-dur': `${dur}s`,
      } as React.CSSProperties)
    } else {
      setStyle({})
    }
  }, [text])

  const scrolling = !!(style as Record<string, unknown>)['--scroll-dist']

  return (
    <span ref={containerRef} style={{ overflow: 'hidden', minWidth: 0, display: 'block' }}>
      <span ref={textRef} className={`spotify-text-track${scrolling ? '' : ' no-scroll'}`} style={style}>
        {text}
      </span>
    </span>
  )
}

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
        .bar-1 { height: 10px; animation: barPulse 0.8s ease-in-out infinite; }
        .bar-2 { height: 10px; animation: barPulse 0.8s ease-in-out 0.2s infinite; }
        .bar-3 { height: 10px; animation: barPulse 0.8s ease-in-out 0.4s infinite; }
        @keyframes spotifyScroll {
          0%, 15% { transform: translateX(0); }
          85%, 100% { transform: translateX(var(--scroll-dist)); }
        }
        .spotify-text-track {
          display: flex;
          white-space: nowrap;
          animation: spotifyScroll var(--scroll-dur, 0s) linear infinite;
        }
        .spotify-text-track.no-scroll {
          animation: none;
        }
      `}</style>
      <a
        href={track.track_url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs transition-opacity hover:opacity-70 flex items-center gap-2 min-w-0"
        style={{ color: 'var(--muted)', maxWidth: '100%' }}
      >
        <span className="flex-shrink-0">
          {track.is_playing ? (
            <span className="flex items-end h-3" aria-hidden>
              <span className="bar bar-1" />
              <span className="bar bar-2" />
              <span className="bar bar-3" />
            </span>
          ) : (
            <span>■</span>
          )}
        </span>
        <SpotifyScrollText text={`${track.title} / ${track.artist}`} />
      </a>
    </>
  )
}
