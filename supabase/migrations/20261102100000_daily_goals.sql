-- Daily goals: a per-tier target of distinct terms a local day (read,
-- graded in Review, answered in Quiz), the celebration switch, and which
-- tiers were already celebrated today so the overlay shows once per tier
-- per day across devices. See docs/goals.md.

alter table public.user_settings
  add column daily_goals jsonb,
  add column goal_celebrate boolean not null default true,
  add column goal_celebrated jsonb not null default '{}'::jsonb;

comment on column public.user_settings.daily_goals is
  'Daily goals as {"read": n|null, "review": n|null, "quiz": n|null}; null for a tier means off. The column is null until the user saves goals once.';
comment on column public.user_settings.goal_celebrate is
  'Show the celebration overlay when a daily goal is met. On by default.';
comment on column public.user_settings.goal_celebrated is
  'Tiers already celebrated on one local day, as {"date": "YYYY-MM-DD", "tiers": [...]}. A different date means none yet today.';

-- Distinct terms per tier on the user's local today, with the same day
-- boundary and event filters as get_streak_history.
create or replace function public.goal_day_counts(p_user_id uuid)
returns table (
  today date,
  read_count integer,
  reviewed_count integer,
  quizzed_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select
      coalesce(
        (select timezone from public.user_settings where user_id = p_user_id),
        'Europe/Amsterdam'
      ) as v_tz
  ),
  day as (
    select (now() at time zone bounds.v_tz)::date as today, bounds.v_tz from bounds
  ),
  scoped as (
    select re.term_id, re.event
    from public.review_events re, day
    where re.user_id = p_user_id
      and re.created_at >= now() - interval '2 days'
      and (re.created_at at time zone day.v_tz)::date = day.today
  )
  select
    (select today from day),
    (count(distinct term_id) filter (where event = 'read'))::integer,
    (count(distinct term_id) filter (where event in ('review_pass', 'review_fail')))::integer,
    (count(distinct term_id) filter (where event in ('quiz_pass', 'quiz_fail')))::integer
  from scoped;
$$;

revoke all on function public.goal_day_counts(uuid) from public;
grant execute on function public.goal_day_counts(uuid) to service_role;

create or replace function public.my_get_goal_day()
returns table (
  today date,
  read_count integer,
  reviewed_count integer,
  quizzed_count integer,
  celebrated text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_celebrated jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select goal_celebrated into v_celebrated
  from public.user_settings where user_id = auth.uid();

  return query
  select
    c.today,
    c.read_count,
    c.reviewed_count,
    c.quizzed_count,
    case
      when v_celebrated ->> 'date' = c.today::text then
        array(select jsonb_array_elements_text(coalesce(v_celebrated -> 'tiers', '[]'::jsonb)))
      else '{}'::text[]
    end
  from public.goal_day_counts(auth.uid()) c;
end;
$$;

revoke all on function public.my_get_goal_day() from public;
grant execute on function public.my_get_goal_day() to authenticated;

-- Records a tier as celebrated today and returns true, but only when its goal
-- is met (or the tier ran out of terms), it wasn't celebrated yet today, and
-- celebrations are on. The row lock makes two tabs or devices race safely.
create or replace function public.my_claim_goal_celebration(p_tier text, p_caught_up boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_settings public.user_settings%rowtype;
  v_counts record;
  v_goal integer;
  v_done integer;
  v_tiers jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_tier not in ('read', 'review', 'quiz') then
    raise exception 'Unknown goal tier %', p_tier;
  end if;

  select * into v_settings
  from public.user_settings where user_id = auth.uid()
  for update;

  if not found or not v_settings.goal_celebrate or v_settings.daily_goals is null then
    return false;
  end if;

  v_goal := (v_settings.daily_goals ->> p_tier)::integer;
  if v_goal is null or v_goal <= 0 then
    return false;
  end if;

  select * into v_counts from public.goal_day_counts(auth.uid());

  v_tiers := case
    when v_settings.goal_celebrated ->> 'date' = v_counts.today::text then
      coalesce(v_settings.goal_celebrated -> 'tiers', '[]'::jsonb)
    else '[]'::jsonb
  end;
  if v_tiers ? p_tier then
    return false;
  end if;

  v_done := case p_tier
    when 'read' then v_counts.read_count
    when 'review' then v_counts.reviewed_count
    else v_counts.quizzed_count
  end;
  if v_done < v_goal and not p_caught_up then
    return false;
  end if;

  update public.user_settings
  set goal_celebrated = jsonb_build_object(
        'date', v_counts.today::text,
        'tiers', v_tiers || to_jsonb(p_tier)
      ),
      updated_at = now()
  where user_id = auth.uid();

  return true;
end;
$$;

revoke all on function public.my_claim_goal_celebration(text, boolean) from public;
grant execute on function public.my_claim_goal_celebration(text, boolean) to authenticated;

-- Share of quiz answers that were right, for the goal forecast.
create or replace function public.my_quiz_answer_counts()
returns table (
  passed integer,
  total integer
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

  return query
  select
    (count(*) filter (where re.event = 'quiz_pass'))::integer,
    count(*)::integer
  from public.review_events re
  where re.user_id = auth.uid()
    and re.event in ('quiz_pass', 'quiz_fail');
end;
$$;

revoke all on function public.my_quiz_answer_counts() from public;
grant execute on function public.my_quiz_answer_counts() to authenticated;
