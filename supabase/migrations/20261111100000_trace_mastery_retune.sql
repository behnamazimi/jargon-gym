-- Replay every term's logged events under the retuned TRACE rules (2026-10-15):
--
-- - A Hard keeps at least half of a term's recall stability (HARD_MIN_KEEP).
-- - A term's first Quiz answer starts from its recall a week ahead instead of
--   50/50 when it has been reviewed.
-- - Mastery reads recall and recognition a week ahead, weighs recognition by
--   the quiz posterior, drops familiarity, gives recall the recognition weight
--   when the term was never quizzed, uses a confidence constant of 1 and a
--   known line of 0.8.
--
-- It rewrites recall_stability, recall_difficulty and quiz_knowledge_posterior,
-- and recomputes ever_learning_at and ever_mastered_at: each is the first
-- successful answer after which the term's label was learning or known.
--
-- The math mirrors lib/trace (recall.ts, recognition.ts, mastery.ts and
-- snapshot.ts) at the time of this migration. It runs once, so the constants
-- are written out here rather than shared.
--
-- Events are replayed in order (created_at, id). Recall stability and
-- difficulty are replayed for every term with a logged grade, as the earlier
-- replays did, even when the term was graded before review_events existed.
-- The posterior is written only when every quiz answer is logged, and the
-- two stamps only when every grade and answer is; otherwise they stay as they
-- are. marked_known_at and review_events are not changed.

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

-- The stability that comes back after exactly one day at Review's 0.89 line.
create or replace function pg_temp.min_pass_stability() returns double precision
language sql immutable as $$
  select (19.0 / 81) / (power(0.89, -2) - 1)
$$;

create or replace function pg_temp.floor_on_pass(s double precision, g int) returns double precision
language sql immutable as $$
  select case when g = 1 then s else greatest(s, pg_temp.min_pass_stability()) end
$$;

create or replace function pg_temp.same_day_stability(s double precision, g int) returns double precision
language sql immutable as $$
  select base * case when g = 1 then f else greatest(f, 1) end
  from (
    select base, exp(0.5034 * (g - 3 + 0.6567)) * power(base, -0.0658) as f
    from (select case when g = 1 then s else greatest(s, pg_temp.min_pass_stability()) end as base) b
  ) x
$$;

create or replace function pg_temp.recall_r(s double precision, days double precision) returns double precision
language sql immutable as $$
  select power(1 + (19.0 / 81) * greatest(0, days) / s, -0.5)
$$;

create or replace function pg_temp.familiarity(reads bigint, days_since_read double precision)
returns double precision
language sql immutable as $$
  select case when reads <= 0 then 0
    else (0.3 * (1 - exp(-0.5 * reads)) / (1 - exp(-0.5))) / (1 + greatest(0, days_since_read) / 10)
  end
$$;

create or replace function pg_temp.update_posterior(
  prior double precision, correct boolean, question_type text, recall_now double precision
) returns double precision
language sql immutable as $$
  select case
    when correct then 0.95 * p / (0.95 * p + guess * (1 - p))
    else p + (case when recall_now is null then 1 else 1 - 0.5 * recall_now end)
      * (0.05 * p / (0.05 * p + (1 - guess) * (1 - p)) - p)
  end
  from (
    select coalesce(prior, 0.5) as p,
      case question_type
        when 'true_false' then 0.5
        when 'typed' then 0.05
        else 0.25
      end as guess
  ) x
$$;

-- The label right after an answer at `at`, from the term's state then.
create or replace function pg_temp.label(
  s double precision, last_review timestamptz, posterior double precision, last_quiz timestamptz,
  tests int, at timestamptz
) returns text
language sql immutable as $$
  select case
    when adj >= 0.8 and tests >= 3 then 'known'
    when adj < 0.6 then 'unknown'
    else 'learning'
  end
  from (
    select (1 - exp(-tests::double precision)) * (
      (case when recog is null then 1.0 else 0.625 end) * coalesce(recall, 0)
      + 0.375 * coalesce(recog, 0)
    ) as adj
    from (
      select
        case when s is null then null
          else pg_temp.recall_r(s, extract(epoch from at + interval '7 days' - last_review) / 86400)
        end as recall,
        case when posterior is null then null
          else posterior / (1 + greatest(0, extract(epoch from at + interval '7 days' - last_quiz) / 86400)
            / (9 * (1 + 15 * posterior)))
        end as recog
    ) r
  ) m
$$;

do $$
declare
  term record;
  ev record;
  s double precision;
  d double precision;
  next_d double precision;
  r double precision;
  elapsed double precision;
  posterior double precision;
  prior double precision;
  recall_now double precision;
  last_review timestamptz;
  last_quiz timestamptz;
  reads bigint;
  last_read timestamptz;
  fam double precision;
  reviews int;
  quizzes int;
  succeeded boolean;
  lbl text;
  learning_at timestamptz;
  mastered_at timestamptz;
  replayed int := 0;
  restamped int := 0;
begin
  for term in
    select rs.user_id, rs.term_id, rs.review_recall_count, rs.quiz_test_count,
      count(*) filter (where e.event in ('review_pass', 'review_fail') and not e.is_retry) as logged_reviews,
      count(*) filter (where e.event in ('quiz_pass', 'quiz_fail')) as logged_quizzes,
      bool_or(e.event in ('review_pass', 'review_fail')) as has_review
    from public.review_state rs
    join public.review_events e on e.user_id = rs.user_id and e.term_id = rs.term_id
    where e.event in ('review_pass', 'review_fail', 'quiz_pass', 'quiz_fail')
    group by rs.user_id, rs.term_id, rs.review_recall_count, rs.quiz_test_count
    having not bool_or(e.event in ('review_pass', 'review_fail') and e.grade is null)
  loop
    s := null; d := null; posterior := null;
    last_review := null; last_quiz := null; last_read := null;
    reads := 0; reviews := 0; quizzes := 0;
    learning_at := null; mastered_at := null;

    for ev in
      select e.event, e.grade, e.question_type, e.is_retry, e.created_at
      from public.review_events e
      where e.user_id = term.user_id and e.term_id = term.term_id
        and e.event in ('read', 'review_pass', 'review_fail', 'quiz_pass', 'quiz_fail')
      order by e.created_at, e.id
    loop
      if ev.event = 'read' then
        reads := reads + 1;
        last_read := ev.created_at;
        continue;
      end if;

      if ev.event in ('review_pass', 'review_fail') then
        if s is null then
          fam := pg_temp.familiarity(
            reads, coalesce(extract(epoch from ev.created_at - last_read) / 86400, 0)
          );
          d := least(10, greatest(1, pg_temp.initial_difficulty(ev.grade) - 2 * fam));
          s := (case ev.grade when 1 then 0.2 when 2 then 0.7 when 3 then 3.1262 else 7 end)
             * (1 + 0.5 * fam);
        else
          elapsed := greatest(0, extract(epoch from ev.created_at - last_review) / 86400);
          next_d := pg_temp.next_difficulty(d, ev.grade);
          if elapsed < 1 then
            s := pg_temp.same_day_stability(s, ev.grade);
          else
            r := pg_temp.recall_r(s, elapsed);
            s := case ev.grade
              when 1 then pg_temp.lapse_stability(d, s, r)
              when 2 then pg_temp.hard_stability(d, s, r)
              else pg_temp.success_stability(d, s, r, ev.grade)
            end;
          end if;
          d := next_d;
        end if;
        s := pg_temp.floor_on_pass(s, ev.grade);
        last_review := ev.created_at;
        if ev.is_retry then
          continue;
        end if;
        reviews := reviews + 1;
        succeeded := ev.grade <> 1;
      else
        recall_now := case when s is null then null
          else pg_temp.recall_r(s, extract(epoch from ev.created_at - last_review) / 86400) end;
        prior := case when posterior is null and s is not null
          then greatest(0.5, pg_temp.recall_r(s, extract(epoch from ev.created_at + interval '7 days' - last_review) / 86400))
          else posterior end;
        posterior := pg_temp.update_posterior(prior, ev.event = 'quiz_pass', ev.question_type, recall_now);
        last_quiz := ev.created_at;
        quizzes := quizzes + 1;
        succeeded := ev.event = 'quiz_pass';
      end if;

      if succeeded then
        lbl := pg_temp.label(s, last_review, posterior, last_quiz, reviews + quizzes, ev.created_at);
        if lbl <> 'unknown' and learning_at is null then learning_at := ev.created_at; end if;
        if lbl = 'known' and mastered_at is null then mastered_at := ev.created_at; end if;
      end if;
    end loop;

    if term.has_review then
      update public.review_state
      set recall_stability = s, recall_difficulty = d
      where user_id = term.user_id and term_id = term.term_id;
    end if;

    if term.logged_quizzes > 0 and term.quiz_test_count <= term.logged_quizzes then
      update public.review_state
      set quiz_knowledge_posterior = posterior
      where user_id = term.user_id and term_id = term.term_id;
    end if;

    if term.review_recall_count <= term.logged_reviews and term.quiz_test_count <= term.logged_quizzes then
      update public.review_state
      set ever_learning_at = learning_at, ever_mastered_at = mastered_at
      where user_id = term.user_id and term_id = term.term_id;
      restamped := restamped + 1;
    end if;

    replayed := replayed + 1;
  end loop;

  raise notice 'Replayed % terms, recomputed stamps on %', replayed, restamped;
end;
$$;

drop function pg_temp.label(double precision, timestamptz, double precision, timestamptz, int, timestamptz);
drop function pg_temp.update_posterior(double precision, boolean, text, double precision);
drop function pg_temp.hard_stability(double precision, double precision, double precision);
drop function pg_temp.success_stability(double precision, double precision, double precision, int);
drop function pg_temp.lapse_stability(double precision, double precision, double precision);
drop function pg_temp.same_day_stability(double precision, int);
drop function pg_temp.floor_on_pass(double precision, int);
drop function pg_temp.min_pass_stability();
drop function pg_temp.recall_r(double precision, double precision);
drop function pg_temp.next_difficulty(double precision, int);
drop function pg_temp.initial_difficulty(int);
drop function pg_temp.familiarity(bigint, double precision);
