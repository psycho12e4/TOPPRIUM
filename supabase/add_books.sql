-- Books: admins can attach one or more textbook files to a Subject, each with
-- a custom name and cover image, shown to students before the chapter list.

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects on delete cascade,
  name text not null,
  cover_url text,
  file_url text not null,
  file_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table books enable row level security;

create index if not exists idx_books_subject_id on books(subject_id);

-- Books are readable by anyone who can read the subject (subjects are open
-- read today); only admins can write.
drop policy if exists "Books are readable by everyone" on books;
create policy "Books are readable by everyone"
  on books for select
  using (true);

drop policy if exists "Admins can manage books" on books;
create policy "Admins can manage books"
  on books for all
  using (public.is_admin())
  with check (public.is_admin());

-- Storage bucket for uploaded book cover images (public read, admin write).
-- The book file itself reuses the existing 'resources' bucket/upload path.
insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true)
on conflict (id) do nothing;

drop policy if exists "Book covers are publicly readable" on storage.objects;
create policy "Book covers are publicly readable"
  on storage.objects for select
  using (bucket_id = 'book-covers');

drop policy if exists "Admins can upload book covers" on storage.objects;
create policy "Admins can upload book covers"
  on storage.objects for insert
  with check (bucket_id = 'book-covers' and public.is_admin());

drop policy if exists "Admins can update book covers" on storage.objects;
create policy "Admins can update book covers"
  on storage.objects for update
  using (bucket_id = 'book-covers' and public.is_admin());

drop policy if exists "Admins can delete book covers" on storage.objects;
create policy "Admins can delete book covers"
  on storage.objects for delete
  using (bucket_id = 'book-covers' and public.is_admin());
