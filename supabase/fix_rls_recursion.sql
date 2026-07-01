-- FIX: Infinite recursion in profiles RLS policy
-- The "Admins can view all profiles" policy queried profiles within a profiles
-- policy, causing infinite recursion. This replaces the recursive check with a
-- SECURITY DEFINER function that bypasses RLS.

-- 1. Drop the recursive policies
drop policy if exists "Users can view their own profile" on profiles;
drop policy if exists "Admins can view all profiles" on profiles;

-- 2. Create a helper function that checks admin role WITHOUT triggering RLS
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- 3. Recreate profiles policies (non-recursive)
-- Everyone authenticated can read their own profile
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

-- Admins can read all profiles (uses SECURITY DEFINER function - no recursion)
create policy "Admins can view all profiles"
  on profiles for select
  using (public.is_admin());

-- Allow users to update their own profile (optional, for future use)
create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- 4. Replace the recursive admin checks in OTHER tables with the helper function
-- Subjects
drop policy if exists "Admins can insert subjects" on subjects;
drop policy if exists "Admins can update subjects" on subjects;
drop policy if exists "Admins can delete subjects" on subjects;

create policy "Admins can insert subjects" on subjects for insert with check (public.is_admin());
create policy "Admins can update subjects" on subjects for update using (public.is_admin());
create policy "Admins can delete subjects" on subjects for delete using (public.is_admin());

-- Chapters
drop policy if exists "Admins can insert chapters" on chapters;
drop policy if exists "Admins can update chapters" on chapters;
drop policy if exists "Admins can delete chapters" on chapters;

create policy "Admins can insert chapters" on chapters for insert with check (public.is_admin());
create policy "Admins can update chapters" on chapters for update using (public.is_admin());
create policy "Admins can delete chapters" on chapters for delete using (public.is_admin());

-- Resources
drop policy if exists "Admins can insert resources" on resources;
drop policy if exists "Admins can delete resources" on resources;

create policy "Admins can insert resources" on resources for insert with check (public.is_admin());
create policy "Admins can delete resources" on resources for delete using (public.is_admin());

-- Tests
drop policy if exists "Admins can insert tests" on tests;
drop policy if exists "Admins can delete tests" on tests;

create policy "Admins can insert tests" on tests for insert with check (public.is_admin());
create policy "Admins can delete tests" on tests for delete using (public.is_admin());

-- Questions
drop policy if exists "Admins can insert questions" on questions;
drop policy if exists "Admins can delete questions" on questions;

create policy "Admins can insert questions" on questions for insert with check (public.is_admin());
create policy "Admins can delete questions" on questions for delete using (public.is_admin());

-- Test scores
drop policy if exists "Admins can view all scores" on test_scores;
create policy "Admins can view all scores" on test_scores for select using (public.is_admin());
