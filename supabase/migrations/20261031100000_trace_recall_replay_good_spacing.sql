-- Recompute every term's recall stability and difficulty from its logged
-- Review grades again, after w9 (diminishing returns) went from 0.8 to 0.626
-- and the Easy bonus from 2.0 to 1.6, so well-known terms already in the
-- queue move to the new spacing instead of waiting for their next grade.
--
-- Same replay as 20261030100000_trace_recall_replay.sql; only those two
-- values differ. The math mirrors lib/trace/recall.ts (and the cold-start
-- familiarity nudge in lib/trace/familiarity.ts) at the time of this
-- migration. It runs once, so the constants are written out here rather than
-- shared.
--
-- Each term is replayed from its review_pass/review_fail events in order. A
-- term graded before review_events existed is replayed from its first logged
-- grade, as if that were its first. Terms with a logged grade missing are left
-- as they are. review_events itself is not changed.
--
-- The helpers use create or replace and are dropped at the end, because a
-- fresh database applies every migration in one session and the earlier
-- replay leaves functions with the same names in pg_temp.

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
  select power(pg_temp.lapse_stability(d, s, r), 0.85)
       * power(pg_temp.success_stability(d, s, r, 3), 0.15)
$$;

create or replace function pg_temp.familiarity(reads bigint, days_since_read double precision)
returns double precision
language sql immutable as $$
  select case when reads <= 0 then 0
    else (0.3 * (1 - exp(-0.5 * reads)) / (1 - exp(-0.5))) / (1 + greatest(0, days_since_read) / 10)
  end
$$;

do $$
declare
  term record;
  ev record;
  s double precision;
  d double precision;
  prev_at timestamptz;
  elapsed double precision;
  r double precision;
  reads bigint;
  last_read timestamptz;
  fam double precision;
  replayed int := 0;
begin
  for term in
    select rs.user_id, rs.term_id
    from public.review_state rs
    where rs.recall_stability is not null
      and exists (
        select 1 from public.review_events e
        where e.user_id = rs.user_id and e.term_id = rs.term_id
          and e.event in ('review_pass', 'review_fail')
      )
      and not exists (
        select 1 from public.review_events e
        where e.user_id = rs.user_id and e.term_id = rs.term_id
          and e.event in ('review_pass', 'review_fail') and e.grade is null
      )
  loop
    s := null;
    d := null;
    prev_at := null;

    for ev in
      select e.grade, e.created_at
      from public.review_events e
      where e.user_id = term.user_id and e.term_id = term.term_id
        and e.event in ('review_pass', 'review_fail')
      order by e.created_at, e.id
    loop
      if s is null then
        select count(*), max(e.created_at) into reads, last_read
        from public.review_events e
        where e.user_id = term.user_id and e.term_id = term.term_id
          and e.event = 'read' and e.created_at < ev.created_at;
        fam := pg_temp.familiarity(
          reads, coalesce(extract(epoch from ev.created_at - last_read) / 86400, 0)
        );
        d := least(10, greatest(1, pg_temp.initial_difficulty(ev.grade) - 2 * fam));
        s := (case ev.grade when 1 then 0.2 when 2 then 0.7 when 3 then 3.1262 else 7 end)
           * (1 + 0.5 * fam);
      else
        elapsed := greatest(0, extract(epoch from ev.created_at - prev_at) / 86400);
        if elapsed < 1 then
          s := s * exp(0.5034 * (ev.grade - 3 + 0.6567));
        else
          r := power(1 + (19.0 / 81) * elapsed / s, -0.5);
          s := case ev.grade
            when 1 then pg_temp.lapse_stability(d, s, r)
            when 2 then pg_temp.hard_stability(d, s, r)
            else pg_temp.success_stability(d, s, r, ev.grade)
          end;
        end if;
        d := pg_temp.next_difficulty(d, ev.grade);
      end if;
      prev_at := ev.created_at;
    end loop;

    update public.review_state
    set recall_stability = s, recall_difficulty = d
    where user_id = term.user_id and term_id = term.term_id;
    replayed := replayed + 1;
  end loop;

  raise notice 'Replayed recall state for % terms', replayed;
end;
$$;

drop function pg_temp.hard_stability(double precision, double precision, double precision);
drop function pg_temp.success_stability(double precision, double precision, double precision, int);
drop function pg_temp.lapse_stability(double precision, double precision, double precision);
drop function pg_temp.next_difficulty(double precision, int);
drop function pg_temp.initial_difficulty(int);
drop function pg_temp.familiarity(bigint, double precision);
