-- Migration 004: group board + proactive matchmaking.
-- Run in the Supabase SQL editor after migration-003.

-- ── Group board: one shared message list per group, members only ────────────
create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.group_messages enable row level security;

create policy "members read board" on public.group_messages
  for select to authenticated using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id and gm.user_id = (select auth.uid())
    )
  );

create policy "members post to board" on public.group_messages
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id and gm.user_id = (select auth.uid())
    )
  );

alter publication supabase_realtime add table public.group_messages;

-- Notify the other members when someone posts.
create or replace function public.notify_board_post()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  g record;
  author text;
begin
  select * into g from public.groups where id = new.group_id;
  select coalesce(display_name, 'A neighbor') into author
  from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, message)
  select user_id, author || ' posted in your group at ' || g.host_label || ': "' || left(new.body, 80) || '"'
  from public.group_members
  where group_id = new.group_id and user_id <> new.user_id;

  return new;
end;
$$;

create trigger on_board_post_notify
  after insert on public.group_messages
  for each row execute function public.notify_board_post();

-- ── Proactive matchmaking ────────────────────────────────────────────────────
-- When a new pin makes 3+ real pins within ~half a mile and there's no group
-- within a mile, tell the cluster their block is ready. On the crossing pin
-- (count = 3) everyone hears; later pins only notify the newcomer.
create or replace function public.notify_pin_cluster()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cluster_count int;
  nearby_groups int;
begin
  select count(*) into cluster_count
  from public.interest_pins
  where user_id is not null
    and abs(lat - new.lat) < 0.0073   -- ~0.5 mile
    and abs(lng - new.lng) < 0.0087;

  select count(*) into nearby_groups
  from public.groups
  where abs(lat - new.lat) < 0.0145   -- ~1 mile
    and abs(lng - new.lng) < 0.0174;

  if nearby_groups > 0 or cluster_count < 3 then
    return new;
  end if;

  if cluster_count = 3 then
    insert into public.notifications (user_id, message)
    select user_id,
           'Your block is ready: 3 neighbors within half a mile want to compost. Start the group — whoever claims it hosts the bin.'
    from public.interest_pins
    where user_id is not null
      and abs(lat - new.lat) < 0.0073
      and abs(lng - new.lng) < 0.0087;
  else
    insert into public.notifications (user_id, message)
    values (new.user_id,
            'You''re one of ' || cluster_count || ' neighbors on this block who want to compost — enough to start a group today.');
  end if;

  return new;
end;
$$;

create trigger on_pin_cluster_notify
  after insert on public.interest_pins
  for each row execute function public.notify_pin_cluster();
