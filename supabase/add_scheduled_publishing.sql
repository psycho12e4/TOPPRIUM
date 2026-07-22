-- Scheduled publishing: an admin can upload a resource/book/test now but set
-- a future scheduled_at time. The row exists in the DB immediately (file
-- already uploaded to storage), but stays invisible to students until that
-- time passes. Admins always see everything regardless of scheduling.
--
-- Visibility rule everywhere a student-facing query filters on status:
--   status = 'published' AND (scheduled_at IS NULL OR scheduled_at <= now())

alter table resources
  add column if not exists scheduled_at timestamptz;

alter table tests
  add column if not exists scheduled_at timestamptz;

alter table books
  add column if not exists status text not null default 'published',
  add column if not exists scheduled_at timestamptz;

create index if not exists idx_resources_scheduled_at on resources(scheduled_at);
create index if not exists idx_tests_scheduled_at on tests(scheduled_at);
create index if not exists idx_books_scheduled_at on books(scheduled_at);

-- ------------------------------------------------------------------
-- Update can_access_* to also require the scheduled time (if any) to have
-- passed. Admins still bypass everything via is_admin().
-- ------------------------------------------------------------------
create or replace function public.can_access_resource(resource_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.resources r
    where r.id = resource_id
      and (
        public.is_admin()
        or (
          r.status = 'published'
          and (r.scheduled_at is null or r.scheduled_at <= now())
          and (
            r.access_level = 'everyone'
            or exists (
              select 1
              from public.resource_allowed_users rau
              where rau.resource_id = r.id
                and rau.user_id = auth.uid()
            )
          )
        )
      )
  );
$$;

create or replace function public.can_access_test(test_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tests t
    where t.id = test_id
      and (
        public.is_admin()
        or (
          t.status = 'published'
          and (t.scheduled_at is null or t.scheduled_at <= now())
          and (
            t.access_level = 'everyone'
            or exists (
              select 1
              from public.test_allowed_users tau
              where tau.test_id = t.id
                and tau.user_id = auth.uid()
            )
          )
        )
      )
  );
$$;

create or replace function public.can_access_book(book_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.books b
    where b.id = book_id
      and (
        public.is_admin()
        or (
          b.status = 'published'
          and (b.scheduled_at is null or b.scheduled_at <= now())
          and (
            b.access_level = 'everyone'
            or exists (
              select 1
              from public.book_allowed_users bau
              where bau.book_id = b.id
                and bau.user_id = auth.uid()
            )
          )
        )
      )
  );
$$;

-- ------------------------------------------------------------------
-- Preview RPCs: not-yet-scheduled items are excluded entirely for
-- non-admins (per product decision — no visible "coming soon" card),
-- but admins still see them (with a computed is_scheduled flag) so they
-- can manage what they queued up.
-- ------------------------------------------------------------------
drop function if exists public.list_chapter_resources_preview(uuid);

create function public.list_chapter_resources_preview(p_chapter_id uuid)
returns table (
  id uuid,
  title text,
  file_type text,
  file_url text,
  access_level text,
  locked boolean,
  folder_id uuid,
  scheduled_at timestamptz,
  is_scheduled boolean
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.title,
    r.file_type,
    case when public.can_access_resource(r.id) then r.file_url else null end as file_url,
    r.access_level,
    not public.can_access_resource(r.id) as locked,
    r.folder_id,
    r.scheduled_at,
    (r.scheduled_at is not null and r.scheduled_at > now()) as is_scheduled
  from public.resources r
  where r.chapter_id = p_chapter_id
    and r.status = 'published'
    and (
      public.is_admin()
      or r.scheduled_at is null
      or r.scheduled_at <= now()
    )
  order by r.created_at desc;
$$;

drop function if exists public.list_chapter_tests_preview(uuid);

create function public.list_chapter_tests_preview(p_chapter_id uuid)
returns table (
  id uuid,
  title text,
  access_level text,
  locked boolean,
  folder_id uuid,
  scheduled_at timestamptz,
  is_scheduled boolean
)
language sql
security definer
set search_path = public
as $$
  select
    t.id,
    t.title,
    t.access_level,
    not public.can_access_test(t.id) as locked,
    t.folder_id,
    t.scheduled_at,
    (t.scheduled_at is not null and t.scheduled_at > now()) as is_scheduled
  from public.tests t
  where t.chapter_id = p_chapter_id
    and t.status = 'published'
    and (
      public.is_admin()
      or t.scheduled_at is null
      or t.scheduled_at <= now()
    )
  order by t.created_at desc;
$$;

drop function if exists public.get_books_preview(uuid);

create function public.get_books_preview(p_subject_id uuid)
returns table (
  id uuid,
  subject_id uuid,
  name text,
  cover_url text,
  file_url text,
  file_type text,
  folder_id uuid,
  access_level text,
  created_at timestamptz,
  updated_at timestamptz,
  locked boolean,
  scheduled_at timestamptz,
  is_scheduled boolean
)
language sql
security definer
set search_path = public
as $$
  select
    b.id,
    b.subject_id,
    b.name,
    b.cover_url,
    case when public.can_access_book(b.id) then b.file_url else null end as file_url,
    b.file_type,
    b.folder_id,
    b.access_level,
    b.created_at,
    b.updated_at,
    not public.can_access_book(b.id) as locked,
    b.scheduled_at,
    (b.scheduled_at is not null and b.scheduled_at > now()) as is_scheduled
  from public.books b
  where b.subject_id = p_subject_id
    and b.status = 'published'
    and (
      public.is_admin()
      or b.scheduled_at is null
      or b.scheduled_at <= now()
    )
  order by b.created_at desc;
$$;

-- ------------------------------------------------------------------
-- Admin create/update functions accept an optional scheduled_at.
-- ------------------------------------------------------------------
create or replace function public.admin_create_resource(
  p_chapter_id uuid,
  p_title text,
  p_file_url text,
  p_file_type text,
  p_access_level text default 'everyone',
  p_user_ids uuid[] default '{}',
  p_scheduled_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resource_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can create resources' using errcode = '42501';
  end if;

  if p_access_level not in ('everyone', 'selected') then
    raise exception 'Invalid access level' using errcode = '22023';
  end if;

  insert into resources (chapter_id, title, file_url, file_type, access_level, scheduled_at)
  values (p_chapter_id, p_title, p_file_url, p_file_type, p_access_level, p_scheduled_at)
  returning id into v_resource_id;

  if p_access_level = 'selected' then
    insert into resource_allowed_users (resource_id, user_id)
    select v_resource_id, user_id
    from unnest(p_user_ids) as user_id
    on conflict do nothing;
  end if;

  return v_resource_id;
end;
$$;

create or replace function public.admin_create_test(
  p_chapter_id uuid,
  p_title text,
  p_access_level text default 'everyone',
  p_user_ids uuid[] default '{}',
  p_scheduled_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_test_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can create tests' using errcode = '42501';
  end if;

  if p_access_level not in ('everyone', 'selected') then
    raise exception 'Invalid access level' using errcode = '22023';
  end if;

  insert into tests (chapter_id, title, access_level, scheduled_at)
  values (p_chapter_id, p_title, p_access_level, p_scheduled_at)
  returning id into v_test_id;

  if p_access_level = 'selected' then
    insert into test_allowed_users (test_id, user_id)
    select v_test_id, user_id
    from unnest(p_user_ids) as user_id
    on conflict do nothing;
  end if;

  return v_test_id;
end;
$$;

create or replace function public.admin_create_book(
  p_subject_id uuid,
  p_name text,
  p_file_url text,
  p_file_type text,
  p_cover_url text default null,
  p_access_level text default 'everyone',
  p_user_ids uuid[] default '{}',
  p_folder_id uuid default null,
  p_scheduled_at timestamptz default null
)
returns books
language plpgsql
security definer
set search_path = public
as $$
declare
  v_book books;
begin
  if not public.is_admin() then
    raise exception 'Only admins can create books' using errcode = '42501';
  end if;

  if p_access_level not in ('everyone', 'selected') then
    raise exception 'Invalid access level' using errcode = '22023';
  end if;

  insert into books (subject_id, name, file_url, file_type, cover_url, access_level, folder_id, scheduled_at)
  values (p_subject_id, p_name, p_file_url, p_file_type, p_cover_url, p_access_level, p_folder_id, p_scheduled_at)
  returning * into v_book;

  if p_access_level = 'selected' then
    insert into book_allowed_users (book_id, user_id)
    select v_book.id, user_id
    from unnest(p_user_ids) as user_id
    on conflict do nothing;
  end if;

  return v_book;
end;
$$;

grant execute on function public.admin_create_resource(uuid, text, text, text, text, uuid[], timestamptz) to authenticated;
grant execute on function public.admin_create_test(uuid, text, text, uuid[], timestamptz) to authenticated;
grant execute on function public.admin_create_book(uuid, text, text, text, text, text, uuid[], uuid, timestamptz) to authenticated;

-- ------------------------------------------------------------------
-- Announcements RPC: for the current student, returns titles (not content)
-- of anything that (a) is scheduled and not yet live — "will be uploaded at
-- <time>", or (b) went live since p_since — "new X uploaded". Access-gated
-- the same way the preview RPCs are (can_access_*), so a student never
-- learns about something they wouldn't otherwise be allowed to see once
-- it's live. Admins get nothing from this (they see everything already).
-- ------------------------------------------------------------------
create or replace function public.get_schedule_announcements(p_since timestamptz)
returns table (
  kind text,          -- 'resource' | 'test' | 'book'
  item_id uuid,
  title text,
  scheduled_at timestamptz,
  is_upcoming boolean, -- true = "will be uploaded at", false = "newly live"
  link_path text
)
language sql
security definer
set search_path = public
as $$
  select 'resource', r.id, r.title, r.scheduled_at,
    (r.scheduled_at > now()) as is_upcoming,
    '/chapter/' || r.chapter_id
  from public.resources r
  where r.status = 'published'
    and r.scheduled_at is not null
    and not public.is_admin()
    and (
      (r.scheduled_at > now() and (
        r.access_level = 'everyone'
        or exists (select 1 from public.resource_allowed_users rau where rau.resource_id = r.id and rau.user_id = auth.uid())
      ))
      or (r.scheduled_at <= now() and r.scheduled_at >= p_since and public.can_access_resource(r.id))
    )

  union all

  select 'test', t.id, t.title, t.scheduled_at,
    (t.scheduled_at > now()) as is_upcoming,
    '/test/' || t.id
  from public.tests t
  where t.status = 'published'
    and t.scheduled_at is not null
    and not public.is_admin()
    and (
      (t.scheduled_at > now() and (
        t.access_level = 'everyone'
        or exists (select 1 from public.test_allowed_users tau where tau.test_id = t.id and tau.user_id = auth.uid())
      ))
      or (t.scheduled_at <= now() and t.scheduled_at >= p_since and public.can_access_test(t.id))
    )

  union all

  select 'book', b.id, b.name, b.scheduled_at,
    (b.scheduled_at > now()) as is_upcoming,
    '/subject/' || b.subject_id
  from public.books b
  where b.status = 'published'
    and b.scheduled_at is not null
    and not public.is_admin()
    and (
      (b.scheduled_at > now() and (
        b.access_level = 'everyone'
        or exists (select 1 from public.book_allowed_users bau where bau.book_id = b.id and bau.user_id = auth.uid())
      ))
      or (b.scheduled_at <= now() and b.scheduled_at >= p_since and public.can_access_book(b.id))
    )

  order by scheduled_at desc;
$$;

grant execute on function public.get_schedule_announcements(timestamptz) to authenticated;
