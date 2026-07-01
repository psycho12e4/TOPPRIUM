-- ============================================================
-- Phase 1: Review workflow for AI-generated content
-- Adds a review status so scheduled/AI-generated tests & resources
-- land as 'pending' and only become student-visible once an admin
-- approves them. Existing rows default to 'published' (no change in
-- what students currently see).
-- ============================================================

-- ---- Columns -------------------------------------------------
alter table tests
  add column if not exists status text not null default 'published'
    check (status in ('pending', 'published', 'rejected'));
alter table tests
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'ai'));

alter table resources
  add column if not exists status text not null default 'published'
    check (status in ('pending', 'published', 'rejected'));
alter table resources
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'ai'));

-- Indexes to keep the review queue fast
create index if not exists idx_tests_status on tests(status);
create index if not exists idx_resources_status on resources(status);

-- ---- RLS: tests ----------------------------------------------
-- Public sees only published; admins see everything.
drop policy if exists "Tests are readable by everyone" on tests;
create policy "Published tests are readable by everyone"
  on tests for select
  using (
    status = 'published'
    or (select role from profiles where id = auth.uid()) = 'admin'
  );

-- Admins need UPDATE to approve/reject/edit (previously only insert/delete existed).
drop policy if exists "Admins can update tests" on tests;
create policy "Admins can update tests"
  on tests for update
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- ---- RLS: resources ------------------------------------------
drop policy if exists "Resources are readable by everyone" on resources;
create policy "Published resources are readable by everyone"
  on resources for select
  using (
    status = 'published'
    or (select role from profiles where id = auth.uid()) = 'admin'
  );

drop policy if exists "Admins can update resources" on resources;
create policy "Admins can update resources"
  on resources for update
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- ---- RLS: questions ------------------------------------------
-- Questions are only readable when their parent test is published
-- (admins always). Prevents leaking draft questions via a direct query.
drop policy if exists "Questions are readable by everyone" on questions;
create policy "Questions readable when parent test is published"
  on questions for select
  using (
    (select role from profiles where id = auth.uid()) = 'admin'
    or exists (
      select 1 from tests t
      where t.id = questions.test_id and t.status = 'published'
    )
  );

drop policy if exists "Admins can update questions" on questions;
create policy "Admins can update questions"
  on questions for update
  using ((select role from profiles where id = auth.uid()) = 'admin');
