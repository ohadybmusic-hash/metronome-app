-- Supabase Auth + app data tables (profiles, user_data) with RLS.
-- Run in Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- Profiles table (used for is_admin, and for admin dashboard listing)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  );
$$;

-- Profiles policies:
-- - users can read their own profile
-- - admins can read all profiles
drop policy if exists "profiles_read_self_or_admin" on public.profiles;
create policy "profiles_read_self_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

-- - users can update their own email field (optional)
-- - admins can update any profile (incl. is_admin)
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Automatically insert a profile row for new auth users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- User data table (songs, setlists, practice stats)
create table if not exists public.user_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  practice_minutes integer not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint user_data_user_unique unique (user_id)
);

drop trigger if exists set_user_data_updated_at on public.user_data;
create trigger set_user_data_updated_at
before update on public.user_data
for each row execute procedure public.set_updated_at();

alter table public.user_data enable row level security;

-- User data policies:
-- - users can read/write only their own row
-- - admins can read/write all rows (needed for Admin Dashboard)
drop policy if exists "user_data_select_self_or_admin" on public.user_data;
create policy "user_data_select_self_or_admin"
on public.user_data
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_data_insert_self_or_admin" on public.user_data;
create policy "user_data_insert_self_or_admin"
on public.user_data
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_data_update_self_or_admin" on public.user_data;
create policy "user_data_update_self_or_admin"
on public.user_data
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

