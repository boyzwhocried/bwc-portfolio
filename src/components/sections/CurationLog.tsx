'use client'

import { useMemo } from 'react'
import { curationView, type CurationLog as CurationLogData, type IssueView } from '@/lib/music/curationLog'

// The curation log as a small zine: each curation run is an issue with a cover
// line and liner notes in Verrel's own words; the numbers sit in a footnote.
// Published from the vault only after he says yes, so it carries an "as of"
// stamp. Hidden when there is nothing to show.

const label: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--muted)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11.5,
  lineHeight: 1.8,
  color: 'var(--accent-text)',
  letterSpacing: '0.02em',
}

const issueNo = (n: number) => `issue ${String(n).padStart(2, '0')}`

function Footnote({ text }: { text: string }) {
  return <p style={{ ...label, textTransform: 'none', letterSpacing: '0.04em', marginTop: '1.25rem' }}>{text}</p>
}

function PastIssue({ i }: { i: IssueView }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--rule)' }}>
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span style={mono}>
          {issueNo(i.number)} · {i.heading}
        </span>
        <span style={{ fontSize: 13.5, color: 'var(--fg)' }}>{i.cover ?? i.footnote}</span>
      </div>
    </div>
  )
}

export default function CurationLog({ log }: { log: CurationLogData | null }) {
  const view = useMemo(() => curationView(log), [log])
  if (!view) return null
  const { latest } = view

  return (
    <section style={{ marginTop: '2.5rem' }} aria-label="curation log">
      <div className="flex flex-wrap items-baseline justify-between gap-4" style={{ marginBottom: '1.25rem' }}>
        <div style={label}>the curation log</div>
        <div style={{ ...label, textTransform: 'none', letterSpacing: '0.04em' }}>{view.asOf}</div>
      </div>

      <div style={mono}>
        {issueNo(latest.number)} · {latest.heading}
      </div>

      {latest.cover && (
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(1.25rem, 2.6vw, 1.75rem)',
            lineHeight: 1.12,
            letterSpacing: '-0.015em',
            color: 'var(--fg)',
            maxWidth: '30ch',
            marginTop: '0.5rem',
          }}
        >
          {latest.cover}
        </h3>
      )}

      {latest.artistsLine && (
        <p style={{ fontSize: 13, fontStyle: 'italic', lineHeight: 1.8, color: 'var(--muted)', marginTop: '1rem', maxWidth: '62ch' }}>
          <span style={{ ...label, fontStyle: 'normal', marginRight: 10 }}>in this batch</span>
          {latest.artistsLine}
        </p>
      )}

      {latest.picks.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '1.25rem', maxWidth: '62ch' }}>
          {latest.picks.map((p) => (
            <li key={`${p.artist}|${p.track}`} style={{ padding: '8px 0', borderBottom: '1px solid var(--rule)' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, color: 'var(--fg)' }}>
                {p.track}
              </span>
              <span style={{ ...label, marginLeft: 10 }}>{p.artist}</span>
              {p.note && <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--muted)', marginTop: 2 }}>{p.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {latest.onRepeat && (
        <div style={{ marginTop: '1.5rem', maxWidth: '62ch' }}>
          <div style={{ ...label, marginBottom: 6 }}>on repeat then</div>
          {latest.onRepeat.note && (
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--fg)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              {latest.onRepeat.note}
            </p>
          )}
          {latest.onRepeat.tracks.length > 0 && (
            <p style={{ ...mono, marginTop: 4 }}>
              {latest.onRepeat.tracks.map((t) => `${t.track}, ${t.artist}`).join(' · ')}
            </p>
          )}
          {latest.onRepeat.artists.length > 0 && (
            <p style={{ fontSize: 13, fontStyle: 'italic', lineHeight: 1.7, color: 'var(--muted)' }}>
              {latest.onRepeat.artists.join(' · ')}
            </p>
          )}
        </div>
      )}

      {view.legend.length > 0 && (
        <div style={{ marginTop: '1.25rem', maxWidth: '62ch' }}>
          <div style={{ ...label, marginBottom: 6 }}>where they went</div>
          {view.legend.map((c) => (
            <p key={c.playlist} style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--fg)' }}>
              <span style={{ ...mono, marginRight: 8 }}>{c.playlist}</span>
              {c.text}
            </p>
          ))}
        </div>
      )}

      <Footnote text={latest.footnote} />

      {view.rules.length > 0 && (
        <p style={{ ...label, textTransform: 'none', letterSpacing: '0.04em', marginTop: '0.5rem' }}>
          house rules: {view.rules.join(' · ')}
        </p>
      )}

      {view.blurbs.length > 0 && (
        <div style={{ marginTop: '1.5rem', maxWidth: '58ch' }}>
          {view.blurbs.map((b) => (
            <p key={`${b.artist}|${b.album ?? ''}`} style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--fg)', marginTop: '0.7rem' }}>
              <strong style={{ fontFamily: 'var(--font-display)' }}>
                {b.artist}
                {b.album ? `, ${b.album}` : ''}
              </strong>{' '}
              {b.text}{' '}
              <a href={b.source} target="_blank" rel="noopener noreferrer" style={{ ...label, textTransform: 'none' }}>
                source ↗
              </a>
            </p>
          ))}
        </div>
      )}

      {view.past.length > 0 && (
        <details style={{ marginTop: '1.75rem', maxWidth: '62ch' }}>
          <summary style={{ ...label, cursor: 'pointer' }}>past issues ({view.past.length})</summary>
          <div style={{ marginTop: '0.5rem' }}>
            {view.past.map((i) => (
              <PastIssue key={i.number} i={i} />
            ))}
          </div>
        </details>
      )}
    </section>
  )
}
