-- The web app now offers two independent surfaces that can both report a
-- term's read: the paged Read view's explicit reveal tap, and the
-- fullscreen focus-mode feed's scroll-into-view exposure. A term can
-- legitimately be shown by one surface, then the other, within the same
-- sitting (e.g. read in the fullscreen feed, then the user exits back to
-- the paged view and taps reveal on the very same term, or the reverse).
-- Each surface only guards against firing twice from its own mounted
-- instance (in-memory refs in read-page.tsx / read-fullscreen-feed.tsx) —
-- neither knows about the other, so the same physical exposure could get
-- recorded twice server-side, inflating review_state.read_count and
-- padding review_events with a duplicate row.
--
-- record_review_event already has one precedent for this shape of guard:
-- bump_streak's "if v_last = v_today then return" check
-- (20260823120000_user_settings_streak.sql). This mirrors that, scoped to
-- the 'read' event only, with a short (minutes, not calendar-day) window —
-- TRACE's own familiarity model treats a later read (even the same day) as
-- a legitimate fresh exposure (see docs/trace.md's Read-ranking notes), so
-- a day-scoped guard would suppress real re-exposures; a short window only
-- catches the same underlying exposure being reported twice, which is the
-- actual bug being fixed here.
--
-- `create or replace` keeps this a same-signature update (the 11-arg form
-- introduced by 20260905120000_ever_learning_at.sql, p_crossed_learning_
-- threshold included) — no drop/regrant needed, since a same-signature
-- create or replace doesn't touch existing grants (unlike an actual
-- signature change, where the earlier migrations' own comments document
-- having to drop first and lost grants).
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

  if p_event = 'read' and exists (
    select 1
    from public.review_state rs
    where rs.user_id = p_user_id
      and rs.term_id = p_term_id
      and rs.last_read_at is not null
      and now() - rs.last_read_at < interval '5 minutes'
  ) then
    return;
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
