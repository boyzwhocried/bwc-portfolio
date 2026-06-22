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
//   7. append a dated snapshot per key into public.spotify_history (one row per
//      UTC day, last sync wins) so obsession/mood views can read change over time
//   8. obsession themes: when one album dominates the short-term tracks, fetch
//      lyrics from LRCLIB (free, keyless community DB), distill 3-6 abstract
//      theme tags via Haiku, cache as obsession_themes (tags only; lyric text
//      discarded, never stored or shown). Weekly TTL per subject.
//
// Secrets (Deno.env, set as Supabase function secrets, never committed):
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN,
//   ANTHROPIC_API_KEY, SYNC_SECRET
//   (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase)

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  firstLastAdded, eraSpan, decadeHistogram, topArtists, pickSampleTracks,
  anchorFallback, moodPalette, type StatTrack,
} from './playlistStats.ts'

const OF_INSTA_ID = '7ua1oGuss0hr0MnpxvN345'
const TOP_RANGES = ['short_term', 'medium_term', 'long_term'] as const
const SPOTIFY = 'https://api.spotify.com/v1'
const SCAN_CAP = 100
const DETAIL_TTL_MS = 7 * 86_400_000 // regenerate a detail at most weekly even if unchanged

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
    `/playlists/${id}?fields=id,name,description,snapshot_id,images,external_urls(spotify),tracks(total)`,
  )
  return {
    id: data.id,
    name: data.name,
    spotifyDescription: (data.description ?? '').trim(), // the owner's own blurb, if any
    snapshotId: (data.snapshot_id ?? '') as string,
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

// Paginate a playlist's tracks up to `cap`, capturing added_at and the album
// release year for the stat layer. Returns sampled=true when the playlist has
// more tracks than the cap (stats then describe a sample, not the whole list).
async function fetchAllTracks(token: string, id: string, cap: number): Promise<{ tracks: StatTrack[]; sampled: boolean }> {
  const out: StatTrack[] = []
  let url: string | null =
    `/playlists/${id}/tracks?limit=50&fields=next,items(added_at,track(name,artists(name),album(name,images,release_date),external_urls(spotify)))`
  let total = 0
  while (url && out.length < cap) {
    const data: any = await api(token, url)
    for (const it of data.items ?? []) {
      total++
      const tk = it?.track
      if (!tk?.name) continue
      const base = trackOf(tk)
      const yr = parseInt(String(tk?.album?.release_date ?? '').slice(0, 4), 10)
      out.push({
        name: base.name,
        artist: base.artist,
        album: base.album,
        image: base.image,
        url: base.url,
        addedAt: it?.added_at ?? '',
        releaseYear: Number.isFinite(yr) ? yr : null,
      })
      if (out.length >= cap) break
    }
    url = data.next
  }
  return { tracks: out, sampled: !!url || total > out.length }
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

// ---- obsession themes (LRCLIB + Haiku), best-effort ---------------------------
// Derived theme TAGS only. Lyrics come from LRCLIB (lrclib.net), the open
// community lyrics database: free, keyless, public API. We distill abstract
// tags with Haiku and DISCARD the text: lyric lines are never stored, cached,
// or displayed anywhere. TTL keeps steady-state API usage near zero.

const THEME_TTL_MS = 7 * 86_400_000 // refresh weekly per subject
const THEME_TRACKS = 5
const LRCLIB = 'https://lrclib.net/api'
const LRCLIB_UA = 'bwc-portfolio spotify-sync (https://boyzwhocried.xyz)'

// dominant album in the short-term top tracks (same thresholds as the site's
// obsession engine: >= 4 tracks and >= 35% share)
function topAlbum(shortTracks: any[] | undefined): { album: string; artist: string; tracks: any[] } | null {
  const list = shortTracks ?? []
  if (list.length === 0) return null
  const by = new Map<string, any[]>()
  for (const t of list) {
    const key = `${t.album}|${String(t.artist ?? '').split(',')[0].trim()}`
    if (!by.has(key)) by.set(key, [])
    by.get(key)!.push(t)
  }
  let best: any[] | null = null
  for (const v of by.values()) if (!best || v.length > best.length) best = v
  if (!best || !best[0]?.album || best.length < 4 || best.length / list.length < 0.35) return null
  return { album: best[0].album, artist: String(best[0].artist ?? '').split(',')[0].trim(), tracks: best }
}

// exact get first (artist+track+album), then search fallback (album versions
// differ). Returns plain lyric text for in-memory distillation only.
async function lyricText(track: string, artist: string, album: string): Promise<string | null> {
  const headers = { 'User-Agent': LRCLIB_UA }
  try {
    const exact = await fetch(
      `${LRCLIB}/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}&album_name=${encodeURIComponent(album)}`,
      { headers },
    )
    if (exact.ok) {
      const j = await exact.json()
      const body = (j?.plainLyrics as string | undefined)?.trim()
      if (body) return body
    }
    const search = await fetch(
      `${LRCLIB}/search?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}`,
      { headers },
    )
    if (!search.ok) return null
    const list = (await search.json()) as any[]
    const hit = (list ?? []).find((r) => (r?.plainLyrics as string | undefined)?.trim())
    return ((hit?.plainLyrics as string | undefined)?.trim()) || null
  } catch {
    return null
  }
}

async function distillThemes(snippets: string[]): Promise<string[] | null> {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key || snippets.length === 0) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 120,
        system:
          'You distill song lyrics into abstract theme tags. Output ONLY a JSON array of 3 to 6 ' +
          'short kebab-case theme tags, e.g. ["grief","nostalgia","self-erasure"]. ' +
          'Hard rules: tags name abstract themes or emotions; never quote lyric words, lines, or ' +
          'phrases; no artist, song, or album names; no em-dashes; all lowercase; JSON array only.',
        messages: [{
          role: 'user',
          content: `lyric excerpts from one album (partial snippets):\n\n${snippets.join('\n\n---\n\n').slice(0, 6000)}\n\noutput the theme tag array:`,
        }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const raw = (data.content?.[0]?.text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return null
    const tags = arr
      .filter((x: unknown) => typeof x === 'string')
      .map((x: string) => x.trim().toLowerCase())
      .filter((x: string) => /^[a-z][a-z0-9-]{1,30}$/.test(x))
      .slice(0, 6)
    return tags.length >= 3 ? tags : null
  } catch {
    return null
  }
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

// ---- playlist detail enrichment (Haiku + LRCLIB), best-effort -----------------

const PLAYLIST_THEME_TRACKS = 4

// abstract theme tags for a playlist, from a few of its tracks' lyrics. Same
// privacy invariant as obsession themes: lyric text is fetched in-memory and
// discarded; only tags survive.
async function playlistThemeTags(tracks: StatTrack[]): Promise<string[]> {
  const texts: string[] = []
  for (const tk of tracks.slice(0, PLAYLIST_THEME_TRACKS)) {
    const s = await lyricText(tk.name, tk.artist, tk.album)
    if (s) texts.push(s)
    await sleep(150)
  }
  if (texts.length === 0) return []
  return (await distillThemes(texts)) ?? []
}

// A short read for one playlist: narrative (2 to 4 sentences, the owner's casual
// lowercase voice), a mood label, and the most emblematic track. Returns nulls
// on any failure. No lyric quoting; no em-dash.
async function describePlaylistDetail(
  name: string, spotifyDescription: string, tracks: StatTrack[], themeTags: string[],
): Promise<{ narrative: string | null; mood: string | null; anchor: { name: string; artist: string } | null }> {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key || tracks.length === 0) return { narrative: null, mood: null, anchor: null }
  const sample = tracks.slice(0, 30).map((tk) => `${tk.artist} - ${tk.name}`).join('\n')
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 260,
        system:
          'You describe one music playlist for visitors on the owner\'s personal site, in the ' +
          'FIRST PERSON as the owner. Output ONLY a JSON object: ' +
          '{"narrative": string, "mood": string, "anchor": {"name": string, "artist": string}}. ' +
          'narrative: 2 to 4 sentences, casual, warm, lowercase, a little dry, like telling a friend. ' +
          'Base it on the playlist name and its own description if present; use the tracks and theme ' +
          'tags only to confirm the feel. mood: 2 to 4 lowercase words for the overall feeling ' +
          '(e.g. "restless and blue"). anchor: the single most emblematic track, copied EXACTLY from ' +
          'the provided list (name and artist verbatim). ' +
          'Hard rules: use "i"/"my"; all lowercase; no emoji, no hashtags, no quotes inside strings, ' +
          'no em-dashes; never quote song lyrics; do not invent personal facts not in the name or ' +
          'description. JSON object only.',
        messages: [{
          role: 'user',
          content:
            `playlist name: "${name}"\n` +
            (spotifyDescription ? `its own description (my words): "${spotifyDescription}"\n` : `(no description of its own)\n`) +
            (themeTags.length ? `lyric theme tags: ${themeTags.join(', ')}\n` : '') +
            `some tracks:\n${sample}\n\noutput the JSON:`,
        }],
      }),
    })
    if (!res.ok) return { narrative: null, mood: null, anchor: null }
    const data = await res.json()
    const raw = (data.content?.[0]?.text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const obj = JSON.parse(raw)
    const clean = (s: unknown) => (typeof s === 'string' ? s.replace(/—/g, ',').trim() : null)
    const narrative = clean(obj?.narrative)
    const mood = clean(obj?.mood)
    const anchor = obj?.anchor && typeof obj.anchor?.name === 'string' && typeof obj.anchor?.artist === 'string'
      ? { name: clean(obj.anchor.name)!, artist: clean(obj.anchor.artist)! } : null
    return { narrative, mood, anchor }
  } catch {
    return { narrative: null, mood: null, anchor: null }
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

  // obsession themes: derived tags for the dominant album (lyric text discarded)
  await keep('obsession_themes', async () => {
    const tt = upserts.find((u) => u.key === 'top_tracks')?.payload
    const top = topAlbum(tt?.short_term)
    if (!top) throw new Error('no dominant album this window (skip)')

    // TTL reuse: same subject within a week = keep the existing tags untouched
    const { data: prior } = await supabase
      .from('spotify_cache')
      .select('payload, updated_at')
      .eq('key', 'obsession_themes')
      .maybeSingle()
    if (
      prior?.payload?.subject === top.album &&
      Date.now() - new Date(prior.updated_at).getTime() < THEME_TTL_MS
    ) {
      return prior.payload
    }

    const texts: string[] = []
    for (const t of top.tracks.slice(0, THEME_TRACKS)) {
      const s = await lyricText(t.name, top.artist, top.album)
      if (s) texts.push(s)
      await sleep(150)
    }
    if (texts.length === 0) throw new Error('no lyrics resolved on lrclib (skip)')

    const themes = await distillThemes(texts)
    if (!themes) throw new Error('theme distillation failed (skip)')

    return { subject: top.album, artist: top.artist, themes }
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

  // per-playlist detail: pre-baked stats for the on-site modal. snapshot_id +
  // TTL gating means an unchanged playlist costs one cheap meta call and reuses
  // the cached detail (no track fetch, no LLM). Phase A computes stats only.
  await keep('playlist_details', async () => {
    const { data: priorRow } = await supabase
      .from('spotify_cache').select('payload, updated_at').eq('key', 'playlist_details').maybeSingle()
    const prior = (priorRow?.payload ?? {}) as Record<string, any>
    const priorAt = priorRow?.updated_at ? new Date(priorRow.updated_at).getTime() : 0

    // every playlist we surface: the shelf rows + this-month + of-insta
    const ids = new Set<string>()
    const { data: shelfRows } = await supabase
      .from('spotify_playlists').select('id').eq('enabled', true)
    for (const r of shelfRows ?? []) ids.add(r.id as string)
    ids.add(OF_INSTA_ID)
    const thisMonthId = await resolveThisMonth(token).catch(() => null)
    if (thisMonthId) ids.add(thisMonthId)

    // obsession subject (album) for the cross-link badge
    const obs = upserts.find((u) => u.key === 'obsession_themes')?.payload
    const obsessionAlbum = (obs?.subject ?? '').toString().toLowerCase()

    const details: Record<string, any> = {}
    for (const id of ids) {
      let meta
      try { meta = await playlistMeta(token, id) } catch { continue }

      const cached = prior[id]
      if (cached && cached.snapshotId === meta.snapshotId && Date.now() - priorAt < DETAIL_TTL_MS) {
        details[id] = { ...cached, name: meta.name, image: meta.image, count: meta.count, url: meta.url }
        continue
      }

      let scan: { tracks: StatTrack[]; sampled: boolean }
      try { scan = await fetchAllTracks(token, id, SCAN_CAP) } catch { continue }
      const { tracks, sampled } = scan
      const { first, last } = firstLastAdded(tracks)
      const era = eraSpan(tracks)
      const tops = topArtists(tracks, 4)
      const isObsession = !!obsessionAlbum && tracks.some((x) => (x.album ?? '').toLowerCase() === obsessionAlbum)

      // LLM enrichment (best-effort): theme tags from lyrics (text discarded),
      // then a narrative + mood + anchor pick. Failures leave nulls.
      const themeTags = await playlistThemeTags(tracks)
      const llm = await describePlaylistDetail(meta.name, meta.spotifyDescription, tracks, themeTags)
      const llmMatch = llm.anchor ? tracks.find((x) => x.name === llm.anchor!.name) : undefined
      const anchor = llmMatch
        ? { name: llm.anchor!.name, artist: llm.anchor!.artist, image: llmMatch.image, url: llmMatch.url }
        : anchorFallback(tracks)

      details[id] = {
        id,
        name: meta.name,
        url: meta.url,
        image: meta.image,
        count: meta.count,
        description: meta.spotifyDescription || cached?.description || null,
        snapshotId: meta.snapshotId,
        firstAdded: first,
        lastAdded: last,
        eraFrom: era.from,
        eraTo: era.to,
        decades: decadeHistogram(tracks),
        topArtists: tops,
        sampleTracks: pickSampleTracks(tracks, 6),
        anchorTrack: anchor,
        narrative: llm.narrative ?? null,
        mood: llm.mood ?? null,
        moodPalette: moodPalette(llm.mood ?? ''),
        themeTags,
        isObsession,
        sampled,
        generatedAt: new Date().toISOString(),
      }
    }
    if (Object.keys(details).length === 0) throw new Error('no playlist details resolved')
    return details
  })

  // commit successful keys only
  for (const u of upserts) {
    const { error } = await supabase
      .from('spotify_cache')
      .upsert({ key: u.key, payload: u.payload, updated_at: new Date().toISOString() })
    if (error) result[u.key] = `db-fail: ${error.message}`
  }

  // dated history append (spotify_history): one row per key per UTC day, last
  // sync of the day wins. Powers the over-time obsession/mood views. Strictly
  // best-effort: a history failure must never break the cache commit above.
  const HISTORY_KEYS = new Set([
    'top_tracks',
    'top_artists',
    'recently_played',
    'playlist_this_month',
    'playlist_of_insta',
    'obsession_themes',
  ])
  const snapshotDate = new Date().toISOString().slice(0, 10)
  for (const u of upserts) {
    if (!HISTORY_KEYS.has(u.key)) continue
    try {
      const { error } = await supabase
        .from('spotify_history')
        .upsert({
          snapshot_date: snapshotDate,
          key: u.key,
          payload: u.payload,
          updated_at: new Date().toISOString(),
        })
      result[`history:${u.key}`] = error ? `db-fail: ${error.message}` : 'ok'
    } catch (e) {
      result[`history:${u.key}`] = `skip: ${String(e).slice(0, 120)}`
    }
  }

  return new Response(JSON.stringify({ synced: result }, null, 2), {
    headers: { 'content-type': 'application/json' },
  })
})
