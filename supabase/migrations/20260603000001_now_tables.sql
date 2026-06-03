create table now_entries (
  id          bigint primary key generated always as identity,
  date        date not null,
  body        text not null,
  published   boolean default true,
  created_at  timestamptz default now()
);

create table now_currently (
  id          bigint primary key generated always as identity,
  key         text not null,
  value       text not null,
  sort_order  int default 0
);

-- index for the common query pattern: published=true, ordered by date desc
create index now_entries_date_idx on now_entries (date desc) where published = true;
create index now_currently_sort_idx on now_currently (sort_order asc);
