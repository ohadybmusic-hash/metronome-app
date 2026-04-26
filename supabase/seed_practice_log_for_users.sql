-- Attach Practice log JSON (`data.exerciseProgress`) to specific accounts.
-- Run once in Supabase SQL Editor (service role / dashboard). Safe to re-run: keeps existing exerciseProgress if present.
--
-- Targets:
--   baton123@gmail.com  (no-op until this email exists in auth.users — user must sign up first)
--   ohadybmusic@gmail.com

insert into public.user_data (user_id, data)
select p.id,
  jsonb_build_object(
    'exerciseProgress',
    jsonb_build_object(
      'entries', '[]'::jsonb,
      'customExerciseNames', '[]'::jsonb
    )
  )
from public.profiles p
join auth.users u on u.id = p.id
where lower(trim(u.email)) in (
  lower(trim('baton123@gmail.com')),
  lower(trim('ohadybmusic@gmail.com'))
)
on conflict (user_id) do update
set data =
  coalesce(user_data.data, '{}'::jsonb)
  || jsonb_build_object(
    'exerciseProgress',
    coalesce(
      user_data.data->'exerciseProgress',
      excluded.data->'exerciseProgress'
    )
  ),
  updated_at = now();
