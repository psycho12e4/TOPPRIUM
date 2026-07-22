-- "Selected users only" with zero users picked is now a valid, supported
-- state: the item is visible to everyone but locked/inaccessible (the
-- existing can_access_* functions already return false for a non-admin
-- when access_level = 'selected' and no allow-list row matches). Previously
-- these RPCs rejected that combination outright; drop that guard so admins
-- can save "selected + nobody yet" without picking a placeholder user.

create or replace function public.admin_create_resource(
  p_chapter_id uuid,
  p_title text,
  p_file_url text,
  p_file_type text,
  p_access_level text default 'everyone',
  p_user_ids uuid[] default '{}'
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

  insert into resources (chapter_id, title, file_url, file_type, access_level)
  values (p_chapter_id, p_title, p_file_url, p_file_type, p_access_level)
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

create or replace function public.admin_update_resource_access(
  p_resource_id uuid,
  p_access_level text,
  p_user_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can update resource access' using errcode = '42501';
  end if;

  if p_access_level not in ('everyone', 'selected') then
    raise exception 'Invalid access level' using errcode = '22023';
  end if;

  update resources
  set access_level = p_access_level,
      updated_at = now()
  where id = p_resource_id;

  delete from resource_allowed_users
  where resource_id = p_resource_id;

  if p_access_level = 'selected' then
    insert into resource_allowed_users (resource_id, user_id)
    select p_resource_id, user_id
    from unnest(p_user_ids) as user_id
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.admin_create_test(
  p_chapter_id uuid,
  p_title text,
  p_access_level text default 'everyone',
  p_user_ids uuid[] default '{}'
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

  insert into tests (chapter_id, title, access_level)
  values (p_chapter_id, p_title, p_access_level)
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

create or replace function public.admin_update_test_access(
  p_test_id uuid,
  p_access_level text,
  p_user_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can update test access' using errcode = '42501';
  end if;

  if p_access_level not in ('everyone', 'selected') then
    raise exception 'Invalid access level' using errcode = '22023';
  end if;

  update tests
  set access_level = p_access_level,
      updated_at = now()
  where id = p_test_id;

  delete from test_allowed_users
  where test_id = p_test_id;

  if p_access_level = 'selected' then
    insert into test_allowed_users (test_id, user_id)
    select p_test_id, user_id
    from unnest(p_user_ids) as user_id
    on conflict do nothing;
  end if;
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
