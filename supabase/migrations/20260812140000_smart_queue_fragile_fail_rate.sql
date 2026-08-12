-- Smart queue: lifetime fail-rate ("fragile") signal.
--
-- Streak already captures the *current* run of passes/fails, but resets on
-- every pass — a term that's failed 6 times out of the last 10 looks
-- identical to one that's never been missed, the moment it's passed once.
-- review_fail_count / quiz_fail_count track lifetime fails per activity so
-- persistently difficult terms keep some priority even mid-streak.
--
-- Backfill: left at 0. This is a forward-looking signal, not a ledger — we
-- are not reconstructing historical fail counts from streak or anything
-- else. fragile therefore starts cold for every existing term and
-- accumulates only from events recorded after this migration.

alter table public.review_state
  add column review_fail_count int not null default 0 check (review_fail_count >= 0),
  add column quiz_fail_count int not null default 0 check (quiz_fail_count >= 0);

comment on column public.review_state.review_fail_count is
  'Lifetime count of review_fail events. Backfilled at 0 — accumulates going forward only, never reconstructed from history.';
comment on column public.review_state.quiz_fail_count is
  'Lifetime count of quiz_fail events. Backfilled at 0 — accumulates going forward only, never reconstructed from history.';

create or replace function public.record_review_event(
  p_user_id uuid,
  p_term_id uuid,
  p_event public.review_event
)
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

  insert into public.review_state (
    user_id, term_id, read_count, last_read_at,
    review_recall_count, last_review_recall_at, review_streak, pending_reveal,
    quiz_test_count, last_quiz_tested_at, quiz_streak,
    last_fail_at, last_fail_source,
    review_fail_count, quiz_fail_count
  )
  values (
    p_user_id,
    p_term_id,
    case when p_event = 'read' then 1 else 0 end,
    case when p_event = 'read' then now() else null end,
    case when p_event in ('review_pass', 'review_fail') then 1 else 0 end,
    case when p_event in ('review_pass', 'review_fail') then now() else null end,
    case
      when p_event = 'review_pass' then 1
      when p_event = 'review_fail' then -1
      else 0
    end,
    p_event = 'reveal',
    case when p_event in ('quiz_pass', 'quiz_fail') then 1 else 0 end,
    case when p_event in ('quiz_pass', 'quiz_fail') then now() else null end,
    case
      when p_event = 'quiz_pass' then 1
      when p_event = 'quiz_fail' then -1
      else 0
    end,
    case when p_event in ('review_fail', 'quiz_fail') then now() else null end,
    case
      when p_event = 'review_fail' then 'review'::public.review_fail_source
      when p_event = 'quiz_fail' then 'quiz'::public.review_fail_source
      else null
    end,
    case when p_event = 'review_fail' then 1 else 0 end,
    case when p_event = 'quiz_fail' then 1 else 0 end
  )
  on conflict (user_id, term_id) do update
  set
    read_count = public.review_state.read_count
      + case when p_event = 'read' then 1 else 0 end,
    last_read_at = case
      when p_event = 'read' then now()
      else public.review_state.last_read_at
    end,
    review_recall_count = public.review_state.review_recall_count
      + case when p_event in ('review_pass', 'review_fail') then 1 else 0 end,
    last_review_recall_at = case
      when p_event in ('review_pass', 'review_fail') then now()
      else public.review_state.last_review_recall_at
    end,
    review_streak = case
      when p_event = 'review_pass' then greatest(public.review_state.review_streak, 0) + 1
      when p_event = 'review_fail' then least(public.review_state.review_streak, 0) - 1
      else public.review_state.review_streak
    end,
    pending_reveal = case
      when p_event = 'reveal' then true
      when p_event in ('review_pass', 'review_fail') then false
      else public.review_state.pending_reveal
    end,
    quiz_test_count = public.review_state.quiz_test_count
      + case when p_event in ('quiz_pass', 'quiz_fail') then 1 else 0 end,
    last_quiz_tested_at = case
      when p_event in ('quiz_pass', 'quiz_fail') then now()
      else public.review_state.last_quiz_tested_at
    end,
    quiz_streak = case
      when p_event = 'quiz_pass' then greatest(public.review_state.quiz_streak, 0) + 1
      when p_event = 'quiz_fail' then least(public.review_state.quiz_streak, 0) - 1
      else public.review_state.quiz_streak
    end,
    last_fail_at = case
      when p_event in ('review_fail', 'quiz_fail') then now()
      when p_event in ('read', 'review_pass', 'quiz_pass') then null
      else public.review_state.last_fail_at
    end,
    last_fail_source = case
      when p_event = 'review_fail' then 'review'::public.review_fail_source
      when p_event = 'quiz_fail' then 'quiz'::public.review_fail_source
      when p_event in ('read', 'review_pass', 'quiz_pass') then null
      else public.review_state.last_fail_source
    end,
    review_fail_count = public.review_state.review_fail_count
      + case when p_event = 'review_fail' then 1 else 0 end,
    quiz_fail_count = public.review_state.quiz_fail_count
      + case when p_event = 'quiz_fail' then 1 else 0 end;
end;
$$;

-- Postgres disallows changing a function's return type via CREATE OR
-- REPLACE, so the two candidate RPCs (whose returns table gains two
-- columns) must be dropped first.
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
  quiz_fail_count int
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
    coalesce(rs.quiz_fail_count, 0)::int
  from public.terms t
  left join public.review_state rs
    on rs.term_id = t.id
   and rs.user_id = p_user_id
  where t.domain_id = any(v_domains)
    and (
      (p_status = 'known' and exists (
        select 1 from public.user_progress up
        where up.user_id = p_user_id and up.term_id = t.id
      ))
      or
      (p_status = 'unknown' and not exists (
        select 1 from public.user_progress up
        where up.user_id = p_user_id and up.term_id = t.id
      ))
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
  quiz_fail_count int
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
    c.quiz_fail_count
  from public.get_review_candidates(auth.uid(), p_domain_ids, p_status) as c;
end;
$$;

revoke all on function public.my_get_review_candidates(uuid[], text) from public;
grant execute on function public.my_get_review_candidates(uuid[], text) to authenticated;
