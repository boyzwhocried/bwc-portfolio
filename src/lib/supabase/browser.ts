import { createClient } from '@supabase/supabase-js'
import { cleanEnv } from './env'

let client: ReturnType<typeof createClient> | null = null

export function createBrowserClient() {
  if (client) return client
  client = createClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
  return client
}
