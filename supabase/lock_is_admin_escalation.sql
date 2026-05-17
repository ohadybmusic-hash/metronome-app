-- Fix: prevent self-escalation to admin via profiles_update_self_or_admin policy.
--
-- The existing policy in auth_and_user_data.sql allows users to UPDATE their
-- own profile row, but RLS in Postgres cannot enforce column-level immutability
-- in WITH CHECK. Without this trigger, any authenticated user can run
--   update profiles set is_admin = true where id = auth.uid()
-- and grant themselves admin privileges.
--
-- Run in Supabase SQL Editor after auth_and_user_data.sql.

create or replace function public.prevent_is_admin_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.is_admin is distinct from old.is_admin) and not public.is_admin() then
    raise exception 'Only admins can modify the is_admin column';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_is_admin_escalation on public.profiles;
create trigger prevent_is_admin_escalation
before update on public.profiles
for each row execute procedure public.prevent_is_admin_escalation();

-- Verification:
-- As a non-admin authenticated user, this should fail with:
--   "Only admins can modify the is_admin column"
--
--   update profiles set is_admin = true where id = auth.uid();
--
-- As the same user, this should still succeed (updating email):
--
--   update profiles set email = email where id = auth.uid();
