-- Global system status table (maintenance mode / Song of the Day)
-- Run in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.system_status (
  id uuid primary key default gen_random_uuid(),
  maintenance_mode boolean not null default false,
  banner_message text,
  song_of_the_day jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_system_status_updated_at on public.system_status;
create trigger set_system_status_updated_at
before update on public.system_status
for each row execute procedure public.set_updated_at();

alter table public.system_status enable row level security;

-- Readable by everyone (anon + authenticated) so all users see it.
drop policy if exists "system_status_read_all" on public.system_status;
create policy "system_status_read_all"
on public.system_status
for select
to anon, authenticated
using (true);

-- Writable only by admins (profiles.is_admin = true).
drop policy if exists "system_status_write_admin_only" on public.system_status;
create policy "system_status_write_admin_only"
on public.system_status
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Ensure a single row exists (optional, but convenient).
insert into public.system_status (maintenance_mode, banner_message, song_of_the_day)
select false, null, '{}'::jsonb
where not exists (select 1 from public.system_status);

