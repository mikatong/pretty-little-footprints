create extension if not exists pgcrypto;

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  place_id text unique not null,
  title text not null,
  preview_summary text,
  body text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  featured boolean not null default false,
  cover_url text,
  gallery_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete cascade
);

create table if not exists public.story_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.stories enable row level security;
alter table public.story_owners enable row level security;

drop policy if exists "Owners can read owner allowlist" on public.story_owners;
create policy "Owners can read owner allowlist"
on public.story_owners
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Published stories are publicly readable" on public.stories;
create policy "Published stories are publicly readable"
on public.stories
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Owners can read their stories" on public.stories;
create policy "Owners can read their stories"
on public.stories
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.story_owners
    where story_owners.user_id = auth.uid()
  )
);

drop policy if exists "Owners can insert their stories" on public.stories;
create policy "Owners can insert their stories"
on public.stories
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.story_owners
    where story_owners.user_id = auth.uid()
  )
);

drop policy if exists "Owners can update their stories" on public.stories;
create policy "Owners can update their stories"
on public.stories
for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.story_owners
    where story_owners.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.story_owners
    where story_owners.user_id = auth.uid()
  )
);

create or replace function public.set_story_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_story_updated_at on public.stories;
create trigger set_story_updated_at
before update on public.stories
for each row
execute function public.set_story_updated_at();

create or replace function public.story_visibility_index()
returns table(slug text, place_id text, status text)
language sql
security definer
set search_path = public
as $$
  select stories.slug, stories.place_id, stories.status
  from public.stories;
$$;

grant execute on function public.story_visibility_index() to anon, authenticated;
