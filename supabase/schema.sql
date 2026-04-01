-- Run this in Supabase SQL editor
create extension if not exists pgcrypto;

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 1 and 24),
  department_id text not null check (department_id in ('sales', 'purchase', 'operations')),
  created_at timestamptz not null default now()
);

alter table public.characters enable row level security;

-- Demo/dev policies (open to anon key). Tighten for production apps.
drop policy if exists "characters_select" on public.characters;
create policy "characters_select"
on public.characters for select
to anon, authenticated
using (true);

drop policy if exists "characters_insert" on public.characters;
create policy "characters_insert"
on public.characters for insert
to anon, authenticated
with check (true);

drop policy if exists "characters_delete" on public.characters;
create policy "characters_delete"
on public.characters for delete
to anon, authenticated
using (true);
