-- Drop review_state.pending_reveal: written on every Review reveal (and
-- cleared on the grade that follows) but never read by anything. TRACE's
-- TraceState/TraceCandidate types explicitly enumerate the columns they
-- consume from review_state and pending_reveal isn't among them, and
-- neither get_trace_candidates/my_get_trace_candidates nor
-- get_trace_state_for_term/my_get_trace_state_for_term select it. It's a
-- holdover from the pre-TRACE smart-queue (20260809130000) that TRACE never
-- picked up.
-- @see docs/trace.md

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
    review_recall_count, last_review_recall_at,
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

alter table public.review_state drop column pending_reveal;
