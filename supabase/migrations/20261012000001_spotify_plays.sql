-- Own listening log, fed from currently-playing by the /api/spotify/live route.
-- Spotify's recently-played endpoint can stall for hours; this fills the gap.
-- One row per track (latest play wins). Public read like spotify_cache, writes
-- via service role only (no insert/update policy).
create table if not exists spotify_plays (
  url        text primary key,
  name       text not null,
  artist     text not null,
  album      text not null default '',
  image      text not null default '',
  played_at  timestamptz not null default now()
);

create index if not exists spotify_plays_played_at_idx on spotify_plays (played_at desc);

alter table spotify_plays enable row level security;

create policy "spotify_plays public read" on spotify_plays
  for select using (true);
