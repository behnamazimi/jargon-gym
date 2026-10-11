-- The first study event can land before the browser's timezone is saved, which
-- put that day on the Europe/Amsterdam boundary. The web now passes the
-- browser's timezone along, used only while none is saved yet, and saved in
-- the same update the streak already makes.

drop function public.my_bump_streak();
drop function public.bump_streak(uuid);

create function public.bump_streak(p_user_id uuid, p_timezone text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saved_tz text;
  v_tz text;
  v_today date;
  v_last date;
  v_current int;
  v_longest int;
  v_found boolean;
  v_hint text;
begin
  select true, timezone, last_active_date, current_streak, longest_streak
    into v_found, v_saved_tz, v_last, v_current, v_longest
  from public.user_settings
  where user_id = p_user_id
  for update;

  if not v_found then
    insert into public.user_settings (user_id) values (p_user_id)
      on conflict (user_id) do nothing;
    v_last := null;
    v_current := 0;
    v_longest := 0;
  end if;

  -- Only trust a hint while nothing is saved, and only a name Postgres knows.
  if v_saved_tz is null and p_timezone is not null
     and exists (select 1 from pg_timezone_names where name = p_timezone) then
    v_hint := p_timezone;
  end if;

  v_tz := coalesce(v_saved_tz, v_hint, 'Europe/Amsterdam');
  v_today := (now() at time zone v_tz)::date;

  if v_last = v_today then
    if v_hint is not null then
      update public.user_settings set timezone = v_hint where user_id = p_user_id;
    end if;
    return;
  elsif v_last = v_today - 1 then
    v_current := v_current + 1;
  else
    v_current := 1;
  end if;

  v_longest := greatest(v_longest, v_current);

  update public.user_settings
  set current_streak = v_current,
      longest_streak = v_longest,
      last_active_date = v_today,
      timezone = coalesce(timezone, v_hint),
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.bump_streak(uuid, text) from public, anon, authenticated;
grant execute on function public.bump_streak(uuid, text) to service_role;

create function public.my_bump_streak(p_timezone text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.bump_streak(v_user_id, p_timezone);
end;
$$;

revoke all on function public.my_bump_streak(text) from public;
grant execute on function public.my_bump_streak(text) to authenticated;
