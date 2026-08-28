-- Service-role read of read_mode. Direct table access to user_settings only
-- has grants for `authenticated` (see 20260730220000_rename_user_llm_settings.sql);
-- service_role has no such grant by design in this codebase (see the various
-- "lock down grants" migrations), so admin-client callers (the widget) need
-- a SECURITY DEFINER RPC instead, same pattern as bump_streak().

create or replace function public.get_read_mode(p_user_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select read_mode from public.user_settings where user_id = p_user_id),
    'unknown_only'
  );
$$;

revoke all on function public.get_read_mode(uuid) from public;
grant execute on function public.get_read_mode(uuid) to service_role;
