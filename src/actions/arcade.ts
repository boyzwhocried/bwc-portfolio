'use server'

import { createServerClient } from '@/lib/supabase/server'
import { replay, type Input } from '@/lib/sandbox/parry'

// The leaderboard is authoritative: the client sends the seed + raw key presses,
// and the server REPLAYS the deterministic core to derive the score itself. A
// faked score field would be ignored; you have to send inputs that genuinely
// produce the score. Insert path mirrors the guestbook (anon client + bounded
// RLS check); score is additionally clamped here.

const MAX_SCORE = 99_999
const MAX_INPUTS = 4000

export type SubmitResult = { ok: boolean; score?: number; error?: string }

export async function submitScore(seed: number, rawInputs: unknown, rawName: string): Promise<SubmitResult> {
  const name = (rawName || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'AAA'
  if (!Number.isFinite(seed)) return { ok: false, error: 'bad seed' }
  if (!Array.isArray(rawInputs) || rawInputs.length > MAX_INPUTS) return { ok: false, error: 'bad run' }

  const inputs: Input[] = []
  for (const it of rawInputs as Array<{ time?: unknown; dir?: unknown }>) {
    if (!it || typeof it.time !== 'number' || typeof it.dir !== 'number') continue
    if (it.dir < 0 || it.dir > 3) continue
    inputs.push({ time: it.time, dir: it.dir | 0 })
  }

  const res = replay(Math.trunc(seed), inputs)
  const score = Math.max(0, Math.min(MAX_SCORE, res.score))

  const supabase = createServerClient()
  const { error } = await supabase.from('arcade_scores').insert({ game: 'parry', name, score } as never)
  if (error) return { ok: false, error: 'leaderboard offline' }
  return { ok: true, score }
}
