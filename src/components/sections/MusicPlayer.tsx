'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  SpotifyTrack,
  MusicData,
  TopRange,
  PlaylistCard,
  PlaylistFeature,
  CachedTrack,
} from '@/types'
import DriftingSquares from '@/components/ui/DriftingSquares'

const POLL_PLAYING = 30_000
const POLL_IDLE = 120_000
const BARS = [10, 22, 14, 24, 8, 18, 12, 20, 15]

const RANGES: { key: TopRange; label: string }[] = [
  { key: 'short_term', label: 'last 4 weeks' },
  { key: 'medium_term', label: 'last 6 months' },
  { key: 'long_term', label: 'all time' },
]

// shelf groups render in this fixed order with these display labels
const GROUPS: { key: string; label: string }[] = [
  { key: 'vault', label: 'the vault' },
  { key: 'rotation', label: 'on rotation' },
  { key: 'special', label: 'special' },
]

const frame: React.CSSProperties = {
  maxWidth: 'var(--page-max)',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: 'var(--page-px)',
  paddingRight: 'var(--page-px)',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--muted)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
}

export default function MusicPlayer({ music }: { music: MusicData }) {
  const [track, setTrack] = useState<SpotifyTrack | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<TopRange>('short_term')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function fetchTrack() {
      if (document.hidden) return
      try {
        const res = await fetch('/api/spotify/now-playing')
        if (res.status === 429) return
        const data: SpotifyTrack | null = await res.json()
        setTrack(data)
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = setInterval(fetchTrack, data?.is_playing ? POLL_PLAYING : POLL_IDLE)
      } catch {
        setTrack(null)
      } finally {
        setLoading(false)
      }
    }
    fetchTrack()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const playing = !!track?.is_playing
  const hasArt = !!track?.album_art_url

  const topTracks = music.topTracks?.[range] ?? []
  const topArtists = music.topArtists?.[range] ?? []
  const hasSlowData =
    !!music.topTracks || !!music.recentlyPlayed || !!music.shelf || !!music.ofInsta

  const grouped = useMemo(() => {
    const shelf = music.shelf ?? []
    return GROUPS.map((g) => ({
      ...g,
      items: shelf
        .filter((p) => p.category === g.key)
        .sort((a, b) => a.position - b.position),
    })).filter((g) => g.items.length > 0)
  }, [music.shelf])

  return (
    <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '3.5rem' }}>
      <DriftingSquares variant="music" color="var(--paper)" opacity={0.05} count={6} />
      <style>{`
        @keyframes eqBar { 0%,100% { transform: scaleY(0.25); } 50% { transform: scaleY(1); } }
        .eq-bar { width: 5px; background: var(--accent); transform-origin: bottom; border-radius: 1px; }
        .eq-bar.animate { animation: eqBar 0.9s ease-in-out infinite; }
        .mp-card img { transition: transform 0.4s ease; }
        .mp-card:hover img { transform: scale(1.04); }
        @media (prefers-reduced-motion: reduce) {
          .eq-bar.animate { animation: none; }
          .mp-card:hover img { transform: none; }
        }
      `}</style>

      <div style={{ ...frame, position: 'relative', zIndex: 1, paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* now-playing hero (LIVE) */}
        <div className="flex flex-col md:flex-row md:items-center gap-10 md:gap-14">
          <div
            className="flex-shrink-0"
            style={{
              width: 'clamp(13rem, 32vw, 18rem)',
              aspectRatio: '1 / 1',
              background: hasArt ? 'transparent' : 'linear-gradient(135deg, #e84c28, #7a2a4a)',
              boxShadow: playing ? '0 0 60px rgba(232,76,40,0.35)' : '0 0 40px rgba(232,76,40,0.15)',
              position: 'relative',
            }}
          >
            {hasArt && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={track!.album_art_url} alt={`album art: ${track!.album}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
          </div>

          <div className="min-w-0">
            <div className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.12em' }}>
              {loading ? 'connecting to spotify...' : playing ? '● now playing · spotify live' : '○ not playing right now'}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(2.2rem, 7vw, 4rem)', lineHeight: 0.95, letterSpacing: '-0.02em', color: 'var(--fg)', marginTop: '0.75rem' }}>
              {track?.title ?? 'silence'}
            </h1>
            <p style={{ fontSize: 16, color: 'var(--muted)', marginTop: '0.5rem' }}>
              {track ? `${track.artist}${track.album ? ` · ${track.album}` : ''}` : 'nothing on the speakers at the moment'}
            </p>
            <div className="flex items-end gap-1.5" style={{ height: 32, marginTop: '1.75rem' }} aria-hidden>
              {BARS.map((h, i) => (
                <span key={i} className={`eq-bar${playing ? ' animate' : ''}`} style={{ height: h, animationDelay: `${i * 0.12}s`, opacity: playing ? 1 : 0.4 }} />
              ))}
            </div>
            {track?.track_url && (
              <a href={track.track_url} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70 inline-block" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', marginTop: '1.75rem' }}>
                open in spotify ↗
              </a>
            )}
          </div>
        </div>

        {!hasSlowData && (
          <p style={{ ...labelStyle, marginTop: '4rem', color: 'var(--muted)' }}>
            the rest of the room is syncing from spotify. check back shortly.
          </p>
        )}

        {/* TOP TRACKS + ARTISTS, shared range toggle */}
        {(music.topTracks || music.topArtists) && (
          <div style={{ marginTop: '5rem', borderTop: '1px solid var(--rule)', paddingTop: '3rem' }}>
            <div className="flex flex-wrap items-baseline justify-between gap-4" style={{ marginBottom: '1.75rem' }}>
              <div style={labelStyle}>most played</div>
              <div className="flex gap-1.5" role="tablist" aria-label="time range">
                {RANGES.map((r) => {
                  const active = r.key === range
                  return (
                    <button
                      key={r.key}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setRange(r.key)}
                      className="transition-colors"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        letterSpacing: '0.04em',
                        padding: '5px 11px',
                        color: active ? 'var(--bg)' : 'var(--muted)',
                        background: active ? 'var(--accent)' : 'transparent',
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--rule)'}`,
                      }}
                    >
                      {r.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-x-16 gap-y-12">
              {/* top tracks */}
              <div className="md:col-span-7">
                <div style={{ ...labelStyle, marginBottom: '1rem' }}>tracks</div>
                {topTracks.length === 0 ? (
                  <p style={{ fontSize: 14, color: 'var(--muted)' }}>no data for this range yet.</p>
                ) : (
                  topTracks.slice(0, 10).map((t, i) => <TrackRow key={`${t.url}-${i}`} t={t} i={i} />)
                )}
              </div>

              {/* top artists */}
              <div className="md:col-span-5">
                <div style={{ ...labelStyle, marginBottom: '1rem' }}>artists</div>
                <div className="flex flex-col gap-3">
                  {topArtists.length === 0 ? (
                    <p style={{ fontSize: 14, color: 'var(--muted)' }}>no data for this range yet.</p>
                  ) : (
                    topArtists.slice(0, 8).map((a, i) => (
                      <a
                        key={`${a.url}-${i}`}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 transition-opacity hover:opacity-70"
                      >
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', width: 18 }}>{String(i + 1).padStart(2, '0')}</span>
                        {a.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.image} alt="" width={32} height={32} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }} />
                        ) : (
                          <span style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: '50%', flexShrink: 0 }} />
                        )}
                        <span className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--fg)' }}>{a.name}</span>
                      </a>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RECENTLY PLAYED */}
        {music.recentlyPlayed && music.recentlyPlayed.length > 0 && (
          <div style={{ marginTop: '5rem', borderTop: '1px solid var(--rule)', paddingTop: '3rem' }}>
            <div style={{ ...labelStyle, marginBottom: '1.5rem' }}>last spun</div>
            <div className="flex gap-5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              {music.recentlyPlayed.slice(0, 12).map((t, i) => (
                <a
                  key={`${t.url}-${i}`}
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mp-card flex-shrink-0 transition-opacity hover:opacity-90"
                  style={{ width: 116 }}
                >
                  <div style={{ width: 116, height: 116, overflow: 'hidden', background: 'var(--accent)' }}>
                    {t.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.image} alt="" width={116} height={116} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    )}
                  </div>
                  <div className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--fg)', marginTop: 8 }}>{t.name}</div>
                  <div className="truncate" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{t.artist}</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* OF INSTA + THIS MONTH (the system) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-16 gap-y-12" style={{ marginTop: '5rem', borderTop: '1px solid var(--rule)', paddingTop: '3rem' }}>
          <div className="md:col-span-7">
            <div style={{ ...labelStyle, marginBottom: '1.25rem' }}>the system</div>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--fg)', maxWidth: '46ch' }}>
              every song i catch in an instagram reel gets saved to one playlist, &ldquo;of insta&rdquo;.
              then a slow ritual sorts it: a monthly diary playlist (one per month, pastel cover), vibe-named
              shelves, and a gold list of the songs that survive a second listen. an accidental archive of
              whatever caught my ear.
            </p>
            {music.ofInsta && <PlaylistFeatureBlock f={music.ofInsta} accent />}
          </div>

          <div className="md:col-span-5">
            <div style={{ ...labelStyle, marginBottom: '1.25rem' }}>this month</div>
            {music.thisMonth ? (
              <PlaylistFeatureBlock f={music.thisMonth} />
            ) : (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--muted)' }}>
                this month&apos;s diary playlist is mid-sync. the footer ticker has the live truth.
              </p>
            )}
          </div>
        </div>

        {/* THE SHELF */}
        {grouped.length > 0 && (
          <div style={{ marginTop: '5rem', borderTop: '1px solid var(--rule)', paddingTop: '3rem' }}>
            <div style={{ ...labelStyle, marginBottom: '0.5rem' }}>the shelf</div>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: '2rem' }}>
              curated playlists, kept fresh automatically.
            </p>
            {grouped.map((g) => (
              <div key={g.key} style={{ marginBottom: '2.5rem' }}>
                <div style={{ ...labelStyle, color: 'var(--accent)', marginBottom: '1.25rem' }}>{g.label}</div>
                <div className="grid gap-x-6 gap-y-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                  {g.items.map((p) => <ShelfCard key={p.id} p={p} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {music.updatedAt && (
          <p style={{ ...labelStyle, marginTop: '3.5rem', opacity: 0.6 }}>
            slow data synced {timeAgo(music.updatedAt)} · now-playing is live
          </p>
        )}
      </div>
    </section>
  )
}

function TrackRow({ t, i }: { t: CachedTrack; i: number }) {
  return (
    <a
      href={t.url}
      target="_blank"
      rel="noopener noreferrer"
      className="grid items-center transition-opacity hover:opacity-70"
      style={{ gridTemplateColumns: '28px 40px 1fr auto', gap: 14, paddingTop: 10, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>{String(i + 1).padStart(2, '0')}</span>
      {t.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.image} alt="" width={40} height={40} style={{ width: 40, height: 40, objectFit: 'cover', display: 'block' }} />
      ) : (
        <span style={{ width: 40, height: 40, background: 'var(--accent)', display: 'block' }} />
      )}
      <span className="min-w-0">
        <span className="truncate block" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--fg)' }}>{t.name}</span>
        <span className="truncate block" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{t.artist}</span>
      </span>
    </a>
  )
}

function PlaylistFeatureBlock({ f, accent }: { f: PlaylistFeature; accent?: boolean }) {
  return (
    <a
      href={f.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mp-card flex gap-4 transition-opacity hover:opacity-90"
      style={{ marginTop: accent ? '1.5rem' : 0, alignItems: 'flex-start' }}
    >
      <div style={{ width: 96, height: 96, flexShrink: 0, overflow: 'hidden', background: 'var(--accent)' }}>
        {f.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.image} alt="" width={96} height={96} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--fg)' }}>{f.name}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>{f.count.toLocaleString()} tracks ↗</div>
        {f.description && (
          <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--muted)', marginTop: 8 }}>{f.description}</p>
        )}
      </div>
    </a>
  )
}

function ShelfCard({ p }: { p: PlaylistCard }) {
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mp-card block transition-opacity hover:opacity-95"
    >
      <div style={{ width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', background: 'var(--accent)' }}>
        {p.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
      </div>
      <div className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--fg)', marginTop: 10 }}>{p.name}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', marginTop: 3 }}>{p.count.toLocaleString()} tracks</div>
      {p.description && (
        <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--muted)', marginTop: 6 }}>{p.description}</p>
      )}
    </a>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}
