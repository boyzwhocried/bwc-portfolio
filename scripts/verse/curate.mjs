#!/usr/bin/env node
// Curate the "the verse" cryptogram bank from real song lyrics.
//
// WHY this exists: the daily cryptogram decodes a line of song lyrics. Real
// lyrics are third-party copyright, and this repo is PUBLIC, so the corpus must
// never be committed. This script pulls lyrics at refill time from LRCLIB (free,
// keyless), keeps the decode-friendly CATCHY lines (chorus / title hooks first;
// see pick.mjs), and writes them to the private Supabase `sandbox_verse_bank`
// table. The site then serves only
// ciphertext + a solve hash, so the plaintext only reaches a browser after a
// player has actually solved the puzzle.
//
// Two modes:
//   node scripts/verse/curate.mjs            -> fetch + UPSERT into Supabase
//   node scripts/verse/curate.mjs --emit     -> fetch + print JSON, write nothing
//
// Song sources:
//   - "taste": the latest spotify_history `top_tracks` snapshot (needs DB read)
//   - "popular": scripts/verse/popular.json  (committed, just titles+artists)
//   - --songs <file.json>: an explicit [{title,artist,source}] list (overrides)
//
// Env (DB mode / taste pull): NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// (both already live in .env.local for local runs and in Vercel for the site).

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pickLines, MAX_PER_SONG } from './pick.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const EMIT = process.argv.includes('--emit')
const songsFlag = process.argv.indexOf('--songs')
const songsFile = songsFlag !== -1 ? process.argv[songsFlag + 1] : null
// --pack <name> stamps every curated row with a themed-pack tag (free-play
// collections like 'taylor' / 'blink' / 'bwc'). Omitted -> pack stays null, i.e.
// the row joins the general daily + default free-play pool.
const packFlag = process.argv.indexOf('--pack')
const PACK = packFlag !== -1 ? process.argv[packFlag + 1] : null

const REQ_DELAY_MS = 350 // be polite to LRCLIB

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// load .env.local so service-role runs work without exporting vars by hand
function loadEnv() {
  const p = join(HERE, '..', '..', '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

// Line selection (pickLines) lives in ./pick.mjs (pure + unit-tested). It now
// favours the CATCHY lines: the repeated chorus and title-stating hooks rank
// first, with a clean-line fallback.

async function fetchJson(url, ua) {
  // a per-request timeout so a slow/rate-limited LRCLIB call can never hang the run
  const r = await fetch(url, { headers: ua, signal: AbortSignal.timeout(12_000) })
  if (!r.ok) return null
  return r.json()
}

async function fetchLyrics(title, artist) {
  const ua = { 'User-Agent': 'bwc-portfolio-verse/1.0 (https://github.com/boyzwhocried/bwc-portfolio)' }
  const get = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`
  try {
    const j = await fetchJson(get, ua)
    if (j && j.plainLyrics && !j.instrumental) return j.plainLyrics
  } catch {}
  // fallback: search and take the first hit that carries plain lyrics
  try {
    const s = `https://lrclib.net/api/search?q=${encodeURIComponent(`${title} ${artist}`)}`
    const arr = await fetchJson(s, ua)
    const hit = Array.isArray(arr) ? arr.find((x) => x.plainLyrics && !x.instrumental) : null
    if (hit) return hit.plainLyrics
  } catch {}
  return null
}

async function tasteSongs(supabase) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('spotify_history')
    .select('payload')
    .eq('key', 'top_tracks')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return []
  const p = data.payload || {}
  const buckets = [...(p.long_term || []), ...(p.medium_term || [])]
  const out = []
  const seen = new Set()
  for (const t of buckets) {
    if (!t || !t.name || !t.artist) continue
    const k = `${t.name}::${t.artist}`.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push({ title: t.name, artist: t.artist, source: 'taste' })
  }
  return out
}

function popularSongs() {
  const p = join(HERE, 'popular.json')
  if (!existsSync(p)) return []
  try { return JSON.parse(readFileSync(p, 'utf8')).map((s) => ({ ...s, source: 'popular' })) } catch { return [] }
}

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  let supabase = null
  if (url && key) {
    const { createClient } = await import('@supabase/supabase-js')
    supabase = createClient(url, key, { auth: { persistSession: false } })
  }

  let songs
  if (songsFile) {
    songs = JSON.parse(readFileSync(songsFile, 'utf8'))
  } else {
    songs = [...(await tasteSongs(supabase)), ...popularSongs()]
  }
  if (songs.length === 0) {
    console.error('no songs to curate (need --songs file, popular.json, or DB taste). aborting.')
    process.exit(1)
  }

  const rows = []
  for (const s of songs) {
    const lyrics = await fetchLyrics(s.title, s.artist)
    const lines = pickLines(lyrics, s.title)
    for (const line of lines) {
      rows.push({ line, song: s.title, artist: s.artist, source: s.source || 'popular', pack: PACK, char_len: line.length })
    }
    process.stderr.write(`${lines.length ? '+'.repeat(lines.length).padEnd(MAX_PER_SONG) : '.   '} ${s.artist} — ${s.title}\n`)
    await sleep(REQ_DELAY_MS)
  }

  if (EMIT || !supabase) {
    if (!supabase && !EMIT) process.stderr.write('\n(no service-role key: emitting JSON instead of writing)\n')
    process.stdout.write(JSON.stringify(rows, null, 2) + '\n')
    return
  }

  // de-dupe on the unique `line` column; do nothing on conflict
  const { error } = await supabase.from('sandbox_verse_bank').upsert(rows, { onConflict: 'line', ignoreDuplicates: true })
  if (error) { console.error('upsert failed:', error.message); process.exit(1) }
  process.stderr.write(`\nupserted ${rows.length} candidate lines into sandbox_verse_bank.\n`)
}

main().catch((e) => { console.error(e); process.exit(1) })
