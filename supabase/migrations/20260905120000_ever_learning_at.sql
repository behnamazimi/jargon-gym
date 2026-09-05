-- Add a second high-water-mark timestamp for the "learning" threshold
-- (Mastery_adjusted >= UNKNOWN_THRESHOLD, lib/trace/constants.ts), mirroring
-- ever_mastered_at exactly. Powers the Mastery page's per-collection pace
-- insight (lib/trace/pace.ts, lib/jargon/collection-stats.ts).
-- @see docs/trace.md

-- ---------------------------------------------------------------------------
-- 1. review_state: add ever_learning_at, sibling to ever_mastered_at.
-- ---------------------------------------------------------------------------

alter table public.review_state
  add column ever_learning_at timestamptz;

comment on column public.review_state.ever_learning_at is
  'High-water mark: set once, the first time Mastery_adjusted crosses the learning threshold (UNKNOWN_THRESHOLD, 0.6). Never cleared, even as mastery later decays back down. Sibling of ever_mastered_at (known threshold, 0.8) — identical mechanism, lower bar. Backs the Mastery page''s per-collection pace insight.';

-- ---------------------------------------------------------------------------
-- 2. record_review_event / my_record_review_event: accept
--    p_crossed_learning_threshold, stamp ever_learning_at the same way
--    ever_mastered_at is stamped.
--
--    New parameter changes the signature, so `create or replace` would
--    otherwise create a second overload alongside the old 10/9-arg one
--    instead of replacing it — drop the old signatures explicitly first
--    (same trap 20260901140000_review_events_log.sql's own comment warns
--    about).
-- ---------------------------------------------------------------------------

drop function if exists public.record_review_event(
  uuid, uuid, public.review_event, double precision, double precision,
  double precision, boolean, smallint, text, double precision
);
drop function if exists public.my_record_review_event(
  uuid, public.review_event, double precision, double precision, double precision, boolean,
  smallint, text, double precision
);

create or replace function public.record_review_event(
  p_user_id uuid,
  p_term_id uuid,
  p_event public.review_event,
  p_recall_stability double precision default null,
  p_recall_difficulty double precision default null,
  p_quiz_knowledge_posterior double precision default null,
  p_crossed_known_threshold boolean default false,
  p_grade smallint default null,
  p_question_type text default null,
  p_retrievability_before double precision default null,
  p_crossed_learning_threshold boolean default false
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

  if p_event in ('review_pass', 'review_fail') and p_grade is null then
    raise exception 'review_pass/review_fail requires grade';
  end if;

  if p_event in ('quiz_pass', 'quiz_fail') and p_question_type is null then
    raise exception 'quiz_pass/quiz_fail requires question_type';
  end if;

  insert into public.review_state (
    user_id, term_id, read_count, last_read_at,
    review_recall_count, last_review_recall_at,
    quiz_test_count, last_quiz_tested_at,
    recall_stability, recall_difficulty, quiz_knowledge_posterior,
    ever_mastered_at, ever_learning_at
  )
  values (
    p_user_id,
    p_term_id,
    case when p_event = 'read' then 1 else 0 end,
    case when p_event = 'read' then now() else null end,
    case when p_event in ('review_pass', 'review_fail') then 1 else 0 end,
    case when p_event in ('review_pass', 'review_fail') then now() else null end,
    case when p_event in ('quiz_pass', 'quiz_fail') then 1 else 0 end,
    case when p_event in ('quiz_pass', 'quiz_fail') then now() else null end,
    p_recall_stability,
    p_recall_difficulty,
    p_quiz_knowledge_posterior,
    case when p_crossed_known_threshold then now() else null end,
    case when p_crossed_learning_threshold then now() else null end
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
    -- High-water marks: each set once, never cleared or overwritten once set.
    ever_mastered_at = case
      when public.review_state.ever_mastered_at is not null
        then public.review_state.ever_mastered_at
      when p_crossed_known_threshold then now()
      else public.review_state.ever_mastered_at
    end,
    ever_learning_at = case
      when public.review_state.ever_learning_at is not null
        then public.review_state.ever_learning_at
      when p_crossed_learning_threshold then now()
      else public.review_state.ever_learning_at
    end;

  insert into public.review_events (
    user_id, term_id, event, grade, question_type, retrievability_before,
    recall_stability, recall_difficulty, quiz_knowledge_posterior
  )
  values (
    p_user_id, p_term_id, p_event, p_grade, p_question_type, p_retrievability_before,
    p_recall_stability, p_recall_difficulty, p_quiz_knowledge_posterior
  );
end;
$$;

revoke execute on function public.record_review_event(
  uuid, uuid, public.review_event, double precision, double precision,
  double precision, boolean, smallint, text, double precision, boolean
) from public;
grant execute on function public.record_review_event(
  uuid, uuid, public.review_event, double precision, double precision,
  double precision, boolean, smallint, text, double precision, boolean
) to service_role;

create or replace function public.my_record_review_event(
  p_term_id uuid,
  p_event public.review_event,
  p_recall_stability double precision default null,
  p_recall_difficulty double precision default null,
  p_quiz_knowledge_posterior double precision default null,
  p_crossed_known_threshold boolean default false,
  p_grade smallint default null,
  p_question_type text default null,
  p_retrievability_before double precision default null,
  p_crossed_learning_threshold boolean default false
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
    p_crossed_known_threshold, p_grade, p_question_type, p_retrievability_before,
    p_crossed_learning_threshold
  );
end;
$$;

revoke all on function public.my_record_review_event(
  uuid, public.review_event, double precision, double precision, double precision, boolean,
  smallint, text, double precision, boolean
) from public;
grant execute on function public.my_record_review_event(
  uuid, public.review_event, double precision, double precision, double precision, boolean,
  smallint, text, double precision, boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. get_trace_candidates / my_get_trace_candidates: return ever_learning_at
--    alongside ever_mastered_at.
--
--    Adding an output column changes the function's return type, which
--    `create or replace function` refuses ("cannot change return type of
--    existing function") — drop first. IMPORTANT: dropping and recreating
--    loses all grants on the old function object (the exact regression
--    20260901140000_review_events_log.sql's own comment documents fixing
--    for record_review_event) — both revoke/grant blocks below must be
--    reissued or these functions silently fall back to PUBLIC's default
--    execute grant.
-- ---------------------------------------------------------------------------

drop function if exists public.my_get_trace_candidates(uuid[]);
drop function if exists public.get_trace_candidates(uuid, uuid[]);

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
  ever_mastered_at timestamptz,
  ever_learning_at timestamptz
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
    rs.ever_mastered_at,
    rs.ever_learning_at
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
  ever_mastered_at timestamptz,
  ever_learning_at timestamptz
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
