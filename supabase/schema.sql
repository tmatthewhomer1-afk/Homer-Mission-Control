-- Homer Mission Control V3.8
-- Run in Supabase SQL Editor after creating the project.

create table if not exists public.mission_control_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.mission_control_state enable row level security;

create policy "Users can read their own Mission Control state"
on public.mission_control_state
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own Mission Control state"
on public.mission_control_state
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own Mission Control state"
on public.mission_control_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists mission_control_state_updated_at_idx
on public.mission_control_state (updated_at desc);
