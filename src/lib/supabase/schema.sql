create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null,
  tags text[] default '{}',
  tech_stack text[] default '{}',
  thumbnail_url text,
  live_url text,
  github_url text,
  featured boolean default false,
  "order" integer default 0,
  created_at timestamptz default now()
);

alter table projects enable row level security;

create policy "Public read" on projects
  for select using (true);

-- ---------------------------------------------------------------------------
-- Sandbox arcade leaderboard (PARRY). Public read; writes ONLY via the
-- service-role server action (src/actions/arcade.ts), which recomputes the
-- score by replaying the deterministic core (src/lib/sandbox/parry.replay) from
-- the submitted inputs. RLS has NO insert policy => anon cannot write the table
-- at all, so a score cannot be forged with the public anon key. The CHECK
-- constraints stay as defense-in-depth. Requires SUPABASE_SERVICE_ROLE_KEY.
-- ---------------------------------------------------------------------------
create table if not exists arcade_scores (
  id uuid primary key default gen_random_uuid(),
  game text not null,
  name text not null,
  score integer not null,
  created_at timestamptz default now(),
  constraint arcade_scores_game_chk check (game in ('parry')),
  constraint arcade_scores_name_chk check (char_length(name) between 1 and 3),
  constraint arcade_scores_score_chk check (score >= 0 and score <= 99999)
);

alter table arcade_scores enable row level security;

create policy "arcade_scores public read" on arcade_scores
  for select using (true);

-- No insert policy: anon/auth are RLS-denied. The service-role action bypasses
-- RLS and is the sole writer.

create index if not exists arcade_scores_game_score_idx on arcade_scores (game, score desc);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz default now(),
  read boolean default false
);

alter table contact_messages enable row level security;

create policy "Insert only" on contact_messages
  for insert with check (true);

-- ---------------------------------------------------------------------------
-- Spotify music room (see supabase/functions/spotify-sync). Applied via the
-- spotify_cache_and_playlists migration; kept here for reference.
-- ---------------------------------------------------------------------------

-- Rendered, public-readable cache the /music page reads (0 Spotify calls per visit).
create table if not exists spotify_cache (
  key        text primary key,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);
alter table spotify_cache enable row level security;
create policy "spotify_cache public read" on spotify_cache
  for select using (true);
-- writes only via service role (the spotify-sync edge function), which bypasses RLS.

-- Dated listening snapshots, appended by the sync once per day (last sync of
-- the day wins). Powers over-time obsession/mood views. Same public-read
-- posture as spotify_cache. Applied via the spotify_history migration.
create table if not exists spotify_history (
  snapshot_date date not null,
  key           text not null,
  payload       jsonb not null,
  updated_at    timestamptz not null default now(),
  primary key (snapshot_date, key)
);
alter table spotify_history enable row level security;
create policy "spotify_history public read" on spotify_history
  for select using (true);
-- writes only via service role (the spotify-sync edge function), which bypasses RLS.

-- Private config: the curated shelf allowlist. Add/remove a playlist = one row.
-- Sync auto-fetches its cover/name/count and auto-writes an AI description once.
create table if not exists spotify_playlists (
  id                 text primary key,                 -- spotify playlist id
  category           text not null default 'rotation', -- vault | rotation | special
  position           int  not null default 0,
  title_override     text,
  description        text,                             -- AI-generated once, or manual
  description_locked boolean not null default false,   -- true = never auto-regenerate
  enabled            boolean not null default true,
  created_at         timestamptz not null default now()
);
alter table spotify_playlists enable row level security;
-- RLS on, no policy => private. Service role manages it.

-- Manual "refresh now" helper (instead of waiting for the 2h pg_cron). The live
-- copy embeds the anon key + sync secret in its body and is restricted to the
-- dashboard/service role; values below are placeholders.
-- create or replace function public.trigger_spotify_sync()
--   returns text language plpgsql security definer set search_path = public, extensions
-- as $fn$
-- declare req_id bigint;
-- begin
--   select net.http_post(
--     url := 'https://<ref>.supabase.co/functions/v1/spotify-sync',
--     headers := jsonb_build_object('Content-Type','application/json',
--       'Authorization','Bearer <ANON_KEY>', 'x-sync-secret','<SYNC_SECRET>'),
--     body := '{}'::jsonb, timeout_milliseconds := 150000) into req_id;
--   return 'spotify sync triggered (request ' || req_id || ')';
-- end; $fn$;
-- revoke execute on function public.trigger_spotify_sync() from public, anon, authenticated;
