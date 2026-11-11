'use client'

import { useMemo } from 'react'
import { curationView, type CurationLog as CurationLogData } from '@/lib/music/curationLog'

// The curation log: what the last Spotify curation runs actually did, per run
// date. Published from the vault only after Verrel says yes, so it carries an
// "as of" stamp and is fresh only as of the last publish. Hidden when empty.

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

export default function CurationLog({ log }: { log: CurationLogData | null }) {
  const view = useMemo(() => curationView(log), [log])
  if (!view) return null

  return (
    <section style={{ marginTop: '2.5rem' }} aria-label="curation log">
      <div className="flex flex-wrap items-baseline justify-between gap-4" style={{ marginBottom: '1rem' }}>
        <div style={label}>the curation log</div>
        <div style={{ ...label, textTransform: 'none', letterSpacing: '0.04em' }}>{view.asOf}</div>
      </div>

      {view.rules.length > 0 && (
        <p style={{ ...mono, maxWidth: '70ch', marginBottom: '1.25rem' }}>{view.rules.join(' · ')}</p>
      )}

      <div className="flex flex-col" style={{ maxWidth: '70ch' }}>
        {view.runs.map((r) => (
          <div key={r.heading} style={{ padding: '14px 0', borderBottom: '1px solid var(--rule)' }}>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <span style={{ ...mono, flexShrink: 0 }}>{r.heading}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>
                {r.summary}
              </span>
            </div>

            {r.shelves.filter((s) => s.artists.length > 0).map((s) => (
              <p key={s.name} style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--muted)', marginTop: '0.5rem' }}>
                <span style={{ ...label, marginRight: 10 }}>{s.name}</span>
                {s.artists.join(' · ')}
              </p>
            ))}

            {r.repeats.length > 0 && (
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--fg)', marginTop: '0.5rem' }}>
                <span style={{ ...label, marginRight: 10 }}>on repeat</span>
                {r.repeats.map((x) => `${x.track}, ${x.artist}`).join(' · ')}
              </p>
            )}

            {r.skippedReasons.length > 0 && (
              <p style={{ ...label, textTransform: 'none', letterSpacing: '0.04em', marginTop: '0.5rem' }}>
                skipped: {r.skippedReasons.join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>

      {view.blurbs.length > 0 && (
        <div style={{ marginTop: '1.5rem', maxWidth: '62ch' }}>
          {view.blurbs.map((b) => (
            <p key={`${b.artist}|${b.album ?? ''}`} style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--fg)', marginTop: '0.8rem' }}>
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
    </section>
  )
}
