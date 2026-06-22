# Music Playlist Detail Modal — Design

**Date:** 2026-06-22
**Status:** Approved (brainstorm), ready for implementation plan
**Repo:** bwc-portfolio
**Related:** `2026-06-12-music-obsession-engine-design.md` (shares the LRCLIB lyrics to theme tags privacy pattern), `MusicPlayer.tsx`, `supabase/functions/spotify-sync/index.ts`

## Problem

On `/music`, playlist cards (`ShelfCard` + the two `BeatFeature` blocks) are plain anchors that jump straight to Spotify, and the shelf card description is single-line `truncate`d so it is unreadable. There is no way to see what a playlist actually is without leaving the site. The owner wants a richer, on-site view per playlist.

## Goal

Clicking any playlist card opens an on-site **modal** with a full, readable picture of that playlist: a narrative, the full description, counts, dates, what it is about (from the songs and their lyrics, via LLM judgment), mood, and supporting stats. No truncation. The site's core invariant holds: **zero Spotify or LLM calls per page visit** (everything is pre-baked in the sync and cached).

## Decisions (locked in brainstorm)

- **View type:** modal popup on `/music` (not a dedicated route). Reuses the existing `SandboxModal` shell (open / close / ESC / themeable chrome).
- **Deep-link:** `/music#p=<playlistId>` auto-opens that playlist's modal on load, giving shareability without a route.
- **Mood palette:** mood-label to preset swatch set (deterministic). NOT cover-art color extraction (Spotify `i.scdn.co` images taint the canvas under CORS, so pixel readback is unreliable).
- **Data source:** pre-baked in `spotify-sync`, cached in Supabase, read with the rest of the music data in one round-trip.

## Content (modal)

Owner wishlist plus all approved extras and bonuses:

1. Cover art + playlist name; **name is the Spotify link** (title acts as the "open in spotify" affordance).
2. Full description (the AI one-liner or the owner's own blurb), untruncated.
3. **Narrative** (LLM, 2 to 4 sentences): the "read" for this one playlist, in the owner's casual lowercase voice.
4. Total track count (exact, from playlist meta).
5. **Dates:** first-added and last-added (min/max of per-track `added_at`). Labeled honestly as "added" ranges, NOT "created" (Spotify exposes no playlist creation date).
6. **What it is about:** kebab theme tags derived from sampled track lyrics (LRCLIB to Haiku to tags; lyric text discarded, never stored or shown).
7. **Mood:** an LLM mood label plus a preset color swatch row keyed off that label.
8. **Top artists in playlist:** most-featured artists (frequency tally over the scanned tracks).
9. **Sample tracks with covers:** a small teaser strip of track thumbnails, each linking to Spotify.
10. **Era / year span:** oldest to newest release year across the tracks.
11. **Decade histogram:** tiny bar chart of release years bucketed by decade.
12. **Anchor track:** the single most emblematic song (LLM pick), one line, links to Spotify.
13. **Obsession cross-link:** if the playlist's dominant album matches the current `obsession_themes` subject, show a badge connecting the two music features.

### Layout sketch

```
+-------------------------------------------+
| [cover]   PLAYLIST NAME (link to spotify) |
|           147 tracks . added Mar-Jun '25  |
|           [obsession badge, if match]     |
|-------------------------------------------|
|  narrative (LLM, 2-4 sentences)           |
|  full description (untruncated)           |
|-------------------------------------------|
|  mood:  restless, blue   [swatches]       |
|  about: #grief #nostalgia #late-night     |
|-------------------------------------------|
|  heavy on: Sleep Token, Deftones, Korn    |
|  anchor:  > "song name" - artist  (link)  |
|  era: 1998 -> 2024   [decade bars]        |
|-------------------------------------------|
|  [cover][cover][cover][cover]  sample(link)|
+-------------------------------------------+
```

## Architecture

### Data flow

```
pg_cron -> spotify-sync (edge fn, Deno)
   per playlist (shelf cards + this-month + of-insta):
     1. playlistMeta (add snapshot_id to fields)
     2. snapshot_id unchanged AND within TTL ?  -> reuse cached detail, skip 3-5
     3. fetch tracks (paginate, cap ~100 scanned; capture added_at, release_date, artists, cover)
     4. pure stats: first/lastAdded, eraSpan, decadeHistogram, topArtists, sampleTracks
     5. LLM (Haiku, best-effort): narrative, mood label, anchor track, theme tags
   write spotify_cache key `playlist_details` = { [id]: PlaylistDetail }
        |
        v
spotify_cache (Supabase, public read)
        |
        v
lib/music.getMusicData()  ->  MusicData.playlistDetails
        |
        v
MusicPlayer (already-loaded prop)  ->  PlaylistModal (no fetch on click)
```

### New cache key

One key `playlist_details` holding `Record<playlistId, PlaylistDetail>`. Read alongside the existing keys in the single `getMusicData()` round-trip. One extra row, one payload.

### Cost gate (critical)

Each `PlaylistDetail` stores the Spotify `snapshot_id` (opaque hash that changes only when playlist contents change) and its generation timestamp. On each sync, for each playlist:

- Fetch the lightweight meta (cheap, one call) including `snapshot_id`.
- If `snapshot_id` matches the cached detail AND the detail is within TTL: **keep the cached detail untouched**, do no track fetch, no lyric fetch, no LLM call.
- Only when the snapshot changed (or no detail exists, or TTL elapsed) do the expensive steps run.

This mirrors the existing `obsession_themes` weekly TTL. Steady-state token and Spotify cost stays near zero; only changed playlists pay.

### Bounds

- **Scan cap:** compute stats over at most ~100 tracks per playlist (of-insta is 1130+). Exact total still comes from meta. Note in the payload when stats are sampled vs full.
- **Lyric sampling:** cap to a few tracks per playlist (reuse the obsession `THEME_TRACKS` bound), gentle spacing, best-effort.
- **Gentle spacing:** reuse the existing `sleep(120)` per Spotify call and the 429 backoff.

## Components and types

- **New type `PlaylistDetail`** (in `src/types/index.ts`): id, name, url, image, count, description, snapshotId, firstAdded, lastAdded, eraFrom, eraTo, decades (bucket counts), topArtists (name + count), sampleTracks (CachedTrack subset), narrative, mood (label + palette key), themeTags, anchorTrack (CachedTrack subset), isObsession (bool), sampled (bool), generatedAt.
- **`MusicData.playlistDetails`**: `Record<string, PlaylistDetail> | null`.
- **`lib/music.ts`**: read the `playlist_details` key, attach to `MusicData` (graceful null when absent).
- **New `PlaylistModal.tsx`** (`src/components/sections/`): reuses `SandboxModal` shell, themed to the music room. Reads a `PlaylistDetail` plus a graceful fallback when no detail exists yet.
- **`MusicPlayer.tsx`**: `ShelfCard` and `BeatFeature` become buttons that open the modal (set selected playlist id in state); the Spotify outbound link moves to the playlist name inside the modal. A hash effect (`#p=<id>`) opens the matching modal on mount and on hashchange.
- **`spotify-sync/index.ts`**: new `playlist_details` build step + a pure stats module; extend `playlistMeta` fields to include `snapshot_id`; new LLM helper for the longer narrative + mood + anchor (one Haiku call returning a small JSON object), reusing the existing lyric to theme-tag path.

### Pure module (TDD target)

`src/lib/music/playlistStats.ts` (or in the edge fn's lib, mirrored): pure functions
- `firstLastAdded(items): { first, last }`
- `eraSpan(items): { from, to }`
- `decadeHistogram(items): Record<decade, count>`
- `topArtists(items, n): { name, count }[]`
- `pickSampleTracks(items, n): CachedTrack[]`
- `moodPalette(label): string[]` (preset map; deterministic)
- `anchorFallback(items): CachedTrack` (deterministic pick when the LLM anchor is unavailable)

These get RED-GREEN unit tests under the existing vitest harness. The LLM-produced narrative / mood label / anchor / theme tags are best-effort impure and degrade gracefully.

## Privacy invariant (hard)

Lyrics are fetched only in-memory from LRCLIB, distilled to abstract theme tags by Haiku, and the text is discarded. Theme tags, mood labels, and the narrative must never quote lyric words, lines, or phrases. This extends the rule already enforced by the obsession engine. No em-dashes in any generated copy (portfolio em-dash guard).

## Graceful degradation

- No `playlist_details` key yet, or no detail for a clicked playlist, or a failed generation: the modal still opens and shows what we have (cover, name to Spotify, count, description). Keep-last-good: a generation failure for one playlist never blocks the others or the cache commit.
- LLM unavailable (no key, API error): stats, dates, era, histogram, top artists, sample tracks still render; narrative / mood / anchor / tags simply omit.

## Gotchas (carried forward)

- **Spotify audio-features endpoint is deprecated** for new apps: mood comes from genre and lyric themes, NOT from audio analysis (valence/energy/danceability are unavailable).
- **No playlist creation date** from Spotify: use first/last `added_at`, labeled "added", never "created".
- **Cover-art CORS taint** on `i.scdn.co`: palette is preset-keyed, not pixel-extracted.
- **of-insta is large** (1130+): scan cap bounds stats cost; total stays exact from meta.
- **snapshot_id gating** is what keeps LLM + Spotify cost bounded; without it every sync would regenerate every playlist.

## Sequencing (independently shippable)

1. **Cheap layer:** new modal + un-truncated description + dates + era + decade histogram + top artists + sample tracks + deep-link. Pure stats only, no LLM. Ships value on its own.
2. **LLM layer:** narrative + mood (label + preset palette) + anchor track + theme tags + obsession cross-link. Layers on top, best-effort.

## Out of scope (v1)

- A dedicated `/music/p/[id]` route and OG images (modal + hash deep-link covers shareability for now).
- Real cover-art color extraction (revisit only if presets feel flat).
- Per-track full listings inside the modal (sample strip only; the Spotify link is the full list).

## Testing

- Pure stat functions: RED-GREEN vitest (boundaries: empty playlist, single track, all-same-decade, missing release dates, missing added_at).
- Privacy assertions in the generated-copy tests where feasible (no quoted lyric lines; no em-dash), mirroring the obsession engine's test style.
- Live smoke after deploy: `/api/sandbox/...` style health is N/A here; verify the sync writes `playlist_details`, `/music` renders the modal, and the `#p=` deep-link opens.
