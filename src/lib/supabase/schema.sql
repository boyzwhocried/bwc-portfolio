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
