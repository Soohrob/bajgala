-- Migration 003: display names, group details (Venmo/host note), notifications.
-- Run in the Supabase SQL editor after migration-002.

-- ── Profiles: public first names ───────────────────────────────────────────
alter table public.profiles add column if not exists display_name text;

-- Everyone may look up rows, but column grants below restrict what's readable:
-- id + display_name only. Emails stay private (your own email comes from the
-- auth session, not this table).
create policy "profiles are listable" on public.profiles
  for select to anon, authenticated using (true);

revoke select on public.profiles from anon, authenticated;
grant select (id, display_name) on public.profiles to anon, authenticated;

create policy "update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid()));

-- ── FK swaps so the API can join member/host names ─────────────────────────
alter table public.group_members drop constraint group_members_user_id_fkey;
alter table public.group_members
  add constraint group_members_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.groups drop constraint groups_created_by_fkey;
alter table public.groups
  add constraint groups_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

-- ── Group details editable by the host ──────────────────────────────────────
alter table public.groups
  add column if not exists venmo_handle text,
  add column if not exists host_note text;

create policy "host updates group" on public.groups
  for update to authenticated using (created_by = (select auth.uid()));

-- ── Notifications ────────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "read own notifications" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "mark own notifications read" on public.notifications
  for update to authenticated using (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.notifications;

-- Notify existing members (and the host) when someone joins.
create or replace function public.notify_member_joined()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  g record;
  joiner text;
begin
  select * into g from public.groups where id = new.group_id;
  select coalesce(display_name, 'A neighbor') into joiner
  from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, message)
  select distinct uid, joiner || ' joined your compost group at ' || g.host_label
  from (
    select created_by as uid from public.groups where id = new.group_id
    union
    select user_id from public.group_members where group_id = new.group_id
  ) t
  where uid is not null and uid <> new.user_id;

  return new;
end;
$$;

create trigger on_member_joined_notify
  after insert on public.group_members
  for each row execute function public.notify_member_joined();

-- Notify all members when a group activates.
create or replace function public.notify_group_activated()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status = 'forming' and new.status = 'active' then
    insert into public.notifications (user_id, message)
    select user_id,
           'Your compost group at ' || new.host_label || ' is now active — first pickup ' || new.pickup_day || '!'
    from public.group_members
    where group_id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_group_activated_notify
  after update on public.groups
  for each row execute function public.notify_group_activated();

-- Notify neighbors with interest pins within ~1 mile when a group starts nearby.
create or replace function public.notify_group_nearby()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, message)
  select distinct user_id,
         'A compost group is forming near you: ' || new.host_label || '. Join it before the spots fill.'
  from public.interest_pins
  where user_id is not null
    and user_id is distinct from new.created_by
    and abs(lat - new.lat) < 0.0145   -- ~1 mile of latitude
    and abs(lng - new.lng) < 0.0174;  -- ~1 mile of longitude at Atlanta's latitude
  return new;
end;
$$;

create trigger on_group_created_notify
  after insert on public.groups
  for each row execute function public.notify_group_nearby();
