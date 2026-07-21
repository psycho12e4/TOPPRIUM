-- Folders: admins can group resources within a chapter under a named folder
-- with a custom logo image. Resources not assigned to a folder keep showing
-- directly under the chapter, as before.

create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters on delete cascade,
  name text not null,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table resources
  add column if not exists folder_id uuid references folders on delete set null;

alter table folders enable row level security;

create index if not exists idx_folders_chapter_id on folders(chapter_id);
create index if not exists idx_resources_folder_id on resources(folder_id);

-- A folder is just a name + logo grouping with no sensitive content itself,
-- so it's fine to read for anyone; the resources inside it stay gated by
-- their own existing per-row access control regardless of which folder
-- they're assigned to. Only admins can create/rename/delete folders.
drop policy if exists "Folders are readable by everyone" on folders;
create policy "Folders are readable by everyone"
  on folders for select
  using (true);

drop policy if exists "Admins can manage folders" on folders;
create policy "Admins can manage folders"
  on folders for all
  using (public.is_admin())
  with check (public.is_admin());

-- Storage bucket for uploaded folder logo images (public read, admin write).
insert into storage.buckets (id, name, public)
values ('folder-logos', 'folder-logos', true)
on conflict (id) do nothing;

drop policy if exists "Folder logos are publicly readable" on storage.objects;
create policy "Folder logos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'folder-logos');

drop policy if exists "Admins can upload folder logos" on storage.objects;
create policy "Admins can upload folder logos"
  on storage.objects for insert
  with check (bucket_id = 'folder-logos' and public.is_admin());

drop policy if exists "Admins can update folder logos" on storage.objects;
create policy "Admins can update folder logos"
  on storage.objects for update
  using (bucket_id = 'folder-logos' and public.is_admin());

drop policy if exists "Admins can delete folder logos" on storage.objects;
create policy "Admins can delete folder logos"
  on storage.objects for delete
  using (bucket_id = 'folder-logos' and public.is_admin());

-- Resources can now belong to a folder; include folder_id in the preview RPC
-- so the student-facing chapter page can group locked/unlocked cards by folder.
drop function if exists public.list_chapter_resources_preview(uuid);

create function public.list_chapter_resources_preview(p_chapter_id uuid)
returns table (
  id uuid,
  title text,
  file_type text,
  file_url text,
  access_level text,
  locked boolean,
  folder_id uuid
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
    r.folder_id
  from public.resources r
  where r.chapter_id = p_chapter_id
    and r.status = 'published'
  order by r.created_at desc;
$$;
