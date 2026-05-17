-- Extend the practice-pdfs-private bucket to support per-user uploads.
--
-- After running this:
--   - Existing curated PDFs continue to live at  royzivgsb/<filename>
--     (admin-only write, allowlisted-user read — unchanged from
--      practice_pdfs_private_bucket.sql).
--   - Each authenticated user gets their own folder at  <user_id>/<filename>
--     where they can upload, read, update, and delete their own files.
--   - Admins can read/write everything.
--
-- Run in Supabase SQL Editor after practice_pdfs_private_bucket.sql.

-- Drop the previous policies — they're being replaced with broader ones.
drop policy if exists "practice_pdfs_private_read" on storage.objects;
drop policy if exists "practice_pdfs_private_write_admin" on storage.objects;

-- ─────────────────────────────────────────────────────────────────────────
-- READ
-- Anyone in the bucket can read a file if:
--   - they're an admin, OR
--   - the file is in their own folder (key starts with their auth.uid()), OR
--   - the file is in the royzivgsb/ folder AND they're allowlisted.
-- ─────────────────────────────────────────────────────────────────────────
create policy "practice_pdfs_private_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'practice-pdfs-private'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
    or (
      (storage.foldername(name))[1] = 'royzivgsb'
      and exists (
        select 1 from public.allowed_pdf_users a
        where lower(a.email) = lower((auth.jwt() ->> 'email'))
      )
    )
  )
);

-- ─────────────────────────────────────────────────────────────────────────
-- WRITE (insert / update / delete)
-- Users can manage only their own folder; admins can manage anything.
-- The royzivgsb/ folder is admin-write only (no special case needed —
-- non-admins are blocked by the auth.uid() folder check).
-- ─────────────────────────────────────────────────────────────────────────
create policy "practice_pdfs_private_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'practice-pdfs-private'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy "practice_pdfs_private_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'practice-pdfs-private'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'practice-pdfs-private'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy "practice_pdfs_private_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'practice-pdfs-private'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- ─────────────────────────────────────────────────────────────────────────
-- Per-user upload size cap.
-- Enforce a reasonable per-file size for user uploads (5 MB). Adjust as needed.
-- Admins are exempt so the bulk-upload script for royzivgsb/ stays unblocked.
-- ─────────────────────────────────────────────────────────────────────────
-- (No SQL-level size limit is set here — Supabase enforces the bucket-level
-- file_size_limit if configured in the Dashboard. To set it:
--   update storage.buckets
--     set file_size_limit = 5242880,   -- 5 MB
--         allowed_mime_types = array['application/pdf']
--     where id = 'practice-pdfs-private';
-- )

-- ─────────────────────────────────────────────────────────────────────────
-- Verification
-- ─────────────────────────────────────────────────────────────────────────
--
-- As a non-allowlisted, non-admin user "alice" with id = <alice-uid>:
--   - SELECT on storage.objects where name starts with '<alice-uid>/' → ok
--   - SELECT on storage.objects where name starts with 'royzivgsb/'   → 0 rows (RLS denies)
--   - INSERT into storage.objects with name = '<alice-uid>/foo.pdf'   → ok
--   - INSERT into storage.objects with name = '<bob-uid>/foo.pdf'     → policy violation
--   - DELETE on storage.objects where name = '<alice-uid>/foo.pdf'    → ok
--
-- As an allowlisted user:
--   - SELECT on storage.objects where name starts with 'royzivgsb/'   → ok
--
-- As an admin:
--   - all of the above → ok
