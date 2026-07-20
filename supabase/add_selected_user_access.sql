-- Adds per-resource and per-test visibility:
--   everyone: any signed-in user can see it
--   selected: only explicitly assigned users can see it

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table profiles
  add column if not exists email text;

insert into profiles (id, email, role)
select u.id, u.email, 'student'
from auth.users u
where not exists (
  select 1
  from profiles p
  where p.id = u.id
);

update profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email <> u.email);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'student')
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

alter table resources
  add column if not exists status text not null default 'published',
  add column if not exists access_level text not null default 'everyone'
  check (access_level in ('everyone', 'selected'));

alter table tests
  add column if not exists status text not null default 'published',
  add column if not exists access_level text not null default 'everyone'
  check (access_level in ('everyone', 'selected'));

create table if not exists resource_allowed_users (
  resource_id uuid not null references resources on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (resource_id, user_id)
);

create table if not exists test_allowed_users (
  test_id uuid not null references tests on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (test_id, user_id)
);

alter table resource_allowed_users enable row level security;
alter table test_allowed_users enable row level security;

create index if not exists idx_resource_allowed_users_user_id
  on resource_allowed_users(user_id);

create index if not exists idx_test_allowed_users_user_id
  on test_allowed_users(user_id);

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

  if p_access_level = 'selected' and coalesce(array_length(p_user_ids, 1), 0) = 0 then
    raise exception 'Select at least one user' using errcode = '22023';
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

  if p_access_level = 'selected' and coalesce(array_length(p_user_ids, 1), 0) = 0 then
    raise exception 'Select at least one user' using errcode = '22023';
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

  if p_access_level = 'selected' and coalesce(array_length(p_user_ids, 1), 0) = 0 then
    raise exception 'Select at least one user' using errcode = '22023';
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

  if p_access_level = 'selected' and coalesce(array_length(p_user_ids, 1), 0) = 0 then
    raise exception 'Select at least one user' using errcode = '22023';
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

grant execute on function public.admin_create_resource(uuid, text, text, text, text, uuid[]) to authenticated;
grant execute on function public.admin_update_resource_access(uuid, text, uuid[]) to authenticated;
grant execute on function public.admin_create_test(uuid, text, text, uuid[]) to authenticated;
grant execute on function public.admin_update_test_access(uuid, text, uuid[]) to authenticated;

drop policy if exists "Resources are readable by everyone" on resources;
drop policy if exists "Published resources are readable by everyone" on resources;
drop policy if exists "Visible resources are readable" on resources;
create policy "Visible resources are readable"
  on resources for select
  using (public.can_access_resource(id));

drop policy if exists "Admins can insert resources" on resources;
create policy "Admins can insert resources"
  on resources for insert
  with check (public.is_admin());

drop policy if exists "Admins can update resources" on resources;
create policy "Admins can update resources"
  on resources for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete resources" on resources;
create policy "Admins can delete resources"
  on resources for delete
  using (public.is_admin());

drop policy if exists "Tests are readable by everyone" on tests;
drop policy if exists "Published tests are readable by everyone" on tests;
drop policy if exists "Visible tests are readable" on tests;
create policy "Visible tests are readable"
  on tests for select
  using (public.can_access_test(id));

drop policy if exists "Admins can insert tests" on tests;
create policy "Admins can insert tests"
  on tests for insert
  with check (public.is_admin());

drop policy if exists "Admins can update tests" on tests;
create policy "Admins can update tests"
  on tests for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete tests" on tests;
create policy "Admins can delete tests"
  on tests for delete
  using (public.is_admin());

drop policy if exists "Resource access rows are readable by admins" on resource_allowed_users;
create policy "Resource access rows are readable by admins"
  on resource_allowed_users for select
  using (public.is_admin());

drop policy if exists "Admins can insert resource access rows" on resource_allowed_users;
create policy "Admins can insert resource access rows"
  on resource_allowed_users for insert
  with check (public.is_admin());

drop policy if exists "Admins can delete resource access rows" on resource_allowed_users;
create policy "Admins can delete resource access rows"
  on resource_allowed_users for delete
  using (public.is_admin());

drop policy if exists "Test access rows are readable by admins" on test_allowed_users;
create policy "Test access rows are readable by admins"
  on test_allowed_users for select
  using (public.is_admin());

drop policy if exists "Admins can insert test access rows" on test_allowed_users;
create policy "Admins can insert test access rows"
  on test_allowed_users for insert
  with check (public.is_admin());

drop policy if exists "Admins can delete test access rows" on test_allowed_users;
create policy "Admins can delete test access rows"
  on test_allowed_users for delete
  using (public.is_admin());

drop policy if exists "Questions are readable by everyone" on questions;
drop policy if exists "Questions for visible tests are readable" on questions;
create policy "Questions for visible tests are readable"
  on questions for select
  using (public.can_access_test(test_id));
