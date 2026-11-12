import { createClient } from '@supabase/supabase-js'
import { cleanEnv } from './env'

export function createServerClient() {
  return createClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
}
