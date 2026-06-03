alter table public.now_entries enable row level security;
create policy "Public read" on public.now_entries for select using (true);

alter table public.now_currently enable row level security;
create policy "Public read" on public.now_currently for select using (true);
