-- Tests can now belong to a folder (grouping them alongside resources within
-- a chapter), same as resources already do.

alter table tests
  add column if not exists folder_id uuid references folders on delete set null;

create index if not exists idx_tests_folder_id on tests(folder_id);

-- Include folder_id in the locked-preview RPC so the student-facing chapter
-- page can group tests by folder the same way it already groups resources.
drop function if exists public.list_chapter_tests_preview(uuid);

create function public.list_chapter_tests_preview(p_chapter_id uuid)
returns table (
  id uuid,
  title text,
  access_level text,
  locked boolean,
  folder_id uuid
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
    t.folder_id
  from public.tests t
  where t.chapter_id = p_chapter_id
    and t.status = 'published'
  order by t.created_at desc;
$$;
