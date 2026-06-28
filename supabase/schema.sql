-- RambleBabble — database schema for saved rambles.
-- Paste this whole block into the Supabase SQL Editor and click Run.

create table if not exists public.rambles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  transcript text not null,
  output_type text not null,
  output_label text,
  tone text,
  cleaned text not null,
  key_points jsonb not null default '[]'::jsonb,
  follow_ups jsonb not null default '[]'::jsonb,
  is_fun boolean not null default false
);

alter table public.rambles enable row level security;

drop policy if exists "rambles_select_own" on public.rambles;
create policy "rambles_select_own" on public.rambles
  for select using (auth.uid() = user_id);

drop policy if exists "rambles_insert_own" on public.rambles;
create policy "rambles_insert_own" on public.rambles
  for insert with check (auth.uid() = user_id);

drop policy if exists "rambles_delete_own" on public.rambles;
create policy "rambles_delete_own" on public.rambles
  for delete using (auth.uid() = user_id);

create index if not exists rambles_user_created_idx
  on public.rambles (user_id, created_at desc);
