# Music room: curation log (replaces the obsession read as the lead)

Branch `music-room` (off `redesign`). Date 2026-11-12. Brief: personal-os `working/handoffs/2026-11-11-bwc-music-room-handoff.md`.

## Summary

The obsession read is a top-tracks readout any account would produce. Replace it with a **curation log** written from the Spotify curation runs: per run date, songs in, which public shelves they went to, which artists, what he kept on repeat, skipped counts, his standing rules, and sourced blurbs. "The read" stays but hides when nothing owns the month. Publishing is **never automatic**: the `spotify-curation` skill asks every run, writes only on his yes.

## Decided (Verrel, 2026-11-12)

- Public: counts, shelf names, **and artist names** added. Not public: Instagram source info, run ids, caps, held-back internals, non-shelf playlist names (`sound of eca`, queues).
- Shelf names come only from playlists already on the public shelf (`playlists_shelf` cache). Any other playlist rolls into "other playlists" (count only).

## Data: new `spotify_cache` key `curation_log`

```
{ asOf: 'YYYY-MM-DD',
  rules: string[],                       // his standing rules, short
  runs: [{ date, songsIn, shelves: [{ name, count, artists: string[] }],
           otherPlaylists: number,       // songs placed in non-shelf playlists
           repeats: [{ artist, track }], // kept on repeat (hand-supplied)
           skipped: { count, reasons: [{ reason, count }] } }],   // newest first
  blurbs: [{ artist, album?, text, source }] }   // text <= 280 chars, source required
```

The sync edge function only upserts its own keys, so `curation_log` survives it.

## Pieces (TDD order)

1. **`src/lib/music/curationLog.ts`** (pure): `parseCurationLog(unknown)` drops malformed runs/blurbs (blurb without source, any em-dash, over 280 chars); `curationView(log)` returns null when no runs, else newest-first rows plus an "as of" label.
2. **Hide rule for the read**: `readIsWorthShowing(report)` true only when `kind !== 'none'`. Otherwise `MusicObsession` renders nothing.
3. **`CurationLog.tsx`** replaces `ObsessionLog` in `MusicPlayer` (old log + `obsessionLog.ts` removed; it never rendered). `getMusicData` reads `curation_log`.
4. **Vault builder** `scripts/bwc_curation_log.py` (personal-os, pytest): route `applied.json` (grouped by run date) + `mirror.sqlite3` + public shelf ids -> the payload above. Drafts to `working/spotify-mirror/bwc-curation/<date>.json` for review.
5. **Publish** `scripts/music/publish-curation.mjs` (bwc-portfolio): validates with `parseCurationLog`, **dry-run by default**, `--yes` required to upsert (service key from env, never the page).
6. **Skill step** (staged patch, per vault rule): final step of `spotify-curation` asks "update the bwc music page with this run?"; publish only on yes; no is final for that run.

## Not doing

- No new API spend. The existing Haiku `obsession_themes` call in `spotify-sync` is left as is (separate decision to drop it).
- No lyrics, no Instagram data, no auto-publish, no push.

## Rules kept

No em-dashes; 3 colors only; explicit `git add`; commits end with the Co-Authored-By line.
