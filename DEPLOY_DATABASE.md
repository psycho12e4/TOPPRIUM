# Deploy Database Schema

Follow these steps to deploy the database schema to your Supabase project.

## Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard/project/bzrxgolyrmgpxlzwxnzz
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**

## Step 2: Copy & Paste Schema

Copy the entire contents below and paste into the SQL Editor:

```sql
-- Enable extensions
create extension if not exists "uuid-ossp";

-- Create profiles table
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  role text default 'student' check (role in ('student', 'admin')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create subjects table
create table if not exists subjects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create chapters table
create table if not exists chapters (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references subjects on delete cascade,
  title text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create resources table
create table if not exists resources (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references chapters on delete cascade,
  title text not null,
  file_url text not null,
  file_type text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create tests table
create table if not exists tests (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references chapters on delete cascade,
  title text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create questions table
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

-- Create test_scores table
create table if not exists test_scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  test_id uuid not null references tests on delete cascade,
  score integer not null,
  total_questions integer not null,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table subjects enable row level security;
alter table chapters enable row level security;
alter table resources enable row level security;
alter table tests enable row level security;
alter table questions enable row level security;
alter table test_scores enable row level security;

-- Policies for profiles
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on profiles for select
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Policies for subjects (read-only for students)
create policy "Subjects are readable by everyone"
  on subjects for select
  using (true);

create policy "Admins can insert subjects"
  on subjects for insert
  with check ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Admins can update subjects"
  on subjects for update
  using ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Admins can delete subjects"
  on subjects for delete
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Policies for chapters
create policy "Chapters are readable by everyone"
  on chapters for select
  using (true);

create policy "Admins can insert chapters"
  on chapters for insert
  with check ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Admins can update chapters"
  on chapters for update
  using ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Admins can delete chapters"
  on chapters for delete
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Policies for resources
create policy "Resources are readable by everyone"
  on resources for select
  using (true);

create policy "Admins can insert resources"
  on resources for insert
  with check ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Admins can delete resources"
  on resources for delete
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Policies for tests
create policy "Tests are readable by everyone"
  on tests for select
  using (true);

create policy "Admins can insert tests"
  on tests for insert
  with check ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Admins can delete tests"
  on tests for delete
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Policies for questions
create policy "Questions are readable by everyone"
  on questions for select
  using (true);

create policy "Admins can insert questions"
  on questions for insert
  with check ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Admins can delete questions"
  on questions for delete
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- Policies for test_scores
create policy "Users can view their own scores"
  on test_scores for select
  using (auth.uid() = user_id);

create policy "Admins can view all scores"
  on test_scores for select
  using ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Users can insert their own scores"
  on test_scores for insert
  with check (auth.uid() = user_id);

-- Indexes for performance
create index idx_chapters_subject_id on chapters(subject_id);
create index idx_resources_chapter_id on resources(chapter_id);
create index idx_tests_chapter_id on tests(chapter_id);
create index idx_questions_test_id on questions(test_id);
create index idx_test_scores_user_id on test_scores(user_id);
create index idx_test_scores_test_id on test_scores(test_id);

-- Auth trigger for profile creation
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
```

## Step 3: Run Query

Click the blue **Run** button (or press Ctrl+Enter)

You should see success messages for each statement.

## Step 4: Verify Tables Created

Go to **Database** (left sidebar) and you should see all 7 tables:
- ✅ profiles
- ✅ subjects
- ✅ chapters
- ✅ resources
- ✅ tests
- ✅ questions
- ✅ test_scores

## Step 5: Create Storage Bucket

1. Go to **Storage** (left sidebar)
2. Click **Create Bucket**
3. Name: `resources`
4. Toggle **Public** on
5. Click **Create**

## Done!

Your database is now set up. Next steps:

1. Visit http://localhost:3000
2. Sign up with your email
3. Verify email (check inbox)
4. In Supabase, go to **Authentication → Users**
5. Find your user and note their ID
6. Go to **SQL Editor** and run:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'YOUR_USER_ID_HERE';
```

Then you can access `/admin` and start creating content!
