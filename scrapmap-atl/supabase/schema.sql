-- ScrapMap ATL — Stage 1 schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).

-- ── Profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Interest pins (block-level, snapped client-side for privacy) ───────────
create table public.interest_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  lat double precision not null,
  lng double precision not null,
  neighborhood_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id)
);

-- ── Groups ──────────────────────────────────────────────────────────────────
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id text not null,
  host_label text not null,
  lat double precision not null,
  lng double precision not null,
  capacity int not null default 6,
  monthly_cost numeric not null default 32,
  pickup_day text not null default 'Thursday',
  bin_size text not null default '12-gallon bin',
  status text not null default 'forming' check (status in ('forming', 'active')),
  activation_target int not null default 4,
  -- Demo/seed groups carry phantom members so the map isn't empty pre-launch.
  seed_members int not null default 0,
  invite_code text not null unique,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Activate a forming group once real + seed members reach the target.
create or replace function public.check_group_activation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  total int;
begin
  select g.seed_members + count(gm.user_id) into total
  from public.groups g
  left join public.group_members gm on gm.group_id = g.id
  where g.id = new.group_id
  group by g.seed_members;

  update public.groups
  set status = 'active'
  where id = new.group_id and status = 'forming' and total >= activation_target;

  return new;
end;
$$;

create trigger on_group_member_added
  after insert on public.group_members
  for each row execute function public.check_group_activation();

-- Delete a group when its last real member leaves (seeded demo groups stay).
create or replace function public.cleanup_empty_group()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  remaining int;
begin
  select count(*) into remaining
  from public.group_members
  where group_id = old.group_id;

  delete from public.groups
  where id = old.group_id and seed_members = 0 and remaining = 0;

  return old;
end;
$$;

create trigger on_group_member_removed
  after delete on public.group_members
  for each row execute function public.cleanup_empty_group();

-- ── Row-level security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.interest_pins enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

-- The map is public: pins are pre-snapped to block level, never exact addresses.
create policy "pins are public" on public.interest_pins
  for select to anon, authenticated using (true);
create policy "insert own pin" on public.interest_pins
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own pin" on public.interest_pins
  for update to authenticated using (user_id = (select auth.uid()));
create policy "delete own pin" on public.interest_pins
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "groups are public" on public.groups
  for select to anon, authenticated using (true);
create policy "create group" on public.groups
  for insert to authenticated with check (created_by = (select auth.uid()));

create policy "memberships are public" on public.group_members
  for select to anon, authenticated using (true);
create policy "join group" on public.group_members
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "leave group" on public.group_members
  for delete to authenticated using (user_id = (select auth.uid()));

-- ── Realtime ────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.group_members;
alter publication supabase_realtime add table public.interest_pins;
