-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query)

create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null unique references auth.users(id) on delete cascade,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table boards enable row level security;

create policy "read own board" on boards
  for select using (owner = auth.uid());

create policy "insert own board" on boards
  for insert with check (owner = auth.uid());

create policy "update own board" on boards
  for update using (owner = auth.uid()) with check (owner = auth.uid());
