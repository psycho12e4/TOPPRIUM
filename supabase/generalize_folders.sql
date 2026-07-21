-- Generalize folders from "chapter-scoped resource groups" into a reusable
-- container: a folder now belongs to exactly one of a chapter, a subject, or
-- a parent folder (nesting), and can hold chapters and/or books in addition
-- to resources.

alter table folders
  alter column chapter_id drop not null,
  add column if not exists subject_id uuid references subjects on delete cascade,
  add column if not exists parent_folder_id uuid references folders on delete cascade;

alter table folders
  drop constraint if exists folders_single_parent_check,
  add constraint folders_single_parent_check check (
    (case when chapter_id is not null then 1 else 0 end)
    + (case when subject_id is not null then 1 else 0 end)
    + (case when parent_folder_id is not null then 1 else 0 end)
    = 1
  );

alter table chapters
  add column if not exists folder_id uuid references folders on delete set null;

alter table books
  add column if not exists folder_id uuid references folders on delete set null;

create index if not exists idx_folders_subject_id on folders(subject_id);
create index if not exists idx_folders_parent_folder_id on folders(parent_folder_id);
create index if not exists idx_chapters_folder_id on chapters(folder_id);
create index if not exists idx_books_folder_id on books(folder_id);
