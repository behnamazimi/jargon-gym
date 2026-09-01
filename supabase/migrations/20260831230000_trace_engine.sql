-- TRACE engine: replace the known/unknown pool + streak/fail-count scoring
-- with three live-decay traces (Familiarity from Read, FSRS-5 recall from
-- Review, Bayesian recognition from Quiz). Mastery is computed in TS from
-- these columns and never stored — Postgres never runs the FSRS/Bayesian
-- math, it only persists the state lib/trace hands it.
-- @see docs/trace-smart-queue.md

-- ---------------------------------------------------------------------------
-- 1. review_state: add TRACE columns, deprecate the old scoring signals.
-- ---------------------------------------------------------------------------

alter table public.review_state
  add column recall_stability double precision,
  add column recall_difficulty double precision,
  add column quiz_knowledge_posterior double precision,
  add column ever_mastered_at timestamptz;

comment on column public.review_state.recall_stability is
  'FSRS-5 S_r — null until the first Review grade (nullable state, no cold-start default from term creation).';
comment on column public.review_state.recall_difficulty is
  'FSRS-5 D_r — null until the first Review grade.';
comment on column public.review_state.quiz_knowledge_posterior is
  'Bayesian P(knows) — null until the first Quiz answer. 0.5 is only ever the starting prior at that first answer, never a stored default.';
comment on column public.review_state.ever_mastered_at is
  'High-water mark: set once, the first time Mastery_adjusted crosses the known threshold. Never cleared, even as mastery later decays — backs the "terms learned" count (doc §8), which is otherwise impossible to recompute live by definition.';

comment on column public.review_state.review_streak is
  'Deprecated — superseded by recall_stability/recall_difficulty. Kept, not backfilled, not read by the TRACE engine.';
comment on column public.review_state.quiz_streak is
  'Deprecated — superseded by quiz_knowledge_posterior. Kept, not backfilled, not read by the TRACE engine.';
comment on column public.review_state.last_fail_at is
  'Deprecated — TRACE has no cross-activity fail propagation. Kept, not backfilled, not read by the TRACE engine.';
comment on column public.review_state.last_fail_source is
  'Deprecated — see last_fail_at.';
comment on column public.review_state.review_fail_count is
  'Deprecated — superseded by recall_stability (lapses already lower it). Kept, not backfilled, not read by the TRACE engine.';
comment on column public.review_state.quiz_fail_count is
  'Deprecated — superseded by quiz_knowledge_posterior (failures already lower it). Kept, not backfilled, not read by the TRACE engine.';

-- ---------------------------------------------------------------------------
-- 2. record_review_event / my_record_review_event: accept TRACE state,
--    stop writing the deprecated columns.
--
--    New parameters change the signature, so `create or replace` would
--    otherwise create a second overload alongside the old 2/3-arg one
--    instead of replacing it — drop the old signatures explicitly first.
-- ---------------------------------------------------------------------------

drop function if exists public.record_review_event(uuid, uuid, public.review_event);
drop function if exists public.my_record_review_event(uuid, public.review_event);

create or replace function public.record_review_event(
  p_user_id uuid,
  p_term_id uuid,
  p_event public.review_event,
  p_recall_stability double precision default null,
  p_recall_difficulty double precision default null,
  p_quiz_knowledge_posterior double precision default null,
  p_crossed_known_threshold boolean default false
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

  if p_event in ('review_pass', 'review_fail')
     and (p_recall_stability is null or p_recall_difficulty is null) then
    raise exception 'review_pass/review_fail requires recall_stability and recall_difficulty';
  end if;

  if p_event in ('quiz_pass', 'quiz_fail') and p_quiz_knowledge_posterior is null then
    raise exception 'quiz_pass/quiz_fail requires quiz_knowledge_posterior';
  end if;

  insert into public.review_state (
    user_id, term_id, read_count, last_read_at,
    review_recall_count, last_review_recall_at, pending_reveal,
    quiz_test_count, last_quiz_tested_at,
    recall_stability, recall_difficulty, quiz_knowledge_posterior,
    ever_mastered_at
  )
  values (
    p_user_id,
    p_term_id,
    case when p_event = 'read' then 1 else 0 end,
    case when p_event = 'read' then now() else null end,
    case when p_event in ('review_pass', 'review_fail') then 1 else 0 end,
    case when p_event in ('review_pass', 'review_fail') then now() else null end,
    p_event = 'reveal',
    case when p_event in ('quiz_pass', 'quiz_fail') then 1 else 0 end,
    case when p_event in ('quiz_pass', 'quiz_fail') then now() else null end,
    p_recall_stability,
    p_recall_difficulty,
    p_quiz_knowledge_posterior,
    case when p_crossed_known_threshold then now() else null end
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
    recall_stability = coalesce(p_recall_stability, public.review_state.recall_stability),
    recall_difficulty = coalesce(p_recall_difficulty, public.review_state.recall_difficulty),
    quiz_knowledge_posterior = coalesce(
      p_quiz_knowledge_posterior, public.review_state.quiz_knowledge_posterior
    ),
    -- High-water mark: set once, never cleared or overwritten once set.
    ever_mastered_at = case
      when public.review_state.ever_mastered_at is not null
        then public.review_state.ever_mastered_at
      when p_crossed_known_threshold then now()
      else public.review_state.ever_mastered_at
    end;
end;
$$;

create or replace function public.my_record_review_event(
  p_term_id uuid,
  p_event public.review_event,
  p_recall_stability double precision default null,
  p_recall_difficulty double precision default null,
  p_quiz_knowledge_posterior double precision default null,
  p_crossed_known_threshold boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.record_review_event(
    auth.uid(), p_term_id, p_event,
    p_recall_stability, p_recall_difficulty, p_quiz_knowledge_posterior,
    p_crossed_known_threshold
  );
end;
$$;

revoke all on function public.my_record_review_event(
  uuid, public.review_event, double precision, double precision, double precision, boolean
) from public;
grant execute on function public.my_record_review_event(
  uuid, public.review_event, double precision, double precision, double precision, boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. get_trace_candidates / my_get_trace_candidates replace
--    get_review_candidates / my_get_review_candidates: one pool, no
--    p_status filter, no user_progress join.
-- ---------------------------------------------------------------------------

drop function if exists public.my_get_review_candidates(uuid[], text);
drop function if exists public.get_review_candidates(uuid, uuid[], text);

create function public.get_trace_candidates(
  p_user_id uuid,
  p_domain_ids uuid[] default null
)
returns table (
  term_id uuid,
  domain_id uuid,
  created_at timestamptz,
  read_count int,
  last_read_at timestamptz,
  recall_stability double precision,
  recall_difficulty double precision,
  review_recall_count int,
  last_review_recall_at timestamptz,
  quiz_knowledge_posterior double precision,
  quiz_test_count int,
  last_quiz_tested_at timestamptz,
  ever_mastered_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_domains uuid[];
begin
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
    rs.recall_stability,
    rs.recall_difficulty,
    coalesce(rs.review_recall_count, 0)::int,
    rs.last_review_recall_at,
    rs.quiz_knowledge_posterior,
    coalesce(rs.quiz_test_count, 0)::int,
    rs.last_quiz_tested_at,
    rs.ever_mastered_at
  from public.terms t
  left join public.review_state rs
    on rs.term_id = t.id
   and rs.user_id = p_user_id
  where t.domain_id = any(v_domains);
end;
$$;

revoke all on function public.get_trace_candidates(uuid, uuid[]) from public;
grant execute on function public.get_trace_candidates(uuid, uuid[]) to service_role;

create function public.my_get_trace_candidates(
  p_domain_ids uuid[] default null
)
returns table (
  term_id uuid,
  domain_id uuid,
  created_at timestamptz,
  read_count int,
  last_read_at timestamptz,
  recall_stability double precision,
  recall_difficulty double precision,
  review_recall_count int,
  last_review_recall_at timestamptz,
  quiz_knowledge_posterior double precision,
  quiz_test_count int,
  last_quiz_tested_at timestamptz,
  ever_mastered_at timestamptz
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

  return query select c.* from public.get_trace_candidates(auth.uid(), p_domain_ids) as c;
end;
$$;

revoke all on function public.my_get_trace_candidates(uuid[]) from public;
grant execute on function public.my_get_trace_candidates(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 3b. get_trace_state_for_term / my_get_trace_state_for_term: one term's
--     current state, read before applying a Review grade or Quiz answer —
--     the FSRS-5/Bayesian math needs the prior S/D/posterior in TS, unlike
--     the old streak counters which could be updated in-place by SQL alone.
-- ---------------------------------------------------------------------------

create function public.get_trace_state_for_term(p_user_id uuid, p_term_id uuid)
returns table (
  read_count int,
  last_read_at timestamptz,
  recall_stability double precision,
  recall_difficulty double precision,
  review_recall_count int,
  last_review_recall_at timestamptz,
  quiz_knowledge_posterior double precision,
  quiz_test_count int,
  last_quiz_tested_at timestamptz
)
language plpgsql
stable
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

  return query
  select
    coalesce(rs.read_count, 0)::int,
    rs.last_read_at,
    rs.recall_stability,
    rs.recall_difficulty,
    coalesce(rs.review_recall_count, 0)::int,
    rs.last_review_recall_at,
    rs.quiz_knowledge_posterior,
    coalesce(rs.quiz_test_count, 0)::int,
    rs.last_quiz_tested_at
  from public.review_state rs
  where rs.user_id = p_user_id and rs.term_id = p_term_id
  union all
  select 0, null, null, null, 0, null, null, 0, null
  where not exists (
    select 1 from public.review_state rs where rs.user_id = p_user_id and rs.term_id = p_term_id
  );
end;
$$;

revoke all on function public.get_trace_state_for_term(uuid, uuid) from public;
grant execute on function public.get_trace_state_for_term(uuid, uuid) to service_role;

create function public.my_get_trace_state_for_term(p_term_id uuid)
returns table (
  read_count int,
  last_read_at timestamptz,
  recall_stability double precision,
  recall_difficulty double precision,
  review_recall_count int,
  last_review_recall_at timestamptz,
  quiz_knowledge_posterior double precision,
  quiz_test_count int,
  last_quiz_tested_at timestamptz
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

  return query select c.* from public.get_trace_state_for_term(auth.uid(), p_term_id) as c;
end;
$$;

revoke all on function public.my_get_trace_state_for_term(uuid) from public;
grant execute on function public.my_get_trace_state_for_term(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. progress_state_by_domain / my_progress_state_by_domain: TRACE columns
--    instead of known_at.
-- ---------------------------------------------------------------------------

drop function if exists public.my_progress_state_by_domain(uuid[]);
drop function if exists public.progress_state_by_domain(uuid, uuid[]);

create function public.progress_state_by_domain(p_user_id uuid, p_domain_ids uuid[])
returns table (
  term_id uuid,
  domain_id uuid,
  read_count int,
  last_read_at timestamptz,
  recall_stability double precision,
  recall_difficulty double precision,
  review_recall_count int,
  last_review_recall_at timestamptz,
  quiz_knowledge_posterior double precision,
  quiz_test_count int,
  last_quiz_tested_at timestamptz,
  ever_mastered_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.domain_id,
    coalesce(rs.read_count, 0)::int,
    rs.last_read_at,
    rs.recall_stability,
    rs.recall_difficulty,
    coalesce(rs.review_recall_count, 0)::int,
    rs.last_review_recall_at,
    rs.quiz_knowledge_posterior,
    coalesce(rs.quiz_test_count, 0)::int,
    rs.last_quiz_tested_at,
    rs.ever_mastered_at
  from public.terms t
  left join public.review_state rs on rs.term_id = t.id and rs.user_id = p_user_id
  where t.domain_id = any(p_domain_ids);
$$;

revoke all on function public.progress_state_by_domain(uuid, uuid[]) from public;
grant execute on function public.progress_state_by_domain(uuid, uuid[]) to service_role;

create function public.my_progress_state_by_domain(p_domain_ids uuid[])
returns table (
  term_id uuid,
  domain_id uuid,
  read_count int,
  last_read_at timestamptz,
  recall_stability double precision,
  recall_difficulty double precision,
  review_recall_count int,
  last_review_recall_at timestamptz,
  quiz_knowledge_posterior double precision,
  quiz_test_count int,
  last_quiz_tested_at timestamptz,
  ever_mastered_at timestamptz
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

  return query select c.* from public.progress_state_by_domain(auth.uid(), p_domain_ids) as c;
end;
$$;

revoke all on function public.my_progress_state_by_domain(uuid[]) from public;
grant execute on function public.my_progress_state_by_domain(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Drop the manual known-toggle RPCs and user_progress entirely. Known/
--    unknown is now a read-only label derived live from Mastery_adjusted —
--    there is nothing left for a manual toggle to set.
-- ---------------------------------------------------------------------------

drop function if exists public.mark_term_known(uuid, uuid);
drop function if exists public.my_mark_term_known(uuid);
drop function if exists public.clear_term_known(uuid, uuid);
drop function if exists public.my_clear_term_known(uuid);

-- reset_domain_progress deleted from user_progress inline — rewrite before
-- the table it references disappears out from under it.
create or replace function public.reset_domain_progress(p_user_id uuid, p_domain_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term_ids uuid[];
begin
  if not exists (
    select 1 from public.domains d
    where d.id = p_domain_id and d.owner_id = p_user_id
  ) and not exists (
    select 1 from public.user_collection_domains ucd
    where ucd.domain_id = p_domain_id and ucd.user_id = p_user_id
  ) then
    raise exception 'Domain not in user collection';
  end if;

  select coalesce(array_agg(t.id), '{}'::uuid[])
  into v_term_ids
  from public.terms t
  where t.domain_id = p_domain_id;

  if cardinality(v_term_ids) = 0 then
    return;
  end if;

  delete from public.review_state
  where user_id = p_user_id
    and term_id = any(v_term_ids);
end;
$$;

drop table public.user_progress;

-- ---------------------------------------------------------------------------
-- 6. read_mode removal: Read is a single ranked pool now, so the
--    "fall back to known terms once the unknown pool is empty" toggle has
--    nothing left to control.
-- ---------------------------------------------------------------------------

drop function if exists public.get_read_mode(uuid);

alter table public.user_settings drop column read_mode;
