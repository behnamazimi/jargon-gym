-- A missed term is re-asked in the same session (a "learning step"). That
-- retry updates the term's recall stability and difficulty and is logged, but
-- it is not a new test: it must not add to review_recall_count (which feeds
-- mastery confidence and the Known label's minimum test count).
--
-- record_review_event / my_record_review_event get p_is_retry (default false),
-- and review_events records it so calibration queries can leave retries out
-- (they are minutes apart, not a real forgetting interval).
--
-- Adding a parameter creates a second overload rather than replacing the
-- function, so the old signatures are dropped first and their grants reissued
-- (the same trap 20260901140000_review_events_log.sql and
-- 20260905120000_ever_learning_at.sql document).

alter table public.review_events
  add column is_retry boolean not null default false;

comment on column public.review_events.is_retry is
  'True for a learning-step retry: a missed term re-asked minutes later in the same session. It moves recall stability/difficulty but is not counted as a test. Leave these rows out when checking calibration over days.';

drop function if exists public.record_review_event(
  uuid, uuid, public.review_event, double precision, double precision,
  double precision, boolean, smallint, text, double precision, boolean
);
drop function if exists public.my_record_review_event(
  uuid, public.review_event, double precision, double precision, double precision, boolean,
  smallint, text, double precision, boolean
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
  p_crossed_learning_threshold boolean default false,
  p_is_retry boolean default false
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
      and t.collection_id in (select public.review_collection_ids(p_user_id))
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

  if p_is_retry and p_event not in ('review_pass', 'review_fail') then
    raise exception 'Only review_pass/review_fail can be a retry';
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
    case when p_event in ('review_pass', 'review_fail') and not p_is_retry then 1 else 0 end,
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
      + case when p_event in ('review_pass', 'review_fail') and not p_is_retry then 1 else 0 end,
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
    recall_stability, recall_difficulty, quiz_knowledge_posterior, is_retry
  )
  values (
    p_user_id, p_term_id, p_event, p_grade, p_question_type, p_retrievability_before,
    p_recall_stability, p_recall_difficulty, p_quiz_knowledge_posterior, p_is_retry
  );
end;
$$;

revoke execute on function public.record_review_event(
  uuid, uuid, public.review_event, double precision, double precision,
  double precision, boolean, smallint, text, double precision, boolean, boolean
) from public;
grant execute on function public.record_review_event(
  uuid, uuid, public.review_event, double precision, double precision,
  double precision, boolean, smallint, text, double precision, boolean, boolean
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
  p_crossed_learning_threshold boolean default false,
  p_is_retry boolean default false
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
    p_crossed_learning_threshold, p_is_retry
  );
end;
$$;

revoke all on function public.my_record_review_event(
  uuid, public.review_event, double precision, double precision, double precision, boolean,
  smallint, text, double precision, boolean, boolean
) from public;
grant execute on function public.my_record_review_event(
  uuid, public.review_event, double precision, double precision, double precision, boolean,
  smallint, text, double precision, boolean, boolean
) to authenticated;
