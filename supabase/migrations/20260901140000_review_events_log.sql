-- Append-only history log for TRACE: every read/reveal/review/quiz event,
-- across all three tiers, funnels through record_review_event/
-- my_record_review_event already — this adds one insert alongside the
-- existing review_state upsert so nothing outside those two functions
-- needs to change to cover all three tiers at once.
--
-- Exists to answer questions review_state's live-decay-only design can't:
-- calibration (predicted retrievability vs actual outcome), FSRS weight
-- fitting (needs the real 1-4 grade, not just pass/fail), per-term lapse
-- rate (review_recall_count/quiz_test_count combine pass+fail today), and
-- real re-read cadence (review_state only keeps the latest last_read_at).
-- @see docs/trace.md

-- ---------------------------------------------------------------------------
-- 1. review_events table — append-only, never updated or deleted.
-- ---------------------------------------------------------------------------

create table public.review_events (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.users(id) on delete cascade,
  term_id                   uuid not null references public.terms(id) on delete cascade,
  event                     public.review_event not null,
  grade                     smallint,
  question_type             text,
  retrievability_before     double precision,
  recall_stability          double precision,
  recall_difficulty         double precision,
  quiz_knowledge_posterior  double precision,
  created_at                timestamptz not null default now(),
  constraint review_events_grade_range check (grade is null or grade between 1 and 4),
  constraint review_events_question_type_check
    check (question_type is null or question_type in ('multiple_choice', 'true_false'))
);

comment on table public.review_events is
  'Append-only log of every TRACE event (read, reveal, review_pass/fail, quiz_pass/fail). Written only by record_review_event/my_record_review_event, in the same transaction as the review_state upsert. Never updated or deleted.';
comment on column public.review_events.grade is
  '1-4 (AGAIN/HARD/GOOD/EASY, lib/trace/constants.ts) — set on review_pass/review_fail only. The real grade, not just pass/fail, so FSRS weights can eventually be fit against it.';
comment on column public.review_events.question_type is
  'multiple_choice | true_false — set on quiz_pass/quiz_fail only, needed to interpret guess-rate baselines.';
comment on column public.review_events.retrievability_before is
  'Recall/recognition retrievability computed in TS just before this event was applied — null on a term''s first-ever grade/answer (no prior stability to compute it from). The number that makes calibration checking possible; Postgres never computes it, only persists what TS hands it.';
comment on column public.review_events.recall_stability is
  'Post-event snapshot — same value written to review_state.recall_stability at this moment.';
comment on column public.review_events.recall_difficulty is
  'Post-event snapshot — same value written to review_state.recall_difficulty at this moment.';
comment on column public.review_events.quiz_knowledge_posterior is
  'Post-event snapshot — same value written to review_state.quiz_knowledge_posterior at this moment.';

create index review_events_user_term_created_idx
  on public.review_events (user_id, term_id, created_at desc);
create index review_events_event_created_idx
  on public.review_events (event, created_at);

-- RLS: stricter than review_state's original pattern from day one — match
-- the hardened state review_state was moved to in 20260801170000_schema_cleanup.sql
-- §9 (authenticated: select-only, all writes via the SECURITY DEFINER RPC).
alter table public.review_events enable row level security;

create policy "Users can view own review events"
  on public.review_events for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policy or grant for authenticated — writes go
-- exclusively through record_review_event/my_record_review_event
-- (SECURITY DEFINER). Immutability is enforced by omitting the grant, not
-- a mutable flag — the same lesson pending_reveal cost us.
grant select on public.review_events to authenticated;
grant select, insert on public.review_events to service_role;

-- ---------------------------------------------------------------------------
-- 2. record_review_event / my_record_review_event: accept the 3 new fields
--    and write the review_events row, in the same transaction as the
--    existing review_state upsert.
--
--    New parameters change the signature, so `create or replace` would
--    otherwise create a second overload alongside the old 7-arg/6-arg one
--    instead of replacing it (the exact trap 20260831230000_trace_engine.sql's
--    own comment warns about) — drop the old signatures explicitly first.
--    Skipping this the first time round left the old, never-locked-down
--    7-arg record_review_event reachable by PUBLIC in parallel with the new
--    one; caught by the grant-check verification step, fixed here.
-- ---------------------------------------------------------------------------

drop function if exists public.record_review_event(
  uuid, uuid, public.review_event, double precision, double precision, double precision, boolean
);
drop function if exists public.my_record_review_event(
  uuid, public.review_event, double precision, double precision, double precision, boolean
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
  p_retrievability_before double precision default null
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

-- Security fix, folded in here since this is the same function being
-- touched anyway: record_review_event was recreated with a new signature
-- in 20260831230000_trace_engine.sql (dropped the old 3-arg version
-- first, so it's a genuinely new function object) but, unlike
-- my_record_review_event just below, never got its execute grants locked
-- down. Postgres grants EXECUTE to PUBLIC on new functions by default, so
-- this p_user_id-taking function has likely been callable by
-- anon/authenticated directly since 2026-08-31 — letting any caller forge
-- another user's review_state/review_events rows by passing an arbitrary
-- p_user_id. Matches the lockdown style of the original 3-arg version
-- (20260809130000_smart_queue_v4_split_activities.sql): revoke from the
-- `public` pseudo-role, not from individual roles — anon/authenticated
-- inherit through `public` regardless of whether they're revoked
-- individually, so revoking only `from anon, authenticated` (tried first,
-- caught by the grant-check verification step) leaves PUBLIC's default
-- execute grant untouched and the gap open.
revoke execute on function public.record_review_event(
  uuid, uuid, public.review_event, double precision, double precision,
  double precision, boolean, smallint, text, double precision
) from public;
grant execute on function public.record_review_event(
  uuid, uuid, public.review_event, double precision, double precision,
  double precision, boolean, smallint, text, double precision
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
  p_retrievability_before double precision default null
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
    p_crossed_known_threshold, p_grade, p_question_type, p_retrievability_before
  );
end;
$$;

revoke all on function public.my_record_review_event(
  uuid, public.review_event, double precision, double precision, double precision, boolean,
  smallint, text, double precision
) from public;
grant execute on function public.my_record_review_event(
  uuid, public.review_event, double precision, double precision, double precision, boolean,
  smallint, text, double precision
) to authenticated;
