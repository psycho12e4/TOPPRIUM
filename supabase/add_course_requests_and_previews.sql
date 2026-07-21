-- Course access requests + locked-item preview support.
--
-- 1. course_requests: a signed-in student submits their name, class and email
--    to request manual course purchase (payment collected at school). Admins
--    review these and grant access via the existing test/resource allow-lists.
-- 2. Preview RPCs: return title-only metadata for tests/resources in a chapter,
--    INCLUDING items the caller cannot fully access, so the UI can show a
--    "locked" card. Gated content (questions, file URLs) is never exposed here.

-- ------------------------------------------------------------------
-- 1. course_requests table
-- ------------------------------------------------------------------
create table if not exists course_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  student_class text not null,
  email text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

alter table course_requests enable row level security;

drop policy if exists "Signed-in users can submit a course request" on course_requests;
create policy "Signed-in users can submit a course request"
  on course_requests for insert
  with check (auth.uid() is not null);

drop policy if exists "Users can view their own course requests" on course_requests;
create policy "Users can view their own course requests"
  on course_requests for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can view all course requests" on course_requests;
create policy "Admins can view all course requests"
  on course_requests for select
  using (public.is_admin());

drop policy if exists "Admins can update course requests" on course_requests;
create policy "Admins can update course requests"
  on course_requests for update
  using (public.is_admin());

create index if not exists idx_course_requests_created_at
  on course_requests(created_at);

-- ------------------------------------------------------------------
-- 2. Preview RPCs (title-only; locked flag computed per caller)
-- ------------------------------------------------------------------
create or replace function public.list_chapter_tests_preview(p_chapter_id uuid)
returns table (
  id uuid,
  title text,
  access_level text,
  locked boolean
)
language sql
security definer
set search_path = public
as $$
  select
    t.id,
    t.title,
    t.access_level,
    not public.can_access_test(t.id) as locked
  from public.tests t
  where t.chapter_id = p_chapter_id
    and t.status = 'published'
  order by t.created_at desc;
$$;

create or replace function public.list_chapter_resources_preview(p_chapter_id uuid)
returns table (
  id uuid,
  title text,
  file_type text,
  file_url text,
  access_level text,
  locked boolean
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.title,
    r.file_type,
    -- Never leak the file URL to someone who cannot access the resource.
    case when public.can_access_resource(r.id) then r.file_url else null end as file_url,
    r.access_level,
    not public.can_access_resource(r.id) as locked
  from public.resources r
  where r.chapter_id = p_chapter_id
    and r.status = 'published'
  order by r.created_at desc;
$$;
