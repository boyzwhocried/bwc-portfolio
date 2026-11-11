// Publish a reviewed curation log to spotify_cache key `curation_log`.
//
//   node scripts/music/publish-curation.mjs <file.json>          dry run (default)
//   node scripts/music/publish-curation.mjs <file.json> --yes    write
//   --env <path>   read NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from this file
//
// Never automatic: the spotify-curation skill asks Verrel after every run and
// only runs this with --yes on his yes. The service key stays in env, never the page.
// Node strips the TypeScript types of the imported core natively.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runPublish } from '../../src/lib/music/publishCuration.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const yes = args.includes('--yes')
const envIdx = args.indexOf('--env')
const envPath = envIdx >= 0 ? args[envIdx + 1] : join(HERE, '..', '..', '.env.local')
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--env')

function loadEnv(p) {
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

async function main() {
  if (!file) throw new Error('usage: publish-curation.mjs <file.json> [--yes] [--env <path>]')
  const raw = JSON.parse(readFileSync(file, 'utf8'))

  let upsert = async () => {}
  if (yes) {
    loadEnv(envPath)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (env or --env file)')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    upsert = async (row) => {
      const { error } = await supabase.from('spotify_cache').upsert(row)
      if (error) throw new Error(`upsert failed: ${error.message}`)
    }
  }

  const r = await runPublish(raw, { yes, upsert })
  console.log(r.wrote ? `published: ${r.summary}` : `dry run (add --yes to publish): ${r.summary}`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
