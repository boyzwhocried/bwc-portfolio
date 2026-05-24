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
