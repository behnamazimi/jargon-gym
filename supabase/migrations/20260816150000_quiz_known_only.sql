-- Quiz known-only + hard-tier queue: user_progress.known_at, candidate RPCs
-- project it through, and drop the Settings-driven quiz mark-known/
-- mark-unknown prefs (Quiz outcomes are now hard-coded).
-- @see docs/handoff-quiz-known-only.md

-- ---------------------------------------------------------------------------
-- 1. user_progress.known_at
-- ---------------------------------------------------------------------------

alter table public.user_progress add column known_at timestamptz;

-- Backfill: last Review pass timestamp when known (a positive streak means
-- the most recent Review test was a pass), else now().
update public.user_progress up
set known_at = coalesce(
  (
    select rs.last_review_recall_at
    from public.review_state rs
    where rs.user_id = up.user_id
      and rs.term_id = up.term_id
      and rs.review_streak > 0
  ),
  now()
)
where known_at is null;

alter table public.user_progress alter column known_at set default now();
alter table public.user_progress alter column known_at set not null;

-- ---------------------------------------------------------------------------
-- 2. mark_term_known sets known_at on insert (unchanged on conflict, so
--    re-marking an already-known term doesn't reset it).
-- ---------------------------------------------------------------------------

create or replace function public.mark_term_known(p_user_id uuid, p_term_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.terms t
    where t.id = p_term_id
      and t.domain_id in (select public.review_domain_ids(p_user_id))
  ) then
    raise exception 'Term not in review pool';
  end if;

  insert into public.user_progress (user_id, term_id, known_at)
  values (p_user_id, p_term_id, now())
  on conflict (user_id, term_id) do nothing;

  update public.telegram_links
  set all_caught_up_at = null, updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.mark_term_known(uuid, uuid) from public;
grant execute on function public.mark_term_known(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Candidate RPCs: project known_at through (return type changes, so drop
--    + recreate rather than create-or-replace).
-- ---------------------------------------------------------------------------

drop function if exists public.my_get_review_candidates(uuid[], text);
drop function if exists public.get_review_candidates(uuid, uuid[], text);

create function public.get_review_candidates(
  p_user_id uuid,
  p_domain_ids uuid[] default null,
  p_status text default 'unknown'
)
returns table (
  term_id uuid,
  domain_id uuid,
  created_at timestamptz,
  read_count int,
  last_read_at timestamptz,
  review_recall_count int,
  last_review_recall_at timestamptz,
  review_streak int,
  quiz_test_count int,
  last_quiz_tested_at timestamptz,
  quiz_streak int,
  pending_reveal boolean,
  last_fail_at timestamptz,
  last_fail_source public.review_fail_source,
  review_fail_count int,
  quiz_fail_count int,
  known_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_domains uuid[];
begin
  if p_status not in ('known', 'unknown') then
    raise exception 'Invalid status: %', p_status;
  end if;

  select coalesce(array_agg(rid.review_domain_id), '{}'::uuid[])
  into v_domains
  from public.review_domain_ids(p_user_id) as rid(review_domain_id)
  where p_domain_ids is null
     or cardinality(p_domain_ids) = 0
     or rid.review_domain_id = any(p_domain_ids);

  if cardinality(v_domains) = 0 then
    return;
  end if;

  return query
  select
    t.id,
    t.domain_id,
    t.created_at,
    coalesce(rs.read_count, 0)::int,
    rs.last_read_at,
    coalesce(rs.review_recall_count, 0)::int,
    rs.last_review_recall_at,
    coalesce(rs.review_streak, 0)::int,
    coalesce(rs.quiz_test_count, 0)::int,
    rs.last_quiz_tested_at,
    coalesce(rs.quiz_streak, 0)::int,
    coalesce(rs.pending_reveal, false),
    rs.last_fail_at,
    rs.last_fail_source,
    coalesce(rs.review_fail_count, 0)::int,
    coalesce(rs.quiz_fail_count, 0)::int,
    up.known_at
  from public.terms t
  left join public.review_state rs
    on rs.term_id = t.id
   and rs.user_id = p_user_id
  left join public.user_progress up
    on up.term_id = t.id
   and up.user_id = p_user_id
  where t.domain_id = any(v_domains)
    and (
      (p_status = 'known' and up.term_id is not null)
      or
      (p_status = 'unknown' and up.term_id is null)
    );
end;
$$;

revoke all on function public.get_review_candidates(uuid, uuid[], text) from public;
grant execute on function public.get_review_candidates(uuid, uuid[], text) to service_role;

create function public.my_get_review_candidates(
  p_domain_ids uuid[] default null,
  p_status text default 'unknown'
)
returns table (
  term_id uuid,
  domain_id uuid,
  created_at timestamptz,
  read_count int,
  last_read_at timestamptz,
  review_recall_count int,
  last_review_recall_at timestamptz,
  review_streak int,
  quiz_test_count int,
  last_quiz_tested_at timestamptz,
  quiz_streak int,
  pending_reveal boolean,
  last_fail_at timestamptz,
  last_fail_source public.review_fail_source,
  review_fail_count int,
  quiz_fail_count int,
  known_at timestamptz
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
    c.term_id,
    c.domain_id,
    c.created_at,
    c.read_count,
    c.last_read_at,
    c.review_recall_count,
    c.last_review_recall_at,
    c.review_streak,
    c.quiz_test_count,
    c.last_quiz_tested_at,
    c.quiz_streak,
    c.pending_reveal,
    c.last_fail_at,
    c.last_fail_source,
    c.review_fail_count,
    c.quiz_fail_count,
    c.known_at
  from public.get_review_candidates(auth.uid(), p_domain_ids, p_status) as c;
end;
$$;

revoke all on function public.my_get_review_candidates(uuid[], text) from public;
grant execute on function public.my_get_review_candidates(uuid[], text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Drop Settings-driven quiz mark-known/mark-unknown prefs — Quiz outcomes
--    are now hard-coded (fail always demotes, pass never promotes).
-- ---------------------------------------------------------------------------

alter table public.user_settings
  drop column mark_unknown_on_fail,
  drop column mark_known_on_pass;
