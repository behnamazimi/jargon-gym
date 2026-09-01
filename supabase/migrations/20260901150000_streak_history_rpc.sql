-- Read-only RPC backing the streak modal (web only). Groups review_events
-- by local calendar day, in the user's own saved timezone (same
-- coalesce(timezone, 'Europe/Amsterdam') fallback bump_streak() uses — see
-- 20260823120000_user_settings_streak.sql), for the last 7 days (today +
-- previous 6). Lazily called only when the modal opens.
--
-- "Active" (chip lit) = ANY review_event that local day, matching exactly
-- what bump_streak() counts as a qualifying day (all 6 event types,
-- including bare reveals). read/reviewed/quizzed counts below are a
-- stricter, independent threshold: reviewed only counts graded
-- review_pass/review_fail (no reveal), matching the Mastery page's
-- existing "today" semantics (lib/jargon/collection-stats.ts). These two
-- thresholds are intentionally different — a reveal-only day can render
-- as an active chip with a 0/0/0 breakdown underneath.

create or replace function public.get_streak_history(p_user_id uuid)
returns table (
  day date,
  is_active boolean,
  read_count integer,
  reviewed_count integer,
  quizzed_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with tz as (
    select coalesce(
      (select timezone from public.user_settings where user_id = p_user_id),
      'Europe/Amsterdam'
    ) as v_tz
  ),
  bounds as (
    select (now() at time zone tz.v_tz)::date as today, tz.v_tz
    from tz
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
  -- Wide, cheap pre-filter on created_at (avoids a per-row date cast in the
  -- where clause) — exact local-day bucketing happens below via v_tz, this
  -- just needs to be a superset of the 7-day local window for any
  -- timezone offset (max +/-14h).
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
    coalesce(aggregated.read_count, 0)::integer as read_count,
    coalesce(aggregated.reviewed_count, 0)::integer as reviewed_count,
    coalesce(aggregated.quizzed_count, 0)::integer as quizzed_count
  from days
  left join aggregated on aggregated.local_day = days.day
  order by days.day;
$$;

revoke all on function public.get_streak_history(uuid) from public;
grant execute on function public.get_streak_history(uuid) to service_role;

create or replace function public.my_get_streak_history()
returns table (
  day date,
  is_active boolean,
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
