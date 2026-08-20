-- Homer Mission Control V3.8

create table if not exists public.mission_control_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

revoke all on table public.mission_control_state from anon;
grant select, insert, update on table public.mission_control_state to authenticated;
grant select, insert, update, delete on table public.mission_control_state to service_role;

alter table public.mission_control_state enable row level security;

drop policy if exists "Users can read their own Mission Control state" on public.mission_control_state;
drop policy if exists "Users can insert their own Mission Control state" on public.mission_control_state;
drop policy if exists "Users can update their own Mission Control state" on public.mission_control_state;

create policy "Users can read their own Mission Control state"
on public.mission_control_state
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can insert their own Mission Control state"
on public.mission_control_state
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "Users can update their own Mission Control state"
on public.mission_control_state
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create index if not exists mission_control_state_updated_at_idx
on public.mission_control_state (updated_at desc);
