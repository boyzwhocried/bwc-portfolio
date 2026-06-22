# Music Playlist Detail Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking any playlist card on `/music` opens an on-site modal with a rich, pre-baked picture of that playlist (narrative, mood, what-it-is-about, dates, stats), deep-linkable via `#p=<id>`.

**Architecture:** All per-playlist data is computed once in the `spotify-sync` edge function and cached in a new `spotify_cache` key `playlist_details` (a map of id to detail). `/music` reads it in the existing single round-trip; the modal renders from the already-loaded prop, so there are zero Spotify or LLM calls per visit. Deterministic stats live in a pure, dependency-free module shared by the Deno edge function and the Node/vitest tests; LLM narrative/mood/tags are best-effort enrichment layered on after.

**Tech Stack:** Next 16 (App Router), TypeScript, Supabase (Postgres + Deno edge functions), vitest, framer-motion. LLM = Claude Haiku (`claude-haiku-4-5`). Lyrics from LRCLIB (keyless).

## Global Constraints

- Zero Spotify or LLM calls per page visit. Everything is pre-baked in `spotify-sync` and read from `spotify_cache`.
- Lyric text is NEVER stored, cached, or shown. Lyrics are fetched in-memory from LRCLIB, distilled to abstract theme tags by Haiku, then discarded. Tags, mood, and narrative must never quote lyric words, lines, or phrases.
- NO em-dash (U+2014) anywhere in `src/**` or `supabase/functions/**` (portfolio PreToolUse guard hard-blocks it). Use commas or parentheses. This applies to generated LLM copy too (the system prompts forbid it).
- The shared stats module is pure: NO Deno globals (`Deno.*`), NO `jsr:`/`npm:` imports, NO `@/` path alias. Plain TypeScript so both Deno and vitest can load it.
- Next version floor `^16.2.9`; deploy-guard must PASS before any prod deploy.
- LLM model is `claude-haiku-4-5`, max_tokens kept small, best-effort (a failure degrades gracefully, never throws into the cache commit).
- Stats scan is capped at 100 tracks per playlist (`SCAN_CAP`); the exact total still comes from playlist meta. A capped scan sets `sampled: true`.
- Regeneration is gated by Spotify `snapshot_id` plus a TTL (`DETAIL_TTL_MS`, 7 days) so steady-state cost is near zero.

---

## PHASE A — Cheap layer (independently shippable: modal + full description + dates + stats + deep-link, no LLM)

### Task 1: Pure stats module — date and era functions

**Files:**
- Create: `supabase/functions/_shared/playlistStats.ts`
- Create: `supabase/functions/_shared/playlistStats.test.ts`
- Modify: `vitest.config.ts:11`

**Interfaces:**
- Produces: `StatTrack`, `SampleTrack`, `DecadeBucket` types; `firstLastAdded(tracks: StatTrack[]): { first: string | null; last: string | null }`; `eraSpan(tracks: StatTrack[]): { from: number | null; to: number | null }`; `decadeHistogram(tracks: StatTrack[]): DecadeBucket[]`.

- [ ] **Step 1: Extend the vitest include so the new test runs**

Modify `vitest.config.ts:11` from:
```ts
    include: ['src/lib/**/*.test.ts', 'scripts/verse/**/*.test.mjs'],
```
to:
```ts
    include: ['src/lib/**/*.test.ts', 'scripts/verse/**/*.test.mjs', 'supabase/functions/_shared/**/*.test.ts'],
```

- [ ] **Step 2: Write the failing test**

Create `supabase/functions/_shared/playlistStats.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { firstLastAdded, eraSpan, decadeHistogram, type StatTrack } from './playlistStats'

function t(over: Partial<StatTrack>): StatTrack {
  return { name: 'n', artist: 'a', album: 'al', image: '', url: '', addedAt: '', releaseYear: null, ...over }
}

describe('firstLastAdded', () => {
  it('returns nulls for an empty list', () => {
    expect(firstLastAdded([])).toEqual({ first: null, last: null })
  })
  it('returns min and max ISO added dates, ignoring blanks', () => {
    const r = firstLastAdded([
      t({ addedAt: '2025-03-10T00:00:00Z' }),
      t({ addedAt: '' }),
      t({ addedAt: '2025-06-01T00:00:00Z' }),
      t({ addedAt: '2025-01-02T00:00:00Z' }),
    ])
    expect(r).toEqual({ first: '2025-01-02T00:00:00Z', last: '2025-06-01T00:00:00Z' })
  })
})

describe('eraSpan', () => {
  it('returns nulls when no release years', () => {
    expect(eraSpan([t({ releaseYear: null })])).toEqual({ from: null, to: null })
  })
  it('returns min and max release year', () => {
    expect(eraSpan([t({ releaseYear: 2018 }), t({ releaseYear: 1998 }), t({ releaseYear: 2024 })]))
      .toEqual({ from: 1998, to: 2024 })
  })
})

describe('decadeHistogram', () => {
  it('buckets release years by decade, sorted ascending', () => {
    expect(decadeHistogram([
      t({ releaseYear: 1998 }), t({ releaseYear: 1995 }),
      t({ releaseYear: 2012 }), t({ releaseYear: 2024 }), t({ releaseYear: null }),
    ])).toEqual([
      { decade: 1990, count: 2 },
      { decade: 2010, count: 1 },
      { decade: 2020, count: 1 },
    ])
  })
  it('returns empty for no dated tracks', () => {
    expect(decadeHistogram([t({ releaseYear: null })])).toEqual([])
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- playlistStats`
Expected: FAIL with a resolve error (cannot find `./playlistStats`).

- [ ] **Step 4: Write the minimal implementation**

Create `supabase/functions/_shared/playlistStats.ts`:
```ts
// Pure, dependency-free playlist statistics. Runs in the Deno edge function
// (spotify-sync) AND is unit-tested by vitest (Node). So: no Deno globals, no
// jsr/npm imports, no path aliases. Plain TypeScript only.

export interface StatTrack {
  name: string
  artist: string // primary (first credited) artist
  album: string
  image: string
  url: string
  addedAt: string // ISO timestamp the track was added to the playlist ('' if unknown)
  releaseYear: number | null
}

export interface SampleTrack {
  name: string
  artist: string
  image: string
  url: string
}

export interface DecadeBucket {
  decade: number // e.g. 1990, 2000, 2010
  count: number
}

export function firstLastAdded(tracks: StatTrack[]): { first: string | null; last: string | null } {
  const dates = tracks.map((x) => x.addedAt).filter((d): d is string => !!d).sort()
  if (dates.length === 0) return { first: null, last: null }
  return { first: dates[0], last: dates[dates.length - 1] }
}

export function eraSpan(tracks: StatTrack[]): { from: number | null; to: number | null } {
  const years = tracks.map((x) => x.releaseYear).filter((y): y is number => typeof y === 'number')
  if (years.length === 0) return { from: null, to: null }
  return { from: Math.min(...years), to: Math.max(...years) }
}

export function decadeHistogram(tracks: StatTrack[]): DecadeBucket[] {
  const counts = new Map<number, number>()
  for (const x of tracks) {
    if (typeof x.releaseYear !== 'number') continue
    const decade = Math.floor(x.releaseYear / 10) * 10
    counts.set(decade, (counts.get(decade) ?? 0) + 1)
  }
  return [...counts.entries()].map(([decade, count]) => ({ decade, count })).sort((a, b) => a.decade - b.decade)
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- playlistStats`
Expected: PASS (all firstLastAdded / eraSpan / decadeHistogram cases green).

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts supabase/functions/_shared/playlistStats.ts supabase/functions/_shared/playlistStats.test.ts
git commit -m "feat(music): pure playlist stats (dates, era, decades) + tests"
```

---

### Task 2: Pure stats module — artists, sample, anchor, mood palette

**Files:**
- Modify: `supabase/functions/_shared/playlistStats.ts`
- Modify: `supabase/functions/_shared/playlistStats.test.ts`

**Interfaces:**
- Consumes: `StatTrack`, `SampleTrack` from Task 1.
- Produces: `topArtists(tracks: StatTrack[], n: number): { name: string; count: number }[]`; `pickSampleTracks(tracks: StatTrack[], n: number): SampleTrack[]`; `anchorFallback(tracks: StatTrack[]): SampleTrack | null`; `moodPalette(label: string): string[]`.

- [ ] **Step 1: Write the failing tests**

Append to `supabase/functions/_shared/playlistStats.test.ts`:
```ts
import { topArtists, pickSampleTracks, anchorFallback, moodPalette } from './playlistStats'

describe('topArtists', () => {
  it('tallies primary artists, ranks by count then name, caps at n', () => {
    const r = topArtists([
      t({ artist: 'Deftones' }), t({ artist: 'Deftones' }), t({ artist: 'Korn' }),
      t({ artist: 'Sleep Token' }), t({ artist: 'Sleep Token' }), t({ artist: 'Sleep Token' }),
      t({ artist: '' }),
    ], 2)
    expect(r).toEqual([
      { name: 'Sleep Token', count: 3 },
      { name: 'Deftones', count: 2 },
    ])
  })
})

describe('pickSampleTracks', () => {
  it('takes the first n as SampleTrack shape', () => {
    const r = pickSampleTracks([
      t({ name: 'a', artist: 'x', image: 'i', url: 'u' }),
      t({ name: 'b' }), t({ name: 'c' }),
    ], 2)
    expect(r).toEqual([
      { name: 'a', artist: 'x', image: 'i', url: 'u' },
      { name: 'b', artist: 'a', image: '', url: '' },
    ])
  })
})

describe('anchorFallback', () => {
  it('returns null for an empty list', () => {
    expect(anchorFallback([])).toBeNull()
  })
  it('picks a track by the most-featured artist', () => {
    const r = anchorFallback([
      t({ name: 'one', artist: 'Korn' }),
      t({ name: 'two', artist: 'Sleep Token' }),
      t({ name: 'three', artist: 'Sleep Token' }),
    ])
    expect(r?.artist).toBe('Sleep Token')
    expect(r?.name).toBe('two')
  })
})

describe('moodPalette', () => {
  it('maps a known mood keyword to its preset swatches', () => {
    expect(moodPalette('restless and blue')).toEqual(['#1a2233', '#2a3a55', '#3a5577', '#5a7799'])
  })
  it('falls back to the default palette for an unknown mood', () => {
    expect(moodPalette('zzz')).toEqual(['#222', '#3a3a3a', '#555', '#777'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- playlistStats`
Expected: FAIL with "topArtists is not a function" (and the others undefined).

- [ ] **Step 3: Write the minimal implementation**

Append to `supabase/functions/_shared/playlistStats.ts`:
```ts
export function topArtists(tracks: StatTrack[], n: number): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const x of tracks) {
    const name = (x.artist ?? '').trim()
    if (!name) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, n)
}

export function pickSampleTracks(tracks: StatTrack[], n: number): SampleTrack[] {
  return tracks.slice(0, n).map((x) => ({ name: x.name, artist: x.artist, image: x.image, url: x.url }))
}

export function anchorFallback(tracks: StatTrack[]): SampleTrack | null {
  if (tracks.length === 0) return null
  const top = topArtists(tracks, 1)[0]
  const pick = top ? tracks.find((x) => x.artist === top.name) ?? tracks[0] : tracks[0]
  return { name: pick.name, artist: pick.artist, image: pick.image, url: pick.url }
}

// Mood label to a fixed swatch set (deterministic). Cover-art color extraction
// is avoided on purpose: Spotify images (i.scdn.co) taint the canvas under CORS.
const MOOD_PALETTES: { match: RegExp; palette: string[] }[] = [
  { match: /(heavy|dark|brood|rage|angry|aggress)/, palette: ['#2a1a1a', '#5a2a2a', '#8a3a2a', '#c24a28'] },
  { match: /(sad|blue|melanch|grief|longing|wistful)/, palette: ['#1a2233', '#2a3a55', '#3a5577', '#5a7799'] },
  { match: /(calm|warm|soft|tender|cozy|gentle)/, palette: ['#332a1a', '#5a4a2a', '#8a7340', '#c2a85a'] },
  { match: /(bright|happy|joy|upbeat|playful|fun)/, palette: ['#2a331a', '#4a5a2a', '#7a8a3a', '#a8c24a'] },
  { match: /(dream|hazy|ethereal|ambient|float)/, palette: ['#2a1a33', '#422a5a', '#5a3a8a', '#7a5ac2'] },
]
const DEFAULT_PALETTE = ['#222', '#3a3a3a', '#555', '#777']

export function moodPalette(label: string): string[] {
  const l = (label ?? '').toLowerCase()
  for (const { match, palette } of MOOD_PALETTES) if (match.test(l)) return palette
  return DEFAULT_PALETTE
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- playlistStats`
Expected: PASS (all cases across both tasks green).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/playlistStats.ts supabase/functions/_shared/playlistStats.test.ts
git commit -m "feat(music): pure playlist stats (artists, sample, anchor, mood palette)"
```

---

### Task 3: Types — PlaylistDetail and MusicData.playlistDetails

**Files:**
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `PlaylistDetail`, `PlaylistDetailSampleTrack` types; `MusicData.playlistDetails: Record<string, PlaylistDetail> | null`.

- [ ] **Step 1: Add the types**

Append to `src/types/index.ts` (after `PlaylistFeature`):
```ts
export interface PlaylistDetailSampleTrack {
  name: string
  artist: string
  image: string
  url: string
}

// Pre-baked per-playlist detail (spotify-sync playlist_details key). Read by
// /music, rendered by PlaylistModal. LLM fields are null until Phase B runs.
export interface PlaylistDetail {
  id: string
  name: string
  url: string
  image: string
  count: number
  description: string | null
  snapshotId: string
  firstAdded: string | null
  lastAdded: string | null
  eraFrom: number | null
  eraTo: number | null
  decades: { decade: number; count: number }[]
  topArtists: { name: string; count: number }[]
  sampleTracks: PlaylistDetailSampleTrack[]
  anchorTrack: PlaylistDetailSampleTrack | null
  narrative: string | null
  mood: string | null
  moodPalette: string[]
  themeTags: string[]
  isObsession: boolean
  sampled: boolean
  generatedAt: string
}
```

- [ ] **Step 2: Add the field to MusicData**

Modify the `MusicData` interface in `src/types/index.ts` to add one line after `obsessionThemes`:
```ts
  playlistDetails: Record<string, PlaylistDetail> | null
```

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: A type error in `src/lib/music.ts` (the `EMPTY` object is missing `playlistDetails`). This is expected and fixed in Task 5. If you want a clean checkpoint, proceed to Task 5 before committing; otherwise commit now and note the known gap.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(music): PlaylistDetail type + MusicData.playlistDetails"
```

---

### Task 4: Edge function — snapshot_id + full track fetch

**Files:**
- Modify: `supabase/functions/spotify-sync/index.ts` (the `playlistMeta` helper around line 115; add a new `fetchAllTracks` helper near `playlistSample`)

**Interfaces:**
- Consumes: `api(token, path)`, `trackOf(t)`, `img()` (existing helpers); `StatTrack` from `../_shared/playlistStats.ts`.
- Produces: `playlistMeta` now returns an added `snapshotId: string`; new `fetchAllTracks(token: string, id: string, cap: number): Promise<{ tracks: StatTrack[]; sampled: boolean }>`.

- [ ] **Step 1: Import the shared stats module**

At the top of `supabase/functions/spotify-sync/index.ts`, after the existing import, add:
```ts
import {
  firstLastAdded, eraSpan, decadeHistogram, topArtists, pickSampleTracks,
  anchorFallback, moodPalette, type StatTrack,
} from '../_shared/playlistStats.ts'
```

- [ ] **Step 2: Add snapshot_id to playlistMeta**

Modify `playlistMeta` (around line 115): add `snapshot_id` to the `fields` querystring and to the return object.
```ts
async function playlistMeta(token: string, id: string) {
  const data = await api(
    token,
    `/playlists/${id}?fields=id,name,description,snapshot_id,images,external_urls(spotify),tracks(total)`,
  )
  return {
    id: data.id,
    name: data.name,
    spotifyDescription: (data.description ?? '').trim(),
    snapshotId: (data.snapshot_id ?? '') as string,
    image: img(data.images),
    count: data.tracks?.total ?? 0,
    url: data.external_urls?.spotify ?? `https://open.spotify.com/playlist/${id}`,
  }
}
```

- [ ] **Step 3: Add fetchAllTracks (paginated, capped, with added_at + release year)**

Add after `playlistSample` (around line 136):
```ts
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
```

- [ ] **Step 4: Typecheck the edge function**

Run: `cd supabase/functions && deno check spotify-sync/index.ts --node-modules-dir=auto ; cd ../..`
Expected: no type errors (the `../_shared/playlistStats.ts` import resolves; `trackOf`/`api`/`img` are in scope).
If `deno` is unavailable in this environment, skip and rely on the Phase A deploy-guard + deploy smoke in Task 8.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/spotify-sync/index.ts
git commit -m "feat(music): sync fetches snapshot_id + full track list for playlist details"
```

---

### Task 5: Edge function — playlist_details build step (stats only, snapshot/TTL gated)

**Files:**
- Modify: `supabase/functions/spotify-sync/index.ts` (add constants near the top; add the build step inside `Deno.serve`, after the `playlists_shelf` keep block around line 439; the `playlist_details` key must be committed by the existing upsert loop)

**Interfaces:**
- Consumes: `fetchAllTracks`, `playlistMeta`, pure stat fns, `OF_INSTA_ID`, `resolveThisMonth`, the `upserts` array, the `supabase` client, the `keep` helper.
- Produces: a new `spotify_cache` row `playlist_details` whose payload is `Record<string, PlaylistDetail>` (PlaylistDetail shape from Task 3; in Phase A `narrative`/`mood`/`themeTags`/`anchorTrack-from-LLM` are null/empty and `moodPalette` uses the default, `anchorTrack` from `anchorFallback`).

- [ ] **Step 1: Add the gating constants**

Near the other consts at the top of the file (after `SPOTIFY`):
```ts
const SCAN_CAP = 100
const DETAIL_TTL_MS = 7 * 86_400_000 // regenerate a detail at most weekly even if unchanged
```

- [ ] **Step 2: Add the build step**

Inside `Deno.serve`, AFTER the `await keep('playlists_shelf', ...)` block and BEFORE the `// commit successful keys only` loop, insert:
```ts
  // per-playlist detail: pre-baked stats for the on-site modal. snapshot_id +
  // TTL gating means an unchanged playlist costs one cheap meta call and reuses
  // the cached detail (no track fetch, no LLM). Phase A computes stats only.
  await keep('playlist_details', async () => {
    // prior cache for snapshot/TTL reuse
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

      details[id] = {
        id,
        name: meta.name,
        url: meta.url,
        image: meta.image,
        count: meta.count,
        description: cached?.description ?? null,
        snapshotId: meta.snapshotId,
        firstAdded: first,
        lastAdded: last,
        eraFrom: era.from,
        eraTo: era.to,
        decades: decadeHistogram(tracks),
        topArtists: tops,
        sampleTracks: pickSampleTracks(tracks, 6),
        anchorTrack: anchorFallback(tracks),
        narrative: cached?.narrative ?? null,
        mood: cached?.mood ?? null,
        moodPalette: cached?.mood ? moodPalette(cached.mood) : moodPalette(''),
        themeTags: cached?.themeTags ?? [],
        isObsession,
        sampled,
        generatedAt: new Date().toISOString(),
      }
    }
    if (Object.keys(details).length === 0) throw new Error('no playlist details resolved')
    return details
  })
```

- [ ] **Step 3: Confirm the commit loop and history skip**

The existing `for (const u of upserts)` commit loop writes every key, so `playlist_details` is persisted automatically. Confirm `playlist_details` is NOT added to the `HISTORY_KEYS` set (it should not be snapshotted daily). No change needed; just verify by reading the file.

- [ ] **Step 4: Typecheck**

Run: `cd supabase/functions && deno check spotify-sync/index.ts --node-modules-dir=auto ; cd ../..`
Expected: no type errors. (Skip if deno unavailable; rely on Task 8 deploy smoke.)

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/spotify-sync/index.ts
git commit -m "feat(music): build playlist_details (stats, snapshot+TTL gated)"
```

---

### Task 6: lib/music — read playlist_details into MusicData

**Files:**
- Modify: `src/lib/music.ts:4-40`

**Interfaces:**
- Consumes: `PlaylistDetail` type; the `spotify_cache` `playlist_details` key.
- Produces: `MusicData.playlistDetails` populated by `getMusicData()`.

- [ ] **Step 1: Add playlistDetails to the EMPTY constant**

In `src/lib/music.ts`, add to the `EMPTY` object (after `obsessionThemes: null,`):
```ts
  playlistDetails: null,
```

- [ ] **Step 2: Read the key in getMusicData**

In the returned object of `getMusicData()`, add after `obsessionThemes: payload('obsession_themes'),`:
```ts
    playlistDetails: payload('playlist_details'),
```

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: PASS (the Task 3 `MusicData` gap is now closed).

- [ ] **Step 4: Commit**

```bash
git add src/lib/music.ts
git commit -m "feat(music): read playlist_details cache key"
```

---

### Task 7: PlaylistModal component

**Files:**
- Create: `src/components/sections/PlaylistModal.tsx`

**Interfaces:**
- Consumes: `SandboxModal` (`src/components/sections/sandbox/SandboxModal.tsx`), `PlaylistDetail` and `PlaylistDetailSampleTrack` types.
- Produces: `default function PlaylistModal({ detail, fallback, onClose }: { detail?: PlaylistDetail; fallback: PlaylistFallback; onClose: () => void })` and an exported `interface PlaylistFallback { id: string; name: string; image: string; count: number; url: string; description: string | null }`.

- [ ] **Step 1: Write the component**

Create `src/components/sections/PlaylistModal.tsx`:
```tsx
'use client'

import Image from 'next/image'
import SandboxModal from '@/components/sections/sandbox/SandboxModal'
import type { PlaylistDetail, PlaylistDetailSampleTrack } from '@/types'

export interface PlaylistFallback {
  id: string
  name: string
  image: string
  count: number
  url: string
  description: string | null
}

const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }

function fmtAdded(first: string | null, last: string | null): string | null {
  if (!first && !last) return null
  const m = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  if (first && last && m(first) !== m(last)) return `added ${m(first)} to ${m(last)}`
  return `added ${m((last ?? first)!)}`
}

export default function PlaylistModal({ detail, fallback, onClose }: { detail?: PlaylistDetail; fallback: PlaylistFallback; onClose: () => void }) {
  const name = detail?.name ?? fallback.name
  const image = detail?.image ?? fallback.image
  const count = detail?.count ?? fallback.count
  const url = detail?.url ?? fallback.url
  const description = detail?.description ?? fallback.description
  const added = detail ? fmtAdded(detail.firstAdded, detail.lastAdded) : null
  const palette = detail?.moodPalette ?? []

  return (
    <SandboxModal title={name} onClose={onClose} width={560} panelBg="var(--bg)" panelFg="var(--fg)" borderColor="var(--accent)">
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* header: cover + title-as-spotify-link + meta */}
        <div className="flex gap-5">
          <div style={{ width: 96, height: 96, position: 'relative', flexShrink: 0, background: 'var(--accent)' }}>
            {image && <Image src={image} alt="" fill quality={70} sizes="96px" style={{ objectFit: 'cover' }} />}
          </div>
          <div className="min-w-0">
            <a href={url} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70"
               style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--fg)', lineHeight: 1.05, display: 'inline-block' }}>
              {name} <span style={{ color: 'var(--accent)', fontSize: 14 }}>open in spotify ↗</span>
            </a>
            <div style={{ ...mono, marginTop: 8 }}>
              {count.toLocaleString()} tracks{added ? ` · ${added}` : ''}
            </div>
            {detail?.isObsession && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', marginTop: 6 }}>
                ● current obsession lives here
              </div>
            )}
          </div>
        </div>

        {/* narrative + description */}
        {detail?.narrative && <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--fg)' }}>{detail.narrative}</p>}
        {description && <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--muted)' }}>{description}</p>}

        {/* mood + tags */}
        {(detail?.mood || (detail?.themeTags?.length ?? 0) > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {detail?.mood && (
              <div className="flex items-center gap-3">
                <span style={mono}>mood</span>
                <span style={{ fontSize: 13, color: 'var(--fg)' }}>{detail.mood}</span>
                <span className="flex gap-1">
                  {palette.map((c, i) => <span key={i} style={{ width: 14, height: 14, background: c, display: 'inline-block' }} />)}
                </span>
              </div>
            )}
            {(detail?.themeTags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {detail!.themeTags.map((tag) => (
                  <span key={tag} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>#{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* top artists + anchor + era + decades */}
        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--rule)', paddingTop: 14 }}>
            {detail.topArtists.length > 0 && (
              <div style={{ fontSize: 13, color: 'var(--fg)' }}>
                <span style={mono}>heavy on </span>{detail.topArtists.map((a) => a.name).join(', ')}
              </div>
            )}
            {detail.anchorTrack && (
              <div style={{ fontSize: 13 }}>
                <span style={mono}>anchor </span>
                <a href={detail.anchorTrack.url} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70" style={{ color: 'var(--fg)' }}>
                  {detail.anchorTrack.name} — {detail.anchorTrack.artist} ↗
                </a>
              </div>
            )}
            {detail.eraFrom && detail.eraTo && (
              <div className="flex items-center gap-3">
                <span style={mono}>era</span>
                <span style={{ fontSize: 13, color: 'var(--fg)' }}>{detail.eraFrom} to {detail.eraTo}</span>
                <DecadeBars decades={detail.decades} />
              </div>
            )}
          </div>
        )}

        {/* sample strip */}
        {(detail?.sampleTracks?.length ?? 0) > 0 && (
          <div className="flex gap-3 overflow-x-auto" style={{ borderTop: '1px solid var(--rule)', paddingTop: 14 }}>
            {detail!.sampleTracks.map((s, i) => <SampleCard key={`${s.url}-${i}`} s={s} />)}
          </div>
        )}
        {detail?.sampled && <div style={{ ...mono, fontSize: 9 }}>stats sampled from the first {SCAN_PREVIEW} tracks</div>}
      </div>
    </SandboxModal>
  )
}

const SCAN_PREVIEW = 100

function DecadeBars({ decades }: { decades: { decade: number; count: number }[] }) {
  if (decades.length === 0) return null
  const max = Math.max(...decades.map((d) => d.count))
  return (
    <span className="flex items-end gap-0.5" style={{ height: 18 }} aria-hidden>
      {decades.map((d) => (
        <span key={d.decade} title={`${d.decade}s: ${d.count}`} style={{ width: 6, height: Math.max(2, (d.count / max) * 18), background: 'var(--accent)', display: 'inline-block' }} />
      ))}
    </span>
  )
}

function SampleCard({ s }: { s: PlaylistDetailSampleTrack }) {
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 transition-opacity hover:opacity-80" style={{ width: 72 }}>
      <div style={{ width: 72, height: 72, position: 'relative', background: 'var(--accent)' }}>
        {s.image && <Image src={s.image} alt="" fill quality={60} sizes="72px" style={{ objectFit: 'cover' }} />}
      </div>
      <div className="truncate" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginTop: 4, width: 72 }}>{s.name}</div>
    </a>
  )
}
```

- [ ] **Step 2: Verify it typechecks and builds**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/PlaylistModal.tsx
git commit -m "feat(music): PlaylistModal component"
```

---

### Task 8: Wire the modal into MusicPlayer (cards become buttons + deep-link)

**Files:**
- Modify: `src/components/sections/MusicPlayer.tsx` (imports; new state + hash effect in `MusicPlayer`; `ShelfCard` and `BeatFeature` become buttons; render `PlaylistModal`)

**Interfaces:**
- Consumes: `PlaylistModal`, `PlaylistFallback` from Task 7; `music.playlistDetails`; existing `PlaylistCard` and `PlaylistFeature` shapes.
- Produces: a clickable modal flow; `#p=<id>` deep-link.

- [ ] **Step 1: Add imports**

In `src/components/sections/MusicPlayer.tsx`, add to the imports:
```tsx
import PlaylistModal, { type PlaylistFallback } from '@/components/sections/PlaylistModal'
```

- [ ] **Step 2: Add modal state, a fallback lookup, and the hash deep-link effect**

Inside `MusicPlayer`, after the existing `useState`/`useMemo` hooks (after `grouped`), add:
```tsx
  const [openId, setOpenId] = useState<string | null>(null)

  // every playlist we can open, keyed by id, with the minimal fields the modal
  // needs when no pre-baked detail exists yet (graceful fallback).
  const fallbacks = useMemo(() => {
    const map = new Map<string, PlaylistFallback>()
    for (const p of music.shelf ?? []) map.set(p.id, { id: p.id, name: p.name, image: p.image, count: p.count, url: p.url, description: p.description })
    if (music.thisMonth) { const f = music.thisMonth; map.set(f.id, { id: f.id, name: f.name, image: f.image, count: f.count, url: f.url, description: f.description }) }
    if (music.ofInsta) { const f = music.ofInsta; map.set(f.id, { id: f.id, name: 'of insta', image: f.image, count: f.count, url: f.url, description: f.description }) }
    return map
  }, [music.shelf, music.thisMonth, music.ofInsta])

  // deep-link: /music#p=<id> opens that modal; closing clears the hash.
  useEffect(() => {
    const apply = () => {
      const m = window.location.hash.match(/^#p=(.+)$/)
      const id = m ? decodeURIComponent(m[1]) : null
      setOpenId(id && fallbacks.has(id) ? id : null)
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [fallbacks])

  const openPlaylist = (id: string) => {
    if (!fallbacks.has(id)) return
    history.replaceState(null, '', `#p=${encodeURIComponent(id)}`)
    setOpenId(id)
  }
  const closePlaylist = () => {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    setOpenId(null)
  }
```

- [ ] **Step 3: Make ShelfCard open the modal instead of linking out**

Replace the `ShelfCard` function. Change the root from an `<a href={p.url}>` to a `<button onClick={() => onOpen(p.id)}>`, pass an `onOpen` prop, and stop truncating the description (allow up to 2 lines):
```tsx
function ShelfCard({ p, onOpen }: { p: PlaylistCard; onOpen: (id: string) => void }) {
  return (
    <button
      onClick={() => onOpen(p.id)}
      className="mp-card block text-left transition-opacity hover:opacity-95"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%' }}
    >
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', background: 'var(--accent)' }}>
        {p.image && <Image src={p.image} alt="" fill quality={70} sizes="(max-width: 768px) 42vw, 180px" style={{ objectFit: 'cover' }} />}
      </div>
      <div className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--fg)', marginTop: 10 }}>{p.name}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', marginTop: 3 }}>{p.count.toLocaleString()} tracks</div>
      {p.description && (
        <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--muted)', marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {p.description}
        </p>
      )}
    </button>
  )
}
```

- [ ] **Step 4: Pass onOpen where ShelfCard is rendered**

In the shelf grid (around line 436), change:
```tsx
                    {items.map((p) => <ShelfCard key={p.id} p={p} />)}
```
to:
```tsx
                    {items.map((p) => <ShelfCard key={p.id} p={p} onOpen={openPlaylist} />)}
```

- [ ] **Step 5: Make the two BeatFeature blocks open the modal**

`BeatFeature` currently renders an `<a href>`. Add an `onOpen` + `id` prop and switch the root to a button. Replace the `BeatFeature` signature and root element:
```tsx
function BeatFeature({
  id, onOpen, image, label, title, meta, blurb,
}: {
  id: string
  onOpen: (id: string) => void
  image: string
  label: string
  title: string
  meta: string
  blurb: string
}) {
  return (
    <button
      onClick={() => onOpen(id)}
      className="mp-card block text-left transition-opacity hover:opacity-90"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%' }}
    >
```
(Keep the inner markup identical; only the wrapper changed from `<a>` to `<button>`, and the closing `</a>` becomes `</button>`.)

- [ ] **Step 6: Update the two BeatFeature call sites**

In the paired-playlists block (around lines 379 and 395), replace `href={music.thisMonth.url}` with `id={music.thisMonth.id} onOpen={openPlaylist}`, and `href={music.ofInsta.url}` with `id={music.ofInsta.id} onOpen={openPlaylist}`. Leave `image`, `label`, `title`, `meta`, `blurb` untouched.

- [ ] **Step 7: Render the modal**

Just before the final closing `</div>` of the `<section>` (after the `music.updatedAt` paragraph, around line 457), add:
```tsx
        {openId && fallbacks.has(openId) && (
          <PlaylistModal detail={music.playlistDetails?.[openId]} fallback={fallbacks.get(openId)!} onClose={closePlaylist} />
        )}
```

- [ ] **Step 8: Verify build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS, 0 type errors, build completes.

- [ ] **Step 9: Commit**

```bash
git add src/components/sections/MusicPlayer.tsx
git commit -m "feat(music): open PlaylistModal from cards + #p deep-link"
```

---

### Task 9: Phase A deploy-guard, deploy sync, verify

**Files:** none (operational)

- [ ] **Step 1: Run the full test + build gate**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all vitest green (incl. playlistStats), tsc clean, build clean.

- [ ] **Step 2: deploy-guard**

Invoke the `/deploy-guard` skill against this repo. Expected: PASS (no stray bytes, next `^16.2.9`, model-ID N/A for the Next app, route smoke 200). Block = STOP.

- [ ] **Step 3: Deploy the edge function**

Run: `supabase functions deploy spotify-sync --no-verify-jwt --project-ref augvlmctlutjsyjgabyd`
Expected: deploy succeeds; function version increments.

- [ ] **Step 4: Trigger one sync and confirm the key**

Trigger the sync (the pg_cron `x-sync-secret` GET, or invoke from the Supabase dashboard). Then verify via the Supabase MCP:
```sql
select key, jsonb_typeof(payload) t, updated_at from spotify_cache where key = 'playlist_details';
```
Expected: one row, `t = object`, fresh `updated_at`.

- [ ] **Step 5: Merge to master + verify live**

FF-merge the working branch to master, push (this triggers the Vercel prod deploy). Then verify:
- `https://boyzwhocried.xyz/music` returns 200 and a playlist card opens the modal.
- Visiting `https://boyzwhocried.xyz/music#p=<a real shelf id>` auto-opens that modal.

- [ ] **Step 6: Commit/tag note**

No code change; record the deploy in the session log per the vault ritual.

---

## PHASE B — LLM enrichment (narrative + mood + anchor + theme tags)

### Task 10: Edge function — describePlaylistDetail (narrative + mood + anchor) and playlist theme tags

**Files:**
- Modify: `supabase/functions/spotify-sync/index.ts` (add a `describePlaylistDetail` helper near `describe` around line 256; reuse `lyricText` + `distillThemes`)

**Interfaces:**
- Consumes: `ANTHROPIC_API_KEY`, `lyricText`, `distillThemes`, `StatTrack`.
- Produces: `describePlaylistDetail(name, spotifyDescription, tracks, themeTags): Promise<{ narrative: string | null; mood: string | null; anchor: { name: string; artist: string } | null }>`; `playlistThemeTags(tracks): Promise<string[]>`.

- [ ] **Step 1: Add the theme-tag helper (lyrics in-memory, text discarded)**

Add near the obsession theme helpers:
```ts
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
```

- [ ] **Step 2: Add the narrative/mood/anchor helper**

Add near `describe`:
```ts
// A short read for one playlist: narrative (2 to 4 sentences, the owner's
// casual lowercase voice), a mood label, and the most emblematic track. Returns
// nulls on any failure. No lyric quoting; no em-dash.
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
```

- [ ] **Step 3: Typecheck**

Run: `cd supabase/functions && deno check spotify-sync/index.ts --node-modules-dir=auto ; cd ../..`
Expected: no type errors. (Skip if deno unavailable.)

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/spotify-sync/index.ts
git commit -m "feat(music): playlist narrative/mood/anchor + theme tags helpers"
```

---

### Task 11: Wire LLM enrichment into the build step

**Files:**
- Modify: `supabase/functions/spotify-sync/index.ts` (the `playlist_details` build step from Task 5)

**Interfaces:**
- Consumes: `describePlaylistDetail`, `playlistThemeTags`, `moodPalette`, `anchorFallback`, `playlistMeta` (`spotifyDescription`).

- [ ] **Step 1: Enrich the freshly-built detail**

In the build step, inside the `for (const id of ids)` loop, AFTER computing `tops`/`isObsession` and BEFORE assigning `details[id]`, add:
```ts
      const themeTags = await playlistThemeTags(tracks)
      const llm = await describePlaylistDetail(meta.name, meta.spotifyDescription, tracks, themeTags)
      const anchor = (llm.anchor && tracks.find((x) => x.name === llm.anchor!.name))
        ? { name: llm.anchor.name, artist: llm.anchor.artist,
            image: tracks.find((x) => x.name === llm.anchor!.name)?.image ?? '',
            url: tracks.find((x) => x.name === llm.anchor!.name)?.url ?? '' }
        : anchorFallback(tracks)
```

- [ ] **Step 2: Use the enriched values in the detail object**

Change the `details[id] = { ... }` assignment fields:
- `description`: `meta.spotifyDescription || cached?.description || null`
- `anchorTrack`: `anchor`
- `narrative`: `llm.narrative ?? null`
- `mood`: `llm.mood ?? null`
- `moodPalette`: `moodPalette(llm.mood ?? '')`
- `themeTags`: `themeTags`

(Leave all the stat fields from Task 5 as-is.)

- [ ] **Step 3: Typecheck**

Run: `cd supabase/functions && deno check spotify-sync/index.ts --node-modules-dir=auto ; cd ../..`
Expected: no type errors. (Skip if deno unavailable.)

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/spotify-sync/index.ts
git commit -m "feat(music): wire narrative/mood/anchor/tags into playlist_details"
```

---

### Task 12: Phase B deploy + verify

**Files:** none (operational)

- [ ] **Step 1: Gate**

Run: `npm test && npx tsc --noEmit && npm run build`. Expected: green.

- [ ] **Step 2: deploy-guard**

Invoke `/deploy-guard`. Expected: PASS.

- [ ] **Step 3: Deploy + trigger sync**

Run: `supabase functions deploy spotify-sync --no-verify-jwt --project-ref augvlmctlutjsyjgabyd`, then trigger one sync.

- [ ] **Step 4: Verify enrichment landed**

Via Supabase MCP:
```sql
select
  count(*) filter (where (v.value->>'narrative') is not null) with_narrative,
  count(*) total
from spotify_cache c, jsonb_each(c.payload) v
where c.key = 'playlist_details';
```
Expected: `with_narrative` > 0 (some playlists enriched; LRCLIB misses are acceptable so it need not equal total).

- [ ] **Step 5: Live check**

Open `https://boyzwhocried.xyz/music`, open a few playlist modals, confirm narrative + mood swatches + tags + anchor render and that no lyric lines appear anywhere.

- [ ] **Step 6: Log**

Record the Phase B deploy in the session log.

---

## Self-Review notes (author)

- Spec coverage: view-type (modal, Task 7-8), deep-link (#p, Task 8), full description (no-truncate, Task 8 step 3 + modal), narrative/mood/about/dates/total (Tasks 5,7,10-11), top artists / sample / era / decades / anchor / obsession-link (Tasks 2,5,7), mood preset palette (Task 2 `moodPalette`), snapshot+TTL gating + scan cap (Tasks 4-5 consts), privacy invariant (Task 10 helpers), graceful fallback (Task 7 fallback + Task 8 fallbacks map), em-dash guard (Global Constraints + LLM system prompts). All covered.
- Type consistency: `StatTrack`/`SampleTrack` (stats module) vs `PlaylistDetail`/`PlaylistDetailSampleTrack` (src/types) are distinct by design (the edge fn maps stats output into the cached PlaylistDetail shape). `moodPalette`, `anchorFallback`, `firstLastAdded`, `eraSpan`, `decadeHistogram`, `topArtists`, `pickSampleTracks` names are identical across Tasks 1-2, 5, 11.
- Known intentional checkpoint: Task 3 leaves a tsc error closed by Task 6 (documented in Task 3 Step 3).
