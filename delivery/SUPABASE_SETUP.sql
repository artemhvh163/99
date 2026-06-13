-- ParkManager Supabase setup
-- Run this in Supabase SQL Editor for the project used by the app.

create table if not exists public.park_data (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.park_data enable row level security;

drop policy if exists "park_data_select" on public.park_data;
drop policy if exists "park_data_insert" on public.park_data;
drop policy if exists "park_data_update" on public.park_data;

create policy "park_data_select"
on public.park_data
for select
to anon
using (true);

create policy "park_data_insert"
on public.park_data
for insert
to anon
with check (true);

create policy "park_data_update"
on public.park_data
for update
to anon
using (true)
with check (true);

insert into public.park_data (id, data, updated_at)
values ('main', '{}'::jsonb, now())
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'park_data'
  ) then
    alter publication supabase_realtime add table public.park_data;
  end if;
end $$;
