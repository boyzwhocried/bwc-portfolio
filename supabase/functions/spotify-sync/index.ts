// spotify-sync: Supabase edge function (Deno)
//
// Refreshes the slow Spotify data the /music room reads, on a pg_cron schedule.
// Writes into public.spotify_cache (public read). Page visits make 0 Spotify calls.
//
// What it does each run:
//   1. refresh_token -> access_token
//   2. top tracks + top artists (3 ranges each), recently-played
//   3. resolve this-month playlist by name "#YYMM" (matches spotify_monthly_rollover.py)
//   4. of-insta (fixed id) + the curated shelf from public.spotify_playlists
//   5. any shelf playlist with a null description -> generate ONE vibe line via Claude Haiku,
//      write it back to public.spotify_playlists (generated once, then reused)
//   6. keep-last-good: only overwrite a cache key when its fetch succeeded
//
// Secrets (Deno.env, set as Supabase function secrets, never committed):
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN,
//   ANTHROPIC_API_KEY, SYNC_SECRET
//   (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase)

import { createClient } from 'jsr:@supabase/supabase-js@2'

const OF_INSTA_ID = '7ua1oGuss0hr0MnpxvN345'
const TOP_RANGES = ['short_term', 'medium_term', 'long_term'] as const
const SPOTIFY = 'https://api.spotify.com/v1'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---- Spotify auth -----------------------------------------------------------

async function getAccessToken(): Promise<string> {
  const creds = btoa(
    `${Deno.env.get('SPOTIFY_CLIENT_ID')}:${Deno.env.get('SPOTIFY_CLIENT_SECRET')}`,
  )
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: Deno.env.get('SPOTIFY_REFRESH_TOKEN')!,
    }),
  })
  if (!res.ok) throw new Error(`token refresh failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.access_token as string
}

// GET with one 429 backoff retry. Returns parsed JSON or throws.
async function api(token: string, path: string): Promise<any> {
  const url = path.startsWith('http') ? path : `${SPOTIFY}${path}`
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 429) {
      const wait = Number(res.headers.get('Retry-After') ?? '2')
      await sleep((wait + 1) * 1000)
      continue
    }
    if (!res.ok) throw new Error(`${res.status} on ${path}: ${await res.text()}`)
    await sleep(120) // gentle spacing under the rolling rate window
    return res.json()
  }
  throw new Error(`429 exhausted on ${path}`)
}

// ---- shape helpers ----------------------------------------------------------

const img = (images: any[] | undefined) => images?.[0]?.url ?? ''

function trackOf(t: any): any {
  return {
    name: t?.name ?? '',
    artist: (t?.artists ?? []).map((a: any) => a.name).join(', '),
    album: t?.album?.name ?? '',
    image: img(t?.album?.images),
    url: t?.external_urls?.spotify ?? '',
  }
}

// ---- Spotify fetchers -------------------------------------------------------

async function fetchTop(token: string, type: 'tracks' | 'artists') {
  const out: Record<string, any[]> = {}
  for (const range of TOP_RANGES) {
    const data = await api(token, `/me/top/${type}?time_range=${range}&limit=20`)
    out[range] = (data.items ?? []).map((it: any) =>
      type === 'tracks'
        ? trackOf(it)
        : { name: it.name, image: img(it.images), url: it.external_urls?.spotify ?? '', genre: it.genres?.[0] },
    )
  }
  return out
}

async function fetchRecent(token: string) {
  const data = await api(token, '/me/player/recently-played?limit=20')
  const seen = new Set<string>()
  const out: any[] = []
  for (const it of data.items ?? []) {
    const t = trackOf(it.track)
    if (seen.has(t.url)) continue // de-dupe repeats
    seen.add(t.url)
    out.push({ ...t, played_at: it.played_at })
  }
  return out
}

async function playlistMeta(token: string, id: string) {
  const data = await api(
    token,
    `/playlists/${id}?fields=id,name,description,images,external_urls(spotify),tracks(total)`,
  )
  return {
    id: data.id,
    name: data.name,
    spotifyDescription: (data.description ?? '').trim(), // the owner's own blurb, if any
    image: img(data.images),
    count: data.tracks?.total ?? 0,
    url: data.external_urls?.spotify ?? `https://open.spotify.com/playlist/${id}`,
  }
}

async function playlistSample(token: string, id: string, limit: number) {
  const data = await api(
    token,
    `/playlists/${id}/tracks?limit=${limit}&fields=items(track(name,artists(name),album(name,images),external_urls(spotify)))`,
  )
  return (data.items ?? []).map((it: any) => trackOf(it.track)).filter((t: any) => t.name)
}

// resolve current-month diary playlist "#YYMM" by name (owned). Falls back to the
// highest #YYMM found so the room never blanks mid-rollover.
async function resolveThisMonth(token: string): Promise<string | null> {
  const now = new Date()
  const target = `#${String(now.getUTCFullYear() % 100).padStart(2, '0')}${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  let url: string | null = '/me/playlists?limit=50'
  const monthly: string[] = []
  let exact: string | null = null
  while (url) {
    const data: any = await api(token, url)
    for (const pl of data.items ?? []) {
      if (pl?.name === target) exact = pl.id
      if (/^#\d{4}$/.test(pl?.name ?? '')) monthly.push(`${pl.name}|${pl.id}`)
    }
    url = data.next
  }
  if (exact) return exact
  if (monthly.length) return monthly.sort().at(-1)!.split('|')[1]
  return null
}

// ---- AI description (Claude Haiku), best-effort ------------------------------

// First-person, in the owner's casual voice. Context = playlist name + the owner's
// OWN Spotify description (strongest signal, his actual words) + a track sample.
// No private/wiki context (public page). Truly personal meaning is set by hand.
async function describe(
  name: string,
  spotifyDescription: string,
  tracks: any[],
): Promise<string | null> {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key || tracks.length === 0) return null
  const sample = tracks.slice(0, 30).map((t) => `${t.artist} - ${t.name}`).join('\n')
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 60,
        system:
          'You write one-line playlist blurbs in the FIRST PERSON, as the playlist owner ' +
          'describing what the playlist is to him for visitors on his personal site. ' +
          'Voice: casual, warm, lowercase, a little dry. Like telling a friend, not a music critic. ' +
          'Priority of signal: (1) if the playlist has its OWN description, base the blurb on what it ' +
          'says, just rephrased in my casual voice, and never contradict it; (2) otherwise read the ' +
          'playlist NAME personally (e.g. "sound of eca" -> "tracks that remind me of eca"); ' +
          '(3) use the tracks only to confirm the mood. ' +
          'Hard rules: use "i"/"my"; max 13 words; all lowercase; no emoji, no quotes, no hashtags, ' +
          'no em-dashes; do not name-drop specific artists; do not invent personal facts (who someone ' +
          'is, feelings, backstory) not present in the name or description. Output ONLY the line.',
        messages: [{
          role: 'user',
          content:
            `playlist name: "${name}"\n` +
            (spotifyDescription
              ? `the playlist's own description (my words): "${spotifyDescription}"\n`
              : `(this playlist has no description of its own)\n`) +
            `some of my tracks in it:\n${sample}\n\nwrite my one-line blurb:`,
        }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = (data.content?.[0]?.text ?? '').trim().replace(/^["']|["']$/g, '').replace(/—/g, ',')
    return text || null
  } catch {
    return null
  }
}

// ---- main -------------------------------------------------------------------

Deno.serve(async (req) => {
  // gate: shared secret (pg_cron passes it). Reject everything else.
  const secret = Deno.env.get('SYNC_SECRET')
  if (secret && req.headers.get('x-sync-secret') !== secret) {
    return new Response('forbidden', { status: 403 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const result: Record<string, string> = {}
  const upserts: { key: string; payload: any }[] = []
  const keep = async (key: string, fn: () => Promise<any>) => {
    try {
      const payload = await fn()
      upserts.push({ key, payload })
      result[key] = 'ok'
    } catch (e) {
      result[key] = `skip: ${String(e).slice(0, 120)}` // keep-last-good
    }
  }

  let token: string
  try {
    token = await getAccessToken()
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }

  // slow taste data
  await keep('top_tracks', () => fetchTop(token, 'tracks'))
  await keep('top_artists', () => fetchTop(token, 'artists'))
  await keep('recently_played', () => fetchRecent(token))

  // of-insta feature (count is live, no more hardcoded ~1130)
  await keep('playlist_of_insta', async () => {
    const meta = await playlistMeta(token, OF_INSTA_ID)
    const tracks = await playlistSample(token, OF_INSTA_ID, 6)
    return { ...meta, description: null, tracks }
  })

  // this-month diary
  await keep('playlist_this_month', async () => {
    const id = await resolveThisMonth(token)
    if (!id) throw new Error('no #YYMM playlist found')
    const meta = await playlistMeta(token, id)
    const tracks = await playlistSample(token, id, 6)
    return { ...meta, description: null, tracks }
  })

  // the shelf, from the config table
  await keep('playlists_shelf', async () => {
    const { data: rows, error } = await supabase
      .from('spotify_playlists')
      .select('id, category, position, title_override, description, description_locked, enabled')
      .eq('enabled', true)
      .order('position', { ascending: true })
    if (error) throw new Error(error.message)

    const cards: any[] = []
    for (const row of rows ?? []) {
      let meta
      try {
        meta = await playlistMeta(token, row.id)
      } catch (e) {
        console.error(`shelf playlist ${row.id} meta failed: ${e}`)
        continue // drop this card this run, keep the rest
      }

      // auto-generate description once
      let description = row.description as string | null
      if (!description && !row.description_locked) {
        try {
          const sample = await playlistSample(token, row.id, 30)
          description = await describe(row.title_override ?? meta.name, meta.spotifyDescription, sample)
          if (description) {
            await supabase.from('spotify_playlists').update({ description }).eq('id', row.id)
          }
        } catch (e) {
          console.error(`describe ${row.id} failed: ${e}`)
        }
      }

      cards.push({
        id: row.id,
        category: row.category,
        position: row.position,
        name: row.title_override ?? meta.name,
        description,
        image: meta.image,
        count: meta.count,
        url: meta.url,
      })
    }
    if (cards.length === 0) throw new Error('no shelf cards resolved')
    return cards
  })

  // commit successful keys only
  for (const u of upserts) {
    const { error } = await supabase
      .from('spotify_cache')
      .upsert({ key: u.key, payload: u.payload, updated_at: new Date().toISOString() })
    if (error) result[u.key] = `db-fail: ${error.message}`
  }

  return new Response(JSON.stringify({ synced: result }, null, 2), {
    headers: { 'content-type': 'application/json' },
  })
})
