'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import type {
  SpotifyTrack,
  SpotifyLive,
  MusicData,
  TopRange,
  PlaylistCard,
  CachedTrack,
} from '@/types'
import DriftingSquares from '@/components/ui/DriftingSquares'
import { useFadeUp } from '@/lib/motion'

const POLL_PLAYING = 30_000
const POLL_IDLE = 60_000
const BARS = [10, 22, 14, 24, 8, 18, 12, 20, 15]
const SHELF_PREVIEW_DESKTOP = 6
const SHELF_PREVIEW_PHONE = 4 // fewer cards per group on small screens

function useIsPhone() {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const apply = () => setPhone(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return phone
}

// recent track -> the shared SpotifyTrack shape used by the hero
function asTrack(r: CachedTrack): SpotifyTrack {
  return {
    is_playing: false,
    title: r.name,
    artist: r.artist,
    album: r.album,
    album_art_url: r.image,
    track_url: r.url,
  }
}

const RANGES: { key: TopRange; label: string }[] = [
  { key: 'short_term', label: 'last 4 weeks' },
  { key: 'medium_term', label: 'last 6 months' },
  { key: 'long_term', label: 'all time' },
]

type SortKey = 'curated' | 'az' | 'size'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'curated', label: 'curated' },
  { key: 'az', label: 'a-z' },
  { key: 'size', label: 'size' },
]

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

function SegToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { key: T; label: string }[]
  value: T
  onChange: (k: T) => void
  ariaLabel: string
}) {
  return (
    <div className="flex gap-1.5" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.key === value
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
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
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export default function MusicPlayer({ music }: { music: MusicData }) {
  const fade = useFadeUp()
  const [live, setLive] = useState<SpotifyLive | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<TopRange>('short_term')
  const [sort, setSort] = useState<SortKey>('curated')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isPhone = useIsPhone()
  const shelfPreview = isPhone ? SHELF_PREVIEW_PHONE : SHELF_PREVIEW_DESKTOP

  useEffect(() => {
    async function fetchLive() {
      if (document.hidden) return
      try {
        const res = await fetch('/api/spotify/live')
        if (res.status === 429) return
        const data: SpotifyLive = await res.json()
        setLive(data)
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = setInterval(fetchLive, data?.nowPlaying?.is_playing ? POLL_PLAYING : POLL_IDLE)
      } catch {
        // keep last-known live state on a transient error
      } finally {
        setLoading(false)
      }
    }
    fetchLive()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // live recent, falling back to the server-rendered cache for first paint / no-JS
  const recent = live?.recent?.length ? live.recent : music.recentlyPlayed ?? []
  const nowPlaying = live?.nowPlaying ?? null
  const playing = !!nowPlaying?.is_playing
  // hero shows what is actually true: the live track, or the last played track
  const hero: SpotifyTrack | null = nowPlaying ?? (recent[0] ? asTrack(recent[0]) : null)
  const isLastPlayed = !nowPlaying && !!recent[0]
  const hasArt = !!hero?.album_art_url

  const topTracks = music.topTracks?.[range] ?? []
  const topArtists = music.topArtists?.[range] ?? []
  const hasSlowData =
    !!music.topTracks || !!music.recentlyPlayed || !!music.shelf || !!music.ofInsta

  const grouped = useMemo(() => {
    const shelf = music.shelf ?? []
    const cmp =
      sort === 'az'
        ? (a: PlaylistCard, b: PlaylistCard) => a.name.localeCompare(b.name)
        : sort === 'size'
        ? (a: PlaylistCard, b: PlaylistCard) => b.count - a.count
        : (a: PlaylistCard, b: PlaylistCard) => a.position - b.position
    return GROUPS.map((g) => ({
      ...g,
      items: shelf.filter((p) => p.category === g.key).sort(cmp),
    })).filter((g) => g.items.length > 0)
  }, [music.shelf, sort])

  return (
    <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '3.5rem' }}>
      <DriftingSquares variant="music" color="var(--paper)" opacity={0.05} count={6} />
      <style>{`
        @keyframes eqBar { 0%,100% { transform: scaleY(0.25); } 50% { transform: scaleY(1); } }
        .eq-bar { width: 5px; background: var(--accent); transform-origin: bottom; border-radius: 1px; }
        .eq-bar.animate { animation: eqBar 0.9s ease-in-out infinite; }
        .mp-card img { transition: transform 0.4s ease; }
        .mp-card:hover img { transform: scale(1.04); }
        .mp-scroller { scrollbar-width: none; -ms-overflow-style: none; }
        .mp-scroller::-webkit-scrollbar { display: none; }
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
              <img src={hero!.album_art_url} alt={`album art: ${hero!.album}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
          </div>

          <div className="min-w-0">
            <div className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.12em' }}>
              {loading && !hero
                ? 'connecting to spotify...'
                : playing
                ? '● now playing · spotify live'
                : isLastPlayed
                ? '○ not listening right now · last played'
                : '○ not listening right now'}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(2.2rem, 7vw, 4rem)', lineHeight: 0.95, letterSpacing: '-0.02em', color: 'var(--fg)', marginTop: '0.75rem' }}>
              {hero?.title ?? (loading ? 'connecting' : 'silence')}
            </h1>
            <p style={{ fontSize: 16, color: 'var(--muted)', marginTop: '0.5rem' }}>
              {hero ? `${hero.artist}${hero.album ? ` · ${hero.album}` : ''}` : loading ? 'reading the turntable...' : 'nothing on the speakers right now'}
            </p>
            <div className="flex items-end gap-1.5" style={{ height: 32, marginTop: '1.75rem' }} aria-hidden>
              {BARS.map((h, i) => (
                <span key={i} className={`eq-bar${playing ? ' animate' : ''}`} style={{ height: h, animationDelay: `${i * 0.12}s`, opacity: playing ? 1 : 0.4 }} />
              ))}
            </div>
            {hero?.track_url && (
              <a href={hero.track_url} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70 inline-block" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', marginTop: '1.75rem' }}>
                {playing ? 'open in spotify ↗' : 'play it on spotify ↗'}
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
          <motion.div
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            style={{ marginTop: '5rem', borderTop: '1px solid var(--rule)', paddingTop: '3rem' }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-4" style={{ marginBottom: '1.75rem' }}>
              <div style={labelStyle}>most played</div>
              <SegToggle options={RANGES} value={range} onChange={setRange} ariaLabel="time range" />
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
                          <Image src={a.image} alt="" width={32} height={32} quality={70} sizes="32px" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }} />
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
          </motion.div>
        )}

        {/* RECENTLY PLAYED (live) */}
        {recent.length > 0 && (
          <motion.div
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            style={{ marginTop: '5rem', borderTop: '1px solid var(--rule)', paddingTop: '3rem' }}
          >
            <div style={{ ...labelStyle, marginBottom: '1.5rem' }}>last spun</div>
            <div style={{ position: 'relative' }}>
              <div className="mp-scroller flex gap-5 overflow-x-auto pb-2">
                {recent.slice(0, 14).map((t, i) => (
                  <a
                    key={`${t.url}-${i}`}
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mp-card flex-shrink-0 transition-opacity hover:opacity-90"
                    style={{ width: 116 }}
                  >
                    <div style={{ position: 'relative', width: 116, height: 116, overflow: 'hidden', background: 'var(--accent)' }}>
                      {t.image && (
                        <Image src={t.image} alt="" width={116} height={116} quality={70} sizes="116px" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      )}
                    </div>
                    <div className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--fg)', marginTop: 8, width: 116 }}>{t.name}</div>
                    <div className="truncate" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginTop: 2, width: 116 }}>{t.artist}</div>
                  </a>
                ))}
              </div>
              {/* right-edge fade cue that there's more to scroll */}
              <div aria-hidden style={{ position: 'absolute', top: 0, right: 0, bottom: 8, width: 48, pointerEvents: 'none', background: 'linear-gradient(to right, transparent, var(--bg))' }} />
            </div>
          </motion.div>
        )}

        {/* THE TWO PLAYLISTS I LIVE IN: this month + of insta paired in one full-bleed beat (the one break per room) */}
        {(music.thisMonth || music.ofInsta) && (
          <motion.div
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            style={{
              width: '100vw',
              marginLeft: 'calc(50% - 50vw)',
              marginTop: '5rem',
              borderTop: '1px solid var(--accent)',
              borderBottom: '1px solid var(--accent)',
              background: 'color-mix(in srgb, var(--accent) 7%, transparent)',
              overflow: 'hidden',
            }}
          >
            <div style={{ ...frame, paddingTop: '3.75rem', paddingBottom: '3.75rem' }}>
              <div className="flex flex-col md:flex-row">
                {/* this month: primary, leads by position */}
                {music.thisMonth && (
                  <div className="md:flex-1 min-w-0 md:pr-12 lg:pr-16">
                    <BeatFeature
                      href={music.thisMonth.url}
                      image={music.thisMonth.image}
                      label="this month"
                      title={music.thisMonth.name}
                      meta={`${music.thisMonth.count.toLocaleString()} tracks · updated monthly ↗`}
                      blurb={music.thisMonth.description ?? 'the diary playlist for right now: what i actually keep on repeat, refreshed every month.'}
                    />
                  </div>
                )}
                {/* of insta: the archive; vermilion divider only when paired */}
                {music.ofInsta && (
                  <div
                    className={music.thisMonth ? 'md:flex-1 min-w-0 mt-12 pt-12 border-t md:mt-0 md:pt-0 md:border-t-0 md:border-l md:pl-12 lg:pl-16' : 'md:flex-1 min-w-0'}
                    style={music.thisMonth ? { borderColor: 'var(--accent)' } : undefined}
                  >
                    <BeatFeature
                      href={music.ofInsta.url}
                      image={music.ofInsta.image}
                      label="the archive"
                      title="of insta"
                      meta={`${music.ofInsta.count.toLocaleString()} tracks, and counting ↗`}
                      blurb="every song i catch in an instagram reel gets saved here, then a slow ritual sorts it: the monthly diary on the left, vibe-named shelves below, and a gold list of the ones that survive a second listen."
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* THE SHELF */}
        {grouped.length > 0 && (
          <motion.div
            variants={fade}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            style={{ marginTop: '5rem', borderTop: '1px solid var(--rule)', paddingTop: '3rem' }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-4" style={{ marginBottom: '0.5rem' }}>
              <div style={labelStyle}>the shelf</div>
              <SegToggle options={SORTS} value={sort} onChange={setSort} ariaLabel="sort playlists" />
            </div>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: '2rem' }}>
              curated playlists, kept fresh automatically.
            </p>
            {grouped.map((g) => {
              const isOpen = !!expanded[g.key]
              const items = isOpen ? g.items : g.items.slice(0, shelfPreview)
              return (
                <div key={g.key} style={{ marginBottom: '2.5rem' }}>
                  <div className="flex items-baseline gap-3" style={{ marginBottom: '1.25rem' }}>
                    <div style={{ ...labelStyle, color: 'var(--accent)' }}>{g.label}</div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{g.items.length}</span>
                  </div>
                  <div className="grid gap-x-6 gap-y-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                    {items.map((p) => <ShelfCard key={p.id} p={p} />)}
                  </div>
                  {g.items.length > shelfPreview && (
                    <button
                      onClick={() => setExpanded((s) => ({ ...s, [g.key]: !s[g.key] }))}
                      className="transition-opacity hover:opacity-70"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', marginTop: '1.25rem', letterSpacing: '0.04em' }}
                    >
                      {isOpen ? '− show less' : `+ show all ${g.items.length}`}
                    </button>
                  )}
                </div>
              )
            })}
          </motion.div>
        )}

        {music.updatedAt && (
          <p style={{ ...labelStyle, marginTop: '3.5rem' }}>
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
        <Image src={t.image} alt="" width={40} height={40} quality={70} sizes="40px" style={{ width: 40, height: 40, objectFit: 'cover', display: 'block' }} />
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

function BeatFeature({
  href,
  image,
  label,
  title,
  meta,
  blurb,
}: {
  href: string
  image: string
  label: string
  title: string
  meta: string
  blurb: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mp-card block transition-opacity hover:opacity-90"
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-8">
        <div style={{ width: 'clamp(8rem, 20vw, 12rem)', aspectRatio: '1 / 1', position: 'relative', overflow: 'hidden', background: 'var(--accent)', flexShrink: 0 }}>
          {image && (
            <Image src={image} alt="" fill sizes="(max-width: 768px) 45vw, 12rem" style={{ objectFit: 'cover' }} />
          )}
        </div>
        <div className="min-w-0">
          <div style={{ ...labelStyle, color: 'var(--accent)' }}>{label}</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(1.8rem, 4.5vw, 3.2rem)', lineHeight: 0.95, letterSpacing: '-0.02em', color: 'var(--fg)', marginTop: '0.4rem', overflowWrap: 'anywhere' }}>
            {title}
          </h2>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', marginTop: '0.6rem' }}>
            {meta}
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--fg)', marginTop: '1rem', maxWidth: '46ch' }}>
            {blurb}
          </p>
        </div>
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
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', background: 'var(--accent)' }}>
        {p.image && (
          <Image src={p.image} alt="" fill quality={70} sizes="(max-width: 768px) 42vw, 180px" style={{ objectFit: 'cover' }} />
        )}
      </div>
      <div className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--fg)', marginTop: 10 }}>{p.name}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', marginTop: 3 }}>{p.count.toLocaleString()} tracks</div>
      {p.description && (
        <p
          title={p.description}
          className="truncate"
          style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--muted)', marginTop: 6 }}
        >
          {p.description}
        </p>
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
