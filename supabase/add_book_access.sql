-- Adds per-book visibility, mirroring the existing resources/tests pattern:
--   everyone: any signed-in user can see it
--   selected: only explicitly assigned users can see it

alter table books
  add column if not exists access_level text not null default 'everyone'
  check (access_level in ('everyone', 'selected'));

create table if not exists book_allowed_users (
  book_id uuid not null references books on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (book_id, user_id)
);

alter table book_allowed_users enable row level security;

create index if not exists idx_book_allowed_users_user_id
  on book_allowed_users(user_id);

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
          b.access_level = 'everyone'
          or exists (
            select 1
            from public.book_allowed_users bau
            where bau.book_id = b.id
              and bau.user_id = auth.uid()
          )
        )
      )
  );
$$;

create or replace function public.admin_create_book(
  p_subject_id uuid,
  p_name text,
  p_file_url text,
  p_file_type text,
  p_cover_url text default null,
  p_access_level text default 'everyone',
  p_user_ids uuid[] default '{}',
  p_folder_id uuid default null
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

  if p_access_level = 'selected' and coalesce(array_length(p_user_ids, 1), 0) = 0 then
    raise exception 'Select at least one user' using errcode = '22023';
  end if;

  insert into books (subject_id, name, file_url, file_type, cover_url, access_level, folder_id)
  values (p_subject_id, p_name, p_file_url, p_file_type, p_cover_url, p_access_level, p_folder_id)
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

create or replace function public.admin_update_book_access(
  p_book_id uuid,
  p_access_level text,
  p_user_ids uuid[] default '{}'
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
    raise exception 'Only admins can update book access' using errcode = '42501';
  end if;

  if p_access_level not in ('everyone', 'selected') then
    raise exception 'Invalid access level' using errcode = '22023';
  end if;

  if p_access_level = 'selected' and coalesce(array_length(p_user_ids, 1), 0) = 0 then
    raise exception 'Select at least one user' using errcode = '22023';
  end if;

  update books
  set access_level = p_access_level,
      updated_at = now()
  where id = p_book_id
  returning * into v_book;

  delete from book_allowed_users
  where book_id = p_book_id;

  if p_access_level = 'selected' then
    insert into book_allowed_users (book_id, user_id)
    select p_book_id, user_id
    from unnest(p_user_ids) as user_id
    on conflict do nothing;
  end if;

  return v_book;
end;
$$;

-- Preview RPC: returns every book in a subject, including ones the caller
-- cannot fully access (marked locked), so the UI can show a locked card
-- instead of hiding the item. cover_url/name stay visible when locked so the
-- card still renders; file_url is withheld so no working link leaks out.
create or replace function public.get_books_preview(p_subject_id uuid)
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
  locked boolean
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
    not public.can_access_book(b.id) as locked
  from public.books b
  where b.subject_id = p_subject_id
  order by b.created_at desc;
$$;

grant execute on function public.admin_create_book(uuid, text, text, text, text, text, uuid[], uuid) to authenticated;
grant execute on function public.admin_update_book_access(uuid, text, uuid[]) to authenticated;
grant execute on function public.get_books_preview(uuid) to authenticated;

-- Books select RLS stays "using (true)", matching the existing pattern for
-- the raw resources/tests tables (see add_selected_user_access.sql) — the
-- preview RPC does the real client-facing gating for students, while admins
-- and any direct table reads keep seeing everything.
drop policy if exists "Books are readable by everyone" on books;
create policy "Books are readable by everyone"
  on books for select
  using (true);

drop policy if exists "Book access rows are readable by admins" on book_allowed_users;
create policy "Book access rows are readable by admins"
  on book_allowed_users for select
  using (public.is_admin());

drop policy if exists "Admins can insert book access rows" on book_allowed_users;
create policy "Admins can insert book access rows"
  on book_allowed_users for insert
  with check (public.is_admin());

drop policy if exists "Admins can delete book access rows" on book_allowed_users;
create policy "Admins can delete book access rows"
  on book_allowed_users for delete
  using (public.is_admin());
