-- Dated listening snapshots, appended by the spotify-sync edge function once
-- per day (last sync of the day wins). Powers over-time obsession/mood views.
-- Same public-read posture as spotify_cache: the payloads are the same data,
-- just dated. Writes only via service role (no insert/update policy).
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
