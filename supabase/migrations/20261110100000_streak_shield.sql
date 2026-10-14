-- Streak shield: once a streak has run 7 active days, one missed day does not
-- break it. One shield is banked at a time; using it starts a new 7-day count.
-- lib/streak/status.ts reads the same rules for display, keep them in step.

alter table public.user_settings
  add column shield_ready boolean not null default false,
  add column shield_progress int not null default 0
    check (shield_progress between 0 and 6),
  add column shield_saved_date date,
  add column shield_notice_pending boolean not null default false;

comment on column public.user_settings.shield_ready is
  'A streak shield is banked: a single missed local day will not reset the streak. Earned when shield_progress reaches 7, spent by bump_streak() on a one-day gap.';
comment on column public.user_settings.shield_progress is
  'Active days counted toward the next shield while none is banked (0..6). Reset when a shield is spent or the streak breaks.';
comment on column public.user_settings.shield_saved_date is
  'Local date of the missed day the last shield covered. Shown as a shielded day in the streak history.';
comment on column public.user_settings.shield_notice_pending is
  'A shield was spent and the member has not yet seen the message. Cleared by my_clear_shield_notice().';

-- Live streaks get what they have already earned.
update public.user_settings
set shield_ready = true
where current_streak >= 7
  and last_active_date >= current_date - 1;

update public.user_settings
set shield_progress = current_streak
where current_streak between 1 and 6
  and last_active_date >= current_date - 1;

drop function public.my_bump_streak(text);
drop function public.bump_streak(uuid, text);

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
  v_ready boolean;
  v_progress int;
  v_saved_date date;
  v_notice boolean;
  v_found boolean;
  v_hint text;
begin
  select true, timezone, last_active_date, current_streak, longest_streak,
         shield_ready, shield_progress, shield_saved_date, shield_notice_pending
    into v_found, v_saved_tz, v_last, v_current, v_longest,
         v_ready, v_progress, v_saved_date, v_notice
  from public.user_settings
  where user_id = p_user_id
  for update;

  if not v_found then
    insert into public.user_settings (user_id) values (p_user_id)
      on conflict (user_id) do nothing;
    v_last := null;
    v_current := 0;
    v_longest := 0;
    v_ready := false;
    v_progress := 0;
    v_saved_date := null;
    v_notice := false;
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
  elsif v_last = v_today - 2 and v_ready then
    v_current := v_current + 1;
    v_ready := false;
    v_progress := 0;
    v_saved_date := v_today - 1;
    v_notice := true;
  else
    v_current := 1;
    v_ready := false;
    v_progress := 0;
    v_notice := false;
  end if;

  if not v_ready then
    v_progress := v_progress + 1;
    if v_progress >= 7 then
      v_ready := true;
      v_progress := 0;
    end if;
  end if;

  v_longest := greatest(v_longest, v_current);

  update public.user_settings
  set current_streak = v_current,
      longest_streak = v_longest,
      last_active_date = v_today,
      shield_ready = v_ready,
      shield_progress = v_progress,
      shield_saved_date = v_saved_date,
      shield_notice_pending = v_notice,
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

create function public.my_clear_shield_notice()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.user_settings
  set shield_notice_pending = false
  where user_id = auth.uid() and shield_notice_pending;
end;
$$;

revoke all on function public.my_clear_shield_notice() from public;
grant execute on function public.my_clear_shield_notice() to authenticated;

-- The history gains is_shielded: the day a shield covered, or the day it is
-- about to cover (last activity two days ago with a shield banked).
drop function public.my_get_streak_history();
drop function public.get_streak_history(uuid);

create function public.get_streak_history(p_user_id uuid)
returns table (
  day date,
  is_active boolean,
  is_shielded boolean,
  read_count integer,
  reviewed_count integer,
  quizzed_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with settings as (
    select
      coalesce(timezone, 'Europe/Amsterdam') as v_tz,
      last_active_date,
      shield_ready,
      shield_saved_date
    from (select 1) one
    left join public.user_settings us on us.user_id = p_user_id
  ),
  bounds as (
    select (now() at time zone s.v_tz)::date as today, s.v_tz,
           s.shield_saved_date,
           (s.shield_ready and s.last_active_date = (now() at time zone s.v_tz)::date - 2)
             as shield_pending
    from settings s
  ),
  days as (
    select gs::date as day
    from bounds,
      generate_series(
        (bounds.today - 6)::timestamp,
        bounds.today::timestamp,
        interval '1 day'
      ) as gs
  ),
  scoped_events as (
    select
      (re.created_at at time zone bounds.v_tz)::date as local_day,
      re.term_id,
      re.event
    from public.review_events re, bounds
    where re.user_id = p_user_id
      and re.created_at >= now() - interval '9 days'
  ),
  aggregated as (
    select
      local_day,
      count(distinct term_id) filter (where event = 'read') as read_count,
      count(distinct term_id)
        filter (where event in ('review_pass', 'review_fail')) as reviewed_count,
      count(distinct term_id)
        filter (where event in ('quiz_pass', 'quiz_fail')) as quizzed_count
    from scoped_events
    group by local_day
  )
  select
    days.day,
    (aggregated.local_day is not null) as is_active,
    coalesce(
      aggregated.local_day is null
        and (days.day = bounds.shield_saved_date
             or (bounds.shield_pending and days.day = bounds.today - 1)),
      false
    ) as is_shielded,
    coalesce(aggregated.read_count, 0)::integer as read_count,
    coalesce(aggregated.reviewed_count, 0)::integer as reviewed_count,
    coalesce(aggregated.quizzed_count, 0)::integer as quizzed_count
  from days
  cross join bounds
  left join aggregated on aggregated.local_day = days.day
  order by days.day;
$$;

revoke all on function public.get_streak_history(uuid) from public;
grant execute on function public.get_streak_history(uuid) to service_role;

create function public.my_get_streak_history()
returns table (
  day date,
  is_active boolean,
  is_shielded boolean,
  read_count integer,
  reviewed_count integer,
  quizzed_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query select * from public.get_streak_history(auth.uid());
end;
$$;

revoke all on function public.my_get_streak_history() from public;
grant execute on function public.my_get_streak_history() to authenticated;

-- The admin person page shows the shield next to the streak.
drop function public.admin_person_detail(uuid);

create function public.admin_person_detail(p_user_id uuid)
returns table (
  suspended_at timestamptz,
  referral_verified boolean,
  ban_mismatch boolean,
  current_streak integer,
  longest_streak integer,
  last_active_date date,
  shield_ready boolean,
  shield_progress integer,
  owned_collections integer,
  people_using_collections integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can view accounts';
  end if;

  return query
  select
    u.suspended_at,
    u.referral_verified,
    (u.suspended_at is not null) <> coalesce(au.banned_until > now(), false),
    coalesce(s.current_streak, 0),
    coalesce(s.longest_streak, 0),
    s.last_active_date,
    coalesce(s.shield_ready, false),
    coalesce(s.shield_progress, 0),
    (select count(*)::integer from public.collections d where d.owner_id = u.id),
    public._admin_people_using_collections(u.id)
  from public.users u
  join auth.users au on au.id = u.id
  left join public.user_settings s on s.user_id = u.id
  where u.id = p_user_id;
end;
$$;

revoke all on function public.admin_person_detail(uuid) from public, anon;
grant execute on function public.admin_person_detail(uuid) to authenticated;
