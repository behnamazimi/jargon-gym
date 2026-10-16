-- Recompute every term's recall, recognition and "terms learned" stamps from
-- its logged events under the TRACE retune of 2026-10-15:
--
-- - Hard never leaves a term with less than half its stability.
-- - A term's first quiz answer starts from its recall two weeks ahead.
-- - Mastery reads every track two weeks ahead, blends recall and recognition
--   as a weighted geometric mean (an untested track counts as 0.5), lets
--   reading fill part of what recall is missing, and uses confidence τ 1 and a Known line
--   of 0.78. ever_mastered_at / ever_learning_at are stamped at the first
--   success that reaches Known / Learning under these rules, so stamps that
--   misses earned under the old scoring go away.
--
-- The math mirrors lib/trace (recall.ts, recognition.ts, familiarity.ts,
-- mastery.ts) at the time of this migration, including the one-day floor
-- and the same-day rule that 20261031100000 predates. It runs once, so the
-- constants are written out here rather than shared.
--
-- Each term is replayed from its review and quiz events in order, retries
-- included (they update stability but are not tests). A term is replayed only
-- when its log tells its whole story: its counts and last review / quiz times
-- match review_state. That skips terms graded before review_events existed and
-- terms whose progress was reset (reset_collection_progress deletes the
-- review_state row but keeps the log), so neither gets state rebuilt from
-- history it doesn't own. Terms with a logged grade missing are skipped too.
-- review_events itself is not changed.
--
-- Every row it rewrites is copied to trace_retune_backup.review_state first,
-- so the old values, the stamps included, can be put back. The copy lives in
-- its own schema, outside the API and the generated types.

create schema trace_retune_backup;
revoke all on schema trace_retune_backup from public, anon, authenticated;

create table trace_retune_backup.review_state as
select user_id, term_id, recall_stability, recall_difficulty, quiz_knowledge_posterior,
  ever_mastered_at, ever_learning_at, now() as backed_up_at
from public.review_state
with no data;

alter table trace_retune_backup.review_state enable row level security;
revoke all on table trace_retune_backup.review_state
  from public, anon, authenticated, service_role;

comment on table trace_retune_backup.review_state is
  'review_state values before 20261111100000_trace_retune_replay rewrote them. One-off, for restoring if needed; nothing reads it.';

create or replace function pg_temp.initial_difficulty(g int) returns double precision
language sql immutable as $$
  select least(10, greatest(1, 7.2102 - exp(0.5316 * (g - 1)) + 1))
$$;

create or replace function pg_temp.next_difficulty(d double precision, g int) returns double precision
language sql immutable as $$
  select least(10, greatest(1,
    0.0234 * pg_temp.initial_difficulty(4)
    + (1 - 0.0234) * (d + (-1.0651 * (g - 3)) * (10 - d) / 9)
  ))
$$;

create or replace function pg_temp.recall_r(s double precision, days double precision)
returns double precision
language sql immutable as $$
  select power(1 + (19.0 / 81) * greatest(0, days) / s, -0.5)
$$;

-- The stability at which a term comes back after exactly one day at the 0.89 line.
create or replace function pg_temp.min_pass_stability() returns double precision
language sql immutable as $$
  select 1 / ((81.0 / 19) * (power(0.89, -2) - 1))
$$;

create or replace function pg_temp.floor_on_pass(s double precision, g int) returns double precision
language sql immutable as $$
  select case when g = 1 then s else greatest(s, pg_temp.min_pass_stability()) end
$$;

create or replace function pg_temp.success_stability(d double precision, s double precision, r double precision, g int)
returns double precision
language sql immutable as $$
  select s * (1
    + exp(1.616) * (11 - d) * power(s, -0.626) * (exp(1.0824 * (1 - r)) - 1)
    * case when g = 4 then 1.6 else 1 end)
$$;

create or replace function pg_temp.lapse_stability(d double precision, s double precision, r double precision)
returns double precision
language sql immutable as $$
  select least(
    0.2972 * power(d, -0.0953) * (power(s + 1, 0.2975) - 1) * exp(2.2042 * (1 - r)),
    s / exp(0.5034 * 0.6567)
  )
$$;

create or replace function pg_temp.hard_stability(d double precision, s double precision, r double precision)
returns double precision
language sql immutable as $$
  select greatest(
    power(pg_temp.lapse_stability(d, s, r), 0.85) * power(pg_temp.success_stability(d, s, r, 3), 0.15),
    0.5 * s
  )
$$;

create or replace function pg_temp.same_day_stability(s double precision, g int) returns double precision
language plpgsql immutable as $$
declare
  base double precision := case when g = 1 then s else greatest(s, pg_temp.min_pass_stability()) end;
  factor double precision := exp(0.5034 * (g - 3 + 0.6567)) * power(base, -0.0658);
begin
  return base * case when g = 1 then factor else greatest(factor, 1) end;
end;
$$;

create or replace function pg_temp.familiarity(reads bigint, days_since_read double precision)
returns double precision
language sql immutable as $$
  select case when reads <= 0 then 0
    else (0.3 * (1 - exp(-0.5 * reads)) / (1 - exp(-0.5))) / (1 + greatest(0, days_since_read) / 10)
  end
$$;

create or replace function pg_temp.days(a timestamptz, b timestamptz) returns double precision
language sql immutable as $$
  select greatest(0, extract(epoch from b - a) / 86400)
$$;

do $$
declare
  term record;
  ev record;
  s double precision;
  d double precision;
  p double precision;
  last_review timestamptz;
  last_quiz timestamptz;
  reviews int;
  quizzes int;
  had_reviews boolean;
  had_quizzes boolean;
  mastered_at timestamptz;
  learning_at timestamptz;
  reads bigint;
  last_read timestamptz;
  fam double precision;
  r double precision;
  prior double precision;
  guess double precision;
  bayes double precision;
  ahead timestamptz;
  recall_ahead double precision;
  recognition double precision;
  mastery double precision;
  succeeded boolean;
  log_reviews bigint;
  log_quizzes bigint;
  log_last_review timestamptz;
  log_last_quiz timestamptz;
  replayed int := 0;
  skipped int := 0;
  partial int := 0;
begin
  for term in
    select rs.user_id, rs.term_id, rs.review_recall_count, rs.quiz_test_count,
      rs.last_review_recall_at, rs.last_quiz_tested_at
    from public.review_state rs
    where exists (
      select 1 from public.review_events e
      where e.user_id = rs.user_id and e.term_id = rs.term_id
        and e.event in ('review_pass', 'review_fail', 'quiz_pass', 'quiz_fail')
    )
  loop
    if exists (
      select 1 from public.review_events e
      where e.user_id = term.user_id and e.term_id = term.term_id
        and e.event in ('review_pass', 'review_fail') and e.grade is null
    ) then
      skipped := skipped + 1;
      continue;
    end if;

    select
      count(*) filter (where e.event in ('review_pass', 'review_fail') and not e.is_retry),
      count(*) filter (where e.event in ('quiz_pass', 'quiz_fail')),
      max(e.created_at) filter (where e.event in ('review_pass', 'review_fail')),
      max(e.created_at) filter (where e.event in ('quiz_pass', 'quiz_fail'))
    into log_reviews, log_quizzes, log_last_review, log_last_quiz
    from public.review_events e
    where e.user_id = term.user_id and e.term_id = term.term_id;

    if log_reviews <> term.review_recall_count
      or log_quizzes <> term.quiz_test_count
      or log_last_review is distinct from term.last_review_recall_at
      or log_last_quiz is distinct from term.last_quiz_tested_at
    then
      partial := partial + 1;
      continue;
    end if;

    s := null; d := null; p := null;
    last_review := null; last_quiz := null;
    reviews := 0; quizzes := 0;
    had_reviews := false; had_quizzes := false;
    mastered_at := null; learning_at := null;

    for ev in
      select e.event, e.grade, e.question_type, e.is_retry, e.created_at
      from public.review_events e
      where e.user_id = term.user_id and e.term_id = term.term_id
        and e.event in ('review_pass', 'review_fail', 'quiz_pass', 'quiz_fail')
      order by e.created_at, e.id
    loop
      select count(*), max(e.created_at) into reads, last_read
      from public.review_events e
      where e.user_id = term.user_id and e.term_id = term.term_id
        and e.event = 'read' and e.created_at <= ev.created_at;

      if ev.event in ('review_pass', 'review_fail') then
        had_reviews := true;
        succeeded := ev.grade <> 1;
        if s is null then
          fam := pg_temp.familiarity(reads, coalesce(pg_temp.days(last_read, ev.created_at), 0));
          d := least(10, greatest(1, pg_temp.initial_difficulty(ev.grade) - 2 * fam));
          s := pg_temp.floor_on_pass(
            (case ev.grade when 1 then 0.2 when 2 then 0.7 when 3 then 3.1262 else 7 end) * (1 + 0.5 * fam),
            ev.grade
          );
        elsif pg_temp.days(last_review, ev.created_at) < 1 then
          s := pg_temp.floor_on_pass(pg_temp.same_day_stability(s, ev.grade), ev.grade);
          d := pg_temp.next_difficulty(d, ev.grade);
        else
          r := pg_temp.recall_r(s, pg_temp.days(last_review, ev.created_at));
          s := pg_temp.floor_on_pass(case ev.grade
            when 1 then pg_temp.lapse_stability(d, s, r)
            when 2 then pg_temp.hard_stability(d, s, r)
            else pg_temp.success_stability(d, s, r, ev.grade)
          end, ev.grade);
          d := pg_temp.next_difficulty(d, ev.grade);
        end if;
        last_review := ev.created_at;
        if not ev.is_retry then
          reviews := reviews + 1;
        end if;
      else
        had_quizzes := true;
        succeeded := ev.event = 'quiz_pass';
        guess := case ev.question_type
          when 'true_false' then 0.5 when 'typed' then 0.05 else 0.25 end;
        r := case when s is null then null else pg_temp.recall_r(s, pg_temp.days(last_review, ev.created_at)) end;
        prior := coalesce(
          p,
          case when s is null or not succeeded then null
            else greatest(0.5, pg_temp.recall_r(s, pg_temp.days(last_review, ev.created_at + interval '14 days')))
          end,
          0.5
        );
        if succeeded then
          p := 0.95 * prior / (0.95 * prior + guess * (1 - prior));
        else
          bayes := 0.05 * prior / (0.05 * prior + (1 - guess) * (1 - prior));
          p := prior + (case when r is null then 1 else 1 - 0.5 * r end) * (bayes - prior);
        end if;
        last_quiz := ev.created_at;
        quizzes := quizzes + 1;
      end if;

      if not ev.is_retry and succeeded and (learning_at is null or mastered_at is null) then
        ahead := ev.created_at + interval '14 days';
        recall_ahead := case when s is null then null else pg_temp.recall_r(s, pg_temp.days(last_review, ahead)) end;
        recognition := case when p is null then null
          else p / (1 + pg_temp.days(last_quiz, ahead) / (9 * (1 + 15 * p))) end;
        fam := least(0.35, pg_temp.familiarity(reads, coalesce(pg_temp.days(last_read, ahead), 0)));
        recall_ahead := coalesce(recall_ahead, 0.5);
        recall_ahead := recall_ahead + 0.3 * fam * (1 - recall_ahead);
        mastery := (1 - exp(-(reviews + quizzes)))
          * power(recall_ahead, 0.625) * power(coalesce(recognition, 0.5), 0.375);
        if learning_at is null and mastery >= 0.6 then
          learning_at := ev.created_at;
        end if;
        if mastered_at is null and mastery >= 0.78 and reviews + quizzes >= 3 then
          mastered_at := ev.created_at;
        end if;
      end if;
    end loop;

    insert into trace_retune_backup.review_state
    select user_id, term_id, recall_stability, recall_difficulty, quiz_knowledge_posterior,
      ever_mastered_at, ever_learning_at, now()
    from public.review_state
    where user_id = term.user_id and term_id = term.term_id;

    update public.review_state
    set recall_stability = case when had_reviews then s else recall_stability end,
        recall_difficulty = case when had_reviews then d else recall_difficulty end,
        quiz_knowledge_posterior = case when had_quizzes then p else quiz_knowledge_posterior end,
        ever_mastered_at = mastered_at,
        ever_learning_at = learning_at
    where user_id = term.user_id and term_id = term.term_id;
    replayed := replayed + 1;
  end loop;

  raise notice 'Replayed % terms; skipped % with a missing grade and % whose log is incomplete',
    replayed, skipped, partial;
end;
$$;

comment on column public.review_state.ever_mastered_at is
  'High-water mark: set the first time Mastery_adjusted reaches the known threshold on a success. Never cleared as mastery later decays — backs the "terms learned" count. Recomputed once by 20261111100000_trace_retune_replay.';
comment on column public.review_state.ever_learning_at is
  'High-water mark: set the first time Mastery_adjusted reaches the learning threshold (0.6) on a success. Never cleared as mastery later decays. Sibling of ever_mastered_at. Recomputed once by 20261111100000_trace_retune_replay.';

drop function pg_temp.days(timestamptz, timestamptz);
drop function pg_temp.familiarity(bigint, double precision);
drop function pg_temp.same_day_stability(double precision, int);
drop function pg_temp.hard_stability(double precision, double precision, double precision);
drop function pg_temp.lapse_stability(double precision, double precision, double precision);
drop function pg_temp.success_stability(double precision, double precision, double precision, int);
drop function pg_temp.floor_on_pass(double precision, int);
drop function pg_temp.min_pass_stability();
drop function pg_temp.recall_r(double precision, double precision);
drop function pg_temp.next_difficulty(double precision, int);
drop function pg_temp.initial_difficulty(int);
