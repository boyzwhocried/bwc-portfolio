'use client'

import Image from 'next/image'
import SandboxModal from '@/components/sections/sandbox/SandboxModal'
import type { PlaylistDetail, PlaylistDetailSampleTrack } from '@/types'

const SCAN_PREVIEW = 100

export interface PlaylistFallback {
  id: string
  name: string
  image: string
  count: number
  url: string
  description: string | null
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--muted)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

function fmtAdded(first: string | null, last: string | null): string | null {
  if (!first && !last) return null
  const m = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  if (first && last && m(first) !== m(last)) return `added ${m(first)} to ${m(last)}`
  return `added ${m((last ?? first)!)}`
}

export default function PlaylistModal({
  detail,
  fallback,
  onClose,
}: {
  detail?: PlaylistDetail
  fallback: PlaylistFallback
  onClose: () => void
}) {
  const name = detail?.name ?? fallback.name
  const image = detail?.image ?? fallback.image
  const count = detail?.count ?? fallback.count
  const url = detail?.url ?? fallback.url
  const description = detail?.description ?? fallback.description
  const added = detail ? fmtAdded(detail.firstAdded, detail.lastAdded) : null
  const palette = detail?.moodPalette ?? []

  return (
    <SandboxModal title={name} onClose={onClose} width={560} panelBg="var(--bg)" panelFg="var(--fg)" borderColor="var(--accent)">
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* header: cover + title-as-spotify-link + meta */}
        <div className="flex gap-5">
          <div style={{ width: 96, height: 96, position: 'relative', flexShrink: 0, background: 'var(--accent)' }}>
            {image && <Image src={image} alt="" fill quality={70} sizes="96px" style={{ objectFit: 'cover' }} />}
          </div>
          <div className="min-w-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-70"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--fg)', lineHeight: 1.05, display: 'inline-block' }}
            >
              {name} <span style={{ color: 'var(--accent)', fontSize: 14 }}>open in spotify ↗</span>
            </a>
            <div style={{ ...mono, marginTop: 8 }}>
              {count.toLocaleString()} tracks{added ? ` · ${added}` : ''}
            </div>
            {detail?.isObsession && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', marginTop: 6 }}>
                ● current obsession lives here
              </div>
            )}
          </div>
        </div>

        {/* narrative + description */}
        {detail?.narrative && <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--fg)' }}>{detail.narrative}</p>}
        {description && <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--muted)' }}>{description}</p>}

        {/* mood + tags */}
        {(detail?.mood || (detail?.themeTags?.length ?? 0) > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {detail?.mood && (
              <div className="flex items-center gap-3">
                <span style={mono}>mood</span>
                <span style={{ fontSize: 13, color: 'var(--fg)' }}>{detail.mood}</span>
                <span className="flex gap-1">
                  {palette.map((c, i) => (
                    <span key={i} style={{ width: 14, height: 14, background: c, display: 'inline-block' }} />
                  ))}
                </span>
              </div>
            )}
            {(detail?.themeTags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {detail!.themeTags.map((tag) => (
                  <span key={tag} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>#{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* top artists + anchor + era + decades */}
        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--rule)', paddingTop: 14 }}>
            {detail.topArtists.length > 0 && (
              <div style={{ fontSize: 13, color: 'var(--fg)' }}>
                <span style={mono}>heavy on </span>
                {detail.topArtists.map((a) => a.name).join(', ')}
              </div>
            )}
            {detail.anchorTrack && (
              <div style={{ fontSize: 13 }}>
                <span style={mono}>anchor </span>
                <a
                  href={detail.anchorTrack.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-70"
                  style={{ color: 'var(--fg)' }}
                >
                  {detail.anchorTrack.name} ({detail.anchorTrack.artist}) ↗
                </a>
              </div>
            )}
            {detail.eraFrom && detail.eraTo && (
              <div className="flex items-center gap-3">
                <span style={mono}>era</span>
                <span style={{ fontSize: 13, color: 'var(--fg)' }}>{detail.eraFrom} to {detail.eraTo}</span>
                <DecadeBars decades={detail.decades} />
              </div>
            )}
          </div>
        )}

        {/* sample strip */}
        {(detail?.sampleTracks?.length ?? 0) > 0 && (
          <div className="flex gap-3 overflow-x-auto" style={{ borderTop: '1px solid var(--rule)', paddingTop: 14 }}>
            {detail!.sampleTracks.map((s, i) => <SampleCard key={`${s.url}-${i}`} s={s} />)}
          </div>
        )}
        {detail?.sampled && <div style={{ ...mono, fontSize: 9 }}>stats sampled from the first {SCAN_PREVIEW} tracks</div>}
      </div>
    </SandboxModal>
  )
}

function DecadeBars({ decades }: { decades: { decade: number; count: number }[] }) {
  if (decades.length === 0) return null
  const max = Math.max(...decades.map((d) => d.count))
  return (
    <span className="flex items-end gap-0.5" style={{ height: 18 }} aria-hidden>
      {decades.map((d) => (
        <span
          key={d.decade}
          title={`${d.decade}s: ${d.count}`}
          style={{ width: 6, height: Math.max(2, (d.count / max) * 18), background: 'var(--accent)', display: 'inline-block' }}
        />
      ))}
    </span>
  )
}

function SampleCard({ s }: { s: PlaylistDetailSampleTrack }) {
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 transition-opacity hover:opacity-80" style={{ width: 72 }}>
      <div style={{ width: 72, height: 72, position: 'relative', background: 'var(--accent)' }}>
        {s.image && <Image src={s.image} alt="" fill quality={60} sizes="72px" style={{ objectFit: 'cover' }} />}
      </div>
      <div className="truncate" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginTop: 4, width: 72 }}>{s.name}</div>
    </a>
  )
}
