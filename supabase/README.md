# Supabase setup

SQL files in this folder are meant to be run **in order** via the Supabase SQL Editor for this project.

## Migration order

1. `auth_and_user_data.sql` — profiles + user_data tables, RLS, triggers.
2. `system_status.sql` — system_status table + RLS.
3. `seed_practice_log_for_users.sql` — optional seed data.
4. `grant_admin_users.sql` — promotes specific accounts to admin.
5. **`lock_is_admin_escalation.sql`** — closes a self-promotion bug in the profiles UPDATE policy. **Critical, run this if you haven't already.**
6. **`practice_pdfs_private_bucket.sql`** — moves ROYZIVGSB course PDFs from `public/practice-pdfs/` into a private Storage bucket, gated by RLS.

## After running `practice_pdfs_private_bucket.sql`

The bucket is empty. Upload the existing PDFs into it before the client tries to use them:

```bash
cd metronome-app

# Get the service-role key from Supabase → Settings → API.
# Do not commit it. Run this once locally.
SUPABASE_SERVICE_ROLE_KEY=<paste key here> node scripts/upload-practice-pdfs.mjs
```

The script reads every `*.pdf` under `public/practice-pdfs/` and uploads them to the `practice-pdfs-private` bucket, preserving the folder structure. It's idempotent — safe to rerun.

## After the bucket is populated and verified

Once you've confirmed PDFs open via signed URLs in the deployed app, you can remove the public copies for full lockdown:

```bash
rm -r metronome-app/public/practice-pdfs/royzivgsb/
```

The client falls back to the public path if a signed URL request fails — so until you delete the public folder, both work. After you delete it, the app uses signed URLs only.

## Adding a new allowed user

Add them to `public.allowed_pdf_users`:

```sql
insert into public.allowed_pdf_users (email, library_id)
values ('newuser@example.com', 'royzivgsb');
```

The hardcoded list in `src/lib/royzivgsbAccess.js` is now only used for the *UI* gate (does the Sheet library show up?). The real security boundary is the RLS policy on `storage.objects`. If you want the UI to match exactly, also update that file — or follow up by switching the UI to query `allowed_pdf_users` at runtime.
