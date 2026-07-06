-- Single-user cloud sync (no login) — run in Supabase SQL Editor
-- WARNING: drops existing portfolios table if you ran the older auth-based schema

drop table if exists public.portfolios cascade;

create table public.portfolios (
  sync_key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.portfolios enable row level security;

-- Personal app: one fixed sync key (matches SYNC_KEY in index.html)
create policy "portfolios_personal_sync"
  on public.portfolios for all to anon
  using (sync_key = 'rebalance-puicuppom-v1')
  with check (sync_key = 'rebalance-puicuppom-v1');

-- Realtime: Database → Replication → enable portfolios for supabase_realtime
alter publication supabase_realtime add table public.portfolios;
