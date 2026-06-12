'use client'

import { useMemo } from 'react'
import { buildObsessionLog, logIsWorthShowing, type HistorySnapshot } from '@/lib/music/obsessionLog'

// Month-by-month record of what owned the rotation, from spotify_history.
// Deliberately hidden until a second month of history exists; it activates
// itself as the snapshots accumulate. Sits inside the read's section flow.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function monthLabel(month: string): string {
  const [y, m] = month.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`
}

export default function ObsessionLog({ history }: { history: HistorySnapshot[] }) {
  const entries = useMemo(() => buildObsessionLog(history), [history])
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
      <div className="flex flex-col" style={{ maxWidth: '46ch' }}>
        {entries
          .slice()
          .reverse()
          .map((e) => (
            <div
              key={e.month}
              className="flex items-baseline justify-between gap-6"
              style={{ padding: '7px 0', borderBottom: '1px solid var(--rule)' }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-text)', flexShrink: 0 }}>
                {monthLabel(e.month)}
              </span>
              <span
                className="truncate"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}
              >
                {e.subject ? `${e.subject}${e.artist && e.artist !== e.subject ? `, ${e.artist}` : ''}` : 'no single obsession'}
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}
