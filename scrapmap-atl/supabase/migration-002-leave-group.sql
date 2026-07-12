-- Migration 002: leave-group support.
-- Run this in the Supabase SQL editor (your database already has schema.sql).
-- Deletes a group when its last real member leaves, unless it's a seeded demo
-- group (seed_members > 0), which should stick around for the map.

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
