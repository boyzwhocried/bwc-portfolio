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
// itself as the snapshots accumulate. Sits inside the read's section flow.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function monthLabel(month: string): string {
  const [y, m] = month.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`
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

  return (
    <div style={{ marginTop: '2.5rem' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--muted)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
        }}
      >
        the obsession log
      </div>
      <div className="flex flex-col" style={{ maxWidth: '52ch' }}>
        {lines
          .slice()
          .reverse()
          .map((l) => (
            <div key={l.month} style={{ padding: '10px 0', borderBottom: '1px solid var(--rule)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-text)', marginBottom: 4 }}>
                {monthLabel(l.month)}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.5, color: 'var(--fg)' }}>
                {l.text}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
