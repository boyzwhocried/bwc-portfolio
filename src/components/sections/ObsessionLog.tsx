'use client'

import { useMemo } from 'react'
import {
  buildObsessionLog,
  logIsWorthShowing,
  narrateLog,
  type HistorySnapshot,
  type TimelineEvent,
} from '@/lib/music/obsessionLog'

// Month-by-month record of what owned the rotation, from spotify_history.
// Deliberately hidden until a second month of history exists; it activates
// itself as the snapshots accumulate. Styled like the zine above it
// (CurationLog) and collapsed by default so the page stays short.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function monthLabel(month: string): string {
  const [y, m] = month.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`
}

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

export default function ObsessionLog({
  history,
  events = [],
}: {
  history: HistorySnapshot[]
  events?: TimelineEvent[]
}) {
  const entries = useMemo(() => buildObsessionLog(history), [history])
  const lines = useMemo(() => narrateLog(entries, events), [entries, events])
  if (!logIsWorthShowing(entries)) return null

  const newestFirst = lines.slice().reverse()

  return (
    <details style={{ marginTop: '2.5rem', maxWidth: '62ch' }}>
      <summary style={{ ...label, cursor: 'pointer' }}>
        the obsession log ({newestFirst.length} months)
      </summary>
      <div style={{ marginTop: '0.75rem' }}>
        {newestFirst.map((l) => (
          <div key={l.month} style={{ padding: '10px 0', borderBottom: '1px solid var(--rule)' }}>
            <div style={mono}>on repeat · {monthLabel(l.month)}</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--fg)', marginTop: 2 }}>{l.text}</p>
          </div>
        ))}
      </div>
    </details>
  )
}
