-- Grant admin (profiles.is_admin) for dashboard / RLS admin paths.
-- Adjust emails as needed. Safe to re-run.

update public.profiles p
set is_admin = true
from auth.users u
where p.id = u.id
  and lower(trim(u.email)) in (
    lower(trim('ohadybmusic@gmail.com')),
    lower(trim('baston123@gmail.com'))
  );
