-- TOPPRIUM Complete Schema Deploy (with RLS recursion fix)
-- Run this ENTIRE script at once in Supabase SQL Editor

-- ============ EXTENSIONS ============
create extension if not exists "uuid-ossp";

-- ============ TABLES ============
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  role text default 'student' check (role in ('student', 'admin')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists subjects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists chapters (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references subjects on delete cascade,
  title text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists resources (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references chapters on delete cascade,
  title text not null,
  file_url text not null,
  file_type text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists tests (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references chapters on delete cascade,
  title text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists questions (
  id uuid primary key default uuid_generate_v4(),
  test_id uuid not null references tests on delete cascade,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null check (correct_answer in ('a', 'b', 'c', 'd')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists test_scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  test_id uuid not null references tests on delete cascade,
  score integer not null,
  total_questions integer not null,
  created_at timestamp with time zone default now()
);

-- ============ ROW LEVEL SECURITY ============
alter table profiles enable row level security;
alter table subjects enable row level security;
alter table chapters enable row level security;
alter table resources enable row level security;
alter table tests enable row level security;
alter table questions enable row level security;
alter table test_scores enable row level security;

-- ============ HELPER FUNCTION (avoids RLS recursion) ============
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ============ POLICIES: PROFILES ============
create policy "Users can view their own profile"
  on profiles for select using (auth.uid() = id);

create policy "Admins can view all profiles"
  on profiles for select using (public.is_admin());

-- ============ POLICIES: SUBJECTS ============
create policy "Subjects are readable by everyone"
  on subjects for select using (true);

create policy "Admins can insert subjects"
  on subjects for insert with check (public.is_admin());

create policy "Admins can update subjects"
  on subjects for update using (public.is_admin());

create policy "Admins can delete subjects"
  on subjects for delete using (public.is_admin());

-- ============ POLICIES: CHAPTERS ============
create policy "Chapters are readable by everyone"
  on chapters for select using (true);

create policy "Admins can insert chapters"
  on chapters for insert with check (public.is_admin());

create policy "Admins can update chapters"
  on chapters for update using (public.is_admin());

create policy "Admins can delete chapters"
  on chapters for delete using (public.is_admin());

-- ============ POLICIES: RESOURCES ============
create policy "Resources are readable by everyone"
  on resources for select using (true);

create policy "Admins can insert resources"
  on resources for insert with check (public.is_admin());

create policy "Admins can delete resources"
  on resources for delete using (public.is_admin());

-- ============ POLICIES: TESTS ============
create policy "Tests are readable by everyone"
  on tests for select using (true);

create policy "Admins can insert tests"
  on tests for insert with check (public.is_admin());

create policy "Admins can delete tests"
  on tests for delete using (public.is_admin());

-- ============ POLICIES: QUESTIONS ============
create policy "Questions are readable by everyone"
  on questions for select using (true);

create policy "Admins can insert questions"
  on questions for insert with check (public.is_admin());

create policy "Admins can delete questions"
  on questions for delete using (public.is_admin());

-- ============ POLICIES: TEST_SCORES ============
create policy "Users can view their own scores"
  on test_scores for select using (auth.uid() = user_id);

create policy "Admins can view all scores"
  on test_scores for select using (public.is_admin());

create policy "Users can insert their own scores"
  on test_scores for insert with check (auth.uid() = user_id);

-- ============ INDEXES ============
create index idx_chapters_subject_id on chapters(subject_id);
create index idx_resources_chapter_id on resources(chapter_id);
create index idx_tests_chapter_id on tests(chapter_id);
create index idx_questions_test_id on questions(test_id);
create index idx_test_scores_user_id on test_scores(user_id);
create index idx_test_scores_test_id on test_scores(test_id);

-- ============ AUTH TRIGGER ============
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'student');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
