'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'

type Row = { name: string; score: number; created_at: string }

// Public read of the arcade leaderboard (same anon-select pattern as the
// guestbook). Honest empty / offline states so it never shows fake rows.
export default function Leaderboard({ game, refreshKey = 0, max = 8 }: { game: string; refreshKey?: number; max?: number }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let cancelled = false
    createBrowserClient()
      .from('arcade_scores')
      .select('name, score, created_at')
      .eq('game', game)
      .order('score', { ascending: false })
      .limit(max)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setOffline(true); return }
        setRows((data as Row[]) ?? [])
      })
    return () => { cancelled = true }
  }, [game, refreshKey, max])

  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7CFC9A' }}>
      <div style={{ color: '#5a6b5e', letterSpacing: '0.2em', fontSize: 10, marginBottom: 6 }}>HIGH SCORES</div>
      {offline && <div style={{ color: '#c2553a' }}>board offline</div>}
      {!offline && rows === null && <div style={{ color: '#5a6b5e' }}>loading…</div>}
      {!offline && rows?.length === 0 && <div style={{ color: '#5a6b5e' }}>be the first. no scores yet.</div>}
      {rows?.map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, lineHeight: 1.7 }}>
          <span>
            <span style={{ color: '#5a6b5e' }}>{String(i + 1).padStart(2, '0')}</span> {r.name}
          </span>
          <span>{r.score.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}
