-- Phase 2: profiles + handle_new_user / set_updated_at + RLS
-- See db-schema.md "テーブル定義 > profiles" / "RLS 方針".

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read only their own row.
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

-- Users can update only their own row, and cannot move it to another id.
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- INSERT/DELETE intentionally not exposed to authenticated users.
-- INSERT happens through handle_new_user(), DELETE cascades from auth.users.

-- BEFORE UPDATE trigger to keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-provision a profile row whenever a new auth.users row appears.
-- SECURITY DEFINER so the trigger can insert despite RLS being on.
-- Picks display_name from common OAuth metadata fields, falling back to the
-- email local-part, then to a literal placeholder so NOT NULL is satisfied.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  -- Normalize each candidate independently: an empty/whitespace value in
  -- one source must not block the next from being considered.
  derived_name text := coalesce(
    nullif(btrim(meta ->> 'display_name'), ''),
    nullif(btrim(meta ->> 'full_name'), ''),
    nullif(btrim(meta ->> 'name'), ''),
    nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), '')
  );
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(derived_name, 'ユーザー'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
