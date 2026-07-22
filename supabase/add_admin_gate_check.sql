-- Moves the admin-gate password check server-side so the password itself
-- never ships in client JS. The browser sends the entered password and gets
-- back true/false; the actual string is only compared inside Postgres.
--
-- This is still just a speed-bump in front of /admin (the real authorization
-- boundary is is_admin() + RLS), but the password should not be readable by
-- viewing the site's source or the built JS bundle.

create or replace function public.check_admin_gate_password(p_password text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select p_password = 'ToppriumToppers';
$$;

grant execute on function public.check_admin_gate_password(text) to authenticated, anon;
