-- Move the ROYZIVGSB practice-PDF library out of the public /practice-pdfs/
-- folder into a private Supabase Storage bucket, gated by RLS.
--
-- After running this:
--   1. Run scripts/upload-practice-pdfs.mjs to push the existing PDFs into the bucket.
--   2. Once verified working in the app, delete the public copies:
--        rm -r metronome-app/public/practice-pdfs/royzivgsb/
--
-- Run in Supabase SQL Editor after auth_and_user_data.sql + lock_is_admin_escalation.sql.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Allowlist table — replaces the hardcoded email set in royzivgsbAccess.js.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.allowed_pdf_users (
  email text primary key,
  library_id text not null default 'royzivgsb',
  created_at timestamptz not null default now()
);

alter table public.allowed_pdf_users enable row level security;

-- Authenticated users can read rows that match their own email (to check
-- their access in the UI). Only admins can modify the list.
drop policy if exists "allowed_pdf_users_read_self" on public.allowed_pdf_users;
create policy "allowed_pdf_users_read_self"
on public.allowed_pdf_users
for select
to authenticated
using (lower(email) = lower((auth.jwt() ->> 'email')) or public.is_admin());

drop policy if exists "allowed_pdf_users_write_admin" on public.allowed_pdf_users;
create policy "allowed_pdf_users_write_admin"
on public.allowed_pdf_users
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Seed the two users currently hardcoded in royzivgsbAccess.js.
insert into public.allowed_pdf_users (email, library_id)
values
  ('ohadybmusic@gmail.com', 'royzivgsb'),
  ('baston123@gmail.com', 'royzivgsb')
on conflict (email) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Private storage bucket — only readable by allowlisted users.
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('practice-pdfs-private', 'practice-pdfs-private', false)
on conflict (id) do nothing;

-- Drop pre-existing policies if rerunning the migration.
drop policy if exists "practice_pdfs_private_read" on storage.objects;
drop policy if exists "practice_pdfs_private_write_admin" on storage.objects;

-- Allowlisted users can download. Admins can also download.
create policy "practice_pdfs_private_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'practice-pdfs-private'
  and (
    public.is_admin()
    or exists (
      select 1 from public.allowed_pdf_users a
      where lower(a.email) = lower((auth.jwt() ->> 'email'))
    )
  )
);

-- Only admins can upload/update/delete files in the bucket.
create policy "practice_pdfs_private_write_admin"
on storage.objects
for all
to authenticated
using (bucket_id = 'practice-pdfs-private' and public.is_admin())
with check (bucket_id = 'practice-pdfs-private' and public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Verification
-- ─────────────────────────────────────────────────────────────────────────
--
-- As an allowlisted authenticated user, this should return your email:
--   select email from public.allowed_pdf_users where lower(email) = lower((auth.jwt() ->> 'email'));
--
-- As that user, creating a signed URL for a file in the bucket should succeed
-- (test from the app, or via the JS SDK):
--   await supabase.storage.from('practice-pdfs-private').createSignedUrl('royzivgsb/lick-1-tabs.pdf', 3600)
--
-- As a non-allowlisted user, the same call must fail with policy violation.
