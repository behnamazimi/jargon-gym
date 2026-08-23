-- Daily streak tracker.
--
-- Any review_event (read, reveal, review_pass/fail, quiz_pass/fail), from
-- web or Telegram, counts as a qualifying activity for "today" in the
-- user's own local timezone. Miss a full local day with zero qualifying
-- activity and the streak hard-resets to 0.

alter table public.user_settings
  add column timezone text,
  add column current_streak int not null default 0,
  add column longest_streak int not null default 0,
  add column last_active_date date;

comment on column public.user_settings.timezone is
  'IANA tz, client-detected via Intl.DateTimeFormat and silently saved on login. Null for Telegram-only users, or before first web login — bump_streak() falls back to the ''Europe/Amsterdam'' literal, which mirrors RANKING.timezone in lib/smart-queue/weights.ts (no shared TS/SQL constant exists in this repo; keep the two in sync by hand).';
comment on column public.user_settings.current_streak is
  'Consecutive local days (per timezone, or the fallback) with >=1 qualifying review_event. Reset to 0 on a missed day. Maintained by bump_streak()/my_bump_streak().';
comment on column public.user_settings.longest_streak is
  'High-water mark of current_streak. Stored for future use; no UI surfaces it yet.';
comment on column public.user_settings.last_active_date is
  'Local calendar date (per user timezone) of the most recent qualifying event — used to detect same-day / consecutive-day / gap transitions.';

-- bump_streak: called once per qualifying review_event, right after the
-- event itself is written by record_review_event/my_record_review_event.
-- Kept as a separate RPC (rather than folded into record_review_event) so
-- that already-complex, migration-scarred function stays untouched.
create or replace function public.bump_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_today date;
  v_last date;
  v_current int;
  v_longest int;
  v_found boolean;
begin
  select true, coalesce(timezone, 'Europe/Amsterdam'), last_active_date, current_streak, longest_streak
    into v_found, v_tz, v_last, v_current, v_longest
  from public.user_settings
  where user_id = p_user_id
  for update;

  if not v_found then
    -- No settings row yet (user never touched LLM settings or logged in via
    -- web) — lazily create one, same pattern the LLM-settings upsert relies
    -- on elsewhere.
    insert into public.user_settings (user_id) values (p_user_id)
      on conflict (user_id) do nothing;
    v_tz := 'Europe/Amsterdam';
    v_last := null;
    v_current := 0;
    v_longest := 0;
  end if;

  v_today := (now() at time zone v_tz)::date;

  if v_last = v_today then
    return; -- already counted today, no-op
  elsif v_last = v_today - 1 then
    v_current := v_current + 1; -- consecutive day
  else
    v_current := 1; -- null last_active_date, or a gap of >=2 days
  end if;

  v_longest := greatest(v_longest, v_current);

  update public.user_settings
  set current_streak = v_current,
      longest_streak = v_longest,
      last_active_date = v_today,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.bump_streak(uuid) from public;
grant execute on function public.bump_streak(uuid) to service_role;

create or replace function public.my_bump_streak()
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

  perform public.bump_streak(v_user_id);
end;
$$;

revoke all on function public.my_bump_streak() from public;
grant execute on function public.my_bump_streak() to authenticated;
