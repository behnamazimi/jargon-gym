-- Page promos: a banner that points at a page the user hasn't visited yet.
-- promo_seen holds visit keys ('visit:quiz'); promo_dismissed maps a promo id
-- to the time it was dismissed, so a banner can snooze and come back.
alter table public.user_settings
  add column promo_seen text[] not null default '{}',
  add column promo_dismissed jsonb not null default '{}';

-- Everyone with an account today already knows their way around. Quiz and
-- Stories can be told from real history; the other pages leave none, so they
-- count as visited for existing accounts.
update public.user_settings us
set promo_seen = array_remove(array[
  'visit:mastery',
  'visit:browse',
  'visit:triage',
  case when exists (
    select 1 from public.review_events e
    where e.user_id = us.user_id and e.event in ('quiz_pass', 'quiz_fail')
  ) then 'visit:quiz' end,
  case when exists (
    select 1 from public.stories s where s.user_id = us.user_id
  ) then 'visit:stories' end
], null);

-- Records visited pages in a single statement, so two tabs can't overwrite
-- each other's keys.
create function public.my_mark_promos_seen(p_keys text[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.user_settings (user_id, promo_seen)
  values (auth.uid(), p_keys)
  on conflict (user_id) do update
    set promo_seen = (
          select coalesce(array_agg(distinct k), '{}')
          from unnest(user_settings.promo_seen || p_keys) as k
        ),
        updated_at = now();
end;
$$;

grant execute on function public.my_mark_promos_seen(text[]) to authenticated;

create function public.my_dismiss_promo(p_id text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.user_settings (user_id, promo_dismissed)
  values (auth.uid(), jsonb_build_object(p_id, now()))
  on conflict (user_id) do update
    set promo_dismissed = user_settings.promo_dismissed || jsonb_build_object(p_id, now()),
        updated_at = now();
end;
$$;

grant execute on function public.my_dismiss_promo(text) to authenticated;

-- How much the user has reviewed and read, counted only up to p_cap so the
-- cost depends on the thresholds, not on how long they've been studying.
create function public.my_promo_usage(p_cap int)
returns table (reviews int, reads int)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    (select count(*)::int from (
      select 1 from public.review_events e
      where e.user_id = auth.uid() and e.event in ('review_pass', 'review_fail')
      limit p_cap
    ) r),
    (select count(*)::int from (
      select 1 from public.review_events e
      where e.user_id = auth.uid() and e.event = 'read'
      limit p_cap
    ) d);
end;
$$;

revoke all on function public.my_promo_usage(int) from public;
grant execute on function public.my_promo_usage(int) to authenticated;
