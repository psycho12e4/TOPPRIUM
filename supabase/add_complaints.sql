-- Complaints table: lets any user (logged in or anonymous) submit a
-- complaint with an email and message. Admins can view all complaints.
create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

alter table complaints enable row level security;

create policy "Anyone can submit a complaint"
  on complaints for insert
  with check (true);

create policy "Users can view their own complaints"
  on complaints for select
  using (auth.uid() = user_id);

create policy "Admins can view all complaints"
  on complaints for select
  using ((select role from profiles where id = auth.uid()) = 'admin');

create policy "Admins can update complaints"
  on complaints for update
  using ((select role from profiles where id = auth.uid()) = 'admin');

create index idx_complaints_created_at on complaints(created_at);
