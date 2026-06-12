# /music data pipeline + managing the shelf

The `/music` room mixes three data sources. Knowing which is which tells you what
you can edit and where.

| Section | Source | Freshness | You edit it? |
|---|---|---|---|
| now-playing hero | live Spotify (`/api/spotify/live`, 30s shared cache) | ~30s | no, automatic |
| "last spun" | live Spotify (same endpoint) | ~30-60s | no, automatic |
| top tracks / artists (3 ranges) | `spotify_cache` table, written by the sync | ~2h | no, automatic |
| "this month" diary | name-matched `#YYMM` playlist | ~2h | no, fully automatic |
| "of insta" feature | fixed playlist id | ~2h | no, automatic |
| **the shelf** | **`spotify_playlists` table (config) -> `spotify_cache`** | **~2h** | **YES, this is yours** |
| "the read" (obsession narrative) | computed in-page from `spotify_cache` (`src/lib/music/obsession.ts`) | ~2h | no, deterministic |

Everything except the shelf is automatic. The shelf is the one thing you curate.

The sync also appends each day's snapshot (top tracks/artists, recently played,
both featured playlists, obsession themes) into `spotify_history` (one row per
key per UTC day, last sync of the day wins). The obsession log on the page and
the private music-signal pipeline both read this history.

When one album dominates the short-term top tracks, the sync also distills
**obsession themes**: lyrics fetched from LRCLIB (free, keyless community DB),
3-6 abstract theme tags via Haiku, cached as `obsession_themes`. Tags only;
lyric text is discarded in-function and never stored or rendered. Weekly TTL
per subject, so steady-state cost is ~1 Haiku call + ~5 LRCLIB hits a week.

---

## The shelf is a table: `spotify_playlists`

Open it in the Supabase dashboard -> project **bwc-portfolio** -> **Table editor** ->
`spotify_playlists` (or use the **SQL editor** for the snippets below).

Columns:

| Column | What it does |
|---|---|
| `id` | Spotify playlist id (the part after `/playlist/` in the share link) |
| `category` | `vault`, `rotation`, or `special` (the three shelf groups) |
| `position` | sort order within the group (lower = first) when sort is "curated" |
| `title_override` | show a custom name instead of the real playlist name (optional) |
| `description` | the one-line blurb. Auto-generated once, or hand-written by you |
| `description_locked` | `true` = never auto-regenerate this blurb (protect your hand edits) |
| `enabled` | `false` = hide from the shelf without deleting the row |

After any change, the shelf refreshes on the **2h sync**, or run `select trigger_spotify_sync();`
in the SQL editor for an instant refresh.

---

## Recipes (paste into the SQL editor)

### Add a playlist
Grab the id from the share link (`https://open.spotify.com/playlist/THIS_PART?si=...`).
```sql
insert into spotify_playlists (id, category, position)
values ('THIS_PART', 'rotation', 99);
```
Next sync auto-fetches its cover, name, and track count, and auto-writes a blurb.
No redeploy.

### Remove a playlist
```sql
delete from spotify_playlists where id = 'THIS_PART';
-- or keep the row but hide it:
update spotify_playlists set enabled = false where id = 'THIS_PART';
```

### Reorder / move to another group
```sql
update spotify_playlists set position = 1            where id = 'THIS_PART'; -- order
update spotify_playlists set category = 'vault'      where id = 'THIS_PART'; -- group
```

### Rename what shows on the card
```sql
update spotify_playlists set title_override = 'my nicer name' where id = 'THIS_PART';
```

### Edit a blurb by hand (and keep it)
```sql
update spotify_playlists
  set description = 'whatever i want it to say', description_locked = true
  where id = 'THIS_PART';
```
`description_locked = true` means the sync will never overwrite it.

### Re-generate a blurb with the AI
```sql
update spotify_playlists
  set description = null, description_locked = false
  where id = 'THIS_PART';
```
Next sync writes a fresh one.

### Force an immediate refresh (instead of waiting up to 2h)
```sql
select trigger_spotify_sync();
```

---

## How the AI blurb is written

The sync (Claude Haiku, once per playlist) reads, in priority order:
1. the playlist's **own Spotify description** (your words) if it has one,
2. otherwise the **playlist name** read personally,
3. the **track list** only to confirm the mood.

It writes one lowercase first-person line. It is told NOT to invent personal facts
that are not in the name or description. For meaning that lives only in your head,
write the blurb by hand and lock it (recipe above). It deliberately does **not** read
your private vault, because this page is public.

## Automatic pieces (do not need a table)
- **this month**: the sync computes the current `#YYMM` name and finds that playlist.
  Your monthly rollover keeps creating `#YYMM` playlists, so this never needs touching.
- **of insta**: fixed id `7ua1oGuss0hr0MnpxvN345`, in `index.ts`.

## Secrets / deploy
Function secrets (`SPOTIFY_*`, `ANTHROPIC_API_KEY`, `SYNC_SECRET`) live in Supabase
function config, never in git. Redeploy with the Supabase MCP `deploy_edge_function`
or the dashboard. The 2h schedule is a `pg_cron` job named `spotify-sync`.
