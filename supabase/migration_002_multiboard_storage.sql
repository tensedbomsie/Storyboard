-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query)

-- 1. Allow multiple boards per user
alter table boards drop constraint if exists boards_owner_key;
alter table boards add column if not exists name text not null default 'Untitled Board';
alter table boards add column if not exists created_at timestamptz not null default now();

drop policy if exists "delete own board" on boards;
create policy "delete own board" on boards
  for delete using (owner = auth.uid());

-- 2. Storage bucket for uploaded images
insert into storage.buckets (id, name, public)
values ('board-images', 'board-images', true)
on conflict (id) do nothing;

drop policy if exists "read board images" on storage.objects;
create policy "read board images" on storage.objects
  for select using (bucket_id = 'board-images');

drop policy if exists "upload own board images" on storage.objects;
create policy "upload own board images" on storage.objects
  for insert with check (bucket_id = 'board-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "delete own board images" on storage.objects;
create policy "delete own board images" on storage.objects
  for delete using (bucket_id = 'board-images' and (storage.foldername(name))[1] = auth.uid()::text);
