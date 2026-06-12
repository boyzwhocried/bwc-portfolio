import { createClient } from '@supabase/supabase-js'

// Server-only privileged client (service role). Used by trusted server actions
// that must write tables anon is RLS-denied from (e.g. the arcade leaderboard,
// where the score is authoritative only after server-side replay verification).
// Returns null when the key is absent so callers can degrade gracefully instead
// of throwing — keeping reads alive while writes wait on the env var.
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!key || !url) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
