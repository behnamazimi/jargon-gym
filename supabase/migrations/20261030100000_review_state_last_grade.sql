-- Remember each term's most recent Review grade (1 Again, 2 Hard, 3 Good, 4 Easy).
-- Review ranking uses it: a term last graded Again or Hard is due sooner than
-- its recall alone says (LAPSE_*_DUE_RETRIEVABILITY in lib/trace/constants.ts).
-- Only a Review grade writes it; reads, reveals and quiz answers never touch it.
-- @see docs/trace.md
--
-- Rollback (as a new migration): drop the column and put the previous
-- record_review_event, get_trace_candidates and admin_queue_debug_terms back
-- (20261022100000_rename_domains_to_collections.sql).

-- ---------------------------------------------------------------------------
-- 1. review_state: add last_review_grade, and fill it from the event log.
-- ---------------------------------------------------------------------------

alter table public.review_state
  add column last_review_grade smallint
    check (last_review_grade is null or last_review_grade between 1 and 4);

comment on column public.review_state.last_review_grade is
  'Grade of the latest Review (1 Again, 2 Hard, 3 Good, 4 Easy). Set only by review_pass/review_fail in record_review_event; null until a term is first graded. Review ranking brings a term last graded Again or Hard back sooner. Read, reveal and quiz events never change it.';

update public.review_state rs
set last_review_grade = latest.grade
from (
  select distinct on (user_id, term_id) user_id, term_id, grade
  from public.review_events
  where event in ('review_pass', 'review_fail')
    and grade is not null
  order by user_id, term_id, created_at desc, id desc
) latest
where rs.user_id = latest.user_id
  and rs.term_id = latest.term_id
  and rs.review_recall_count > 0;

-- ---------------------------------------------------------------------------
-- 2. record_review_event: store the grade on a Review grade only.
--    Same signature as before, so `create or replace` keeps its grants.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_review_event(p_user_id uuid, p_term_id uuid, p_event review_event, p_recall_stability double precision DEFAULT NULL::double precision, p_recall_difficulty double precision DEFAULT NULL::double precision, p_quiz_knowledge_posterior double precision DEFAULT NULL::double precision, p_crossed_known_threshold boolean DEFAULT false, p_grade smallint DEFAULT NULL::smallint, p_question_type text DEFAULT NULL::text, p_retrievability_before double precision DEFAULT NULL::double precision, p_crossed_learning_threshold boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  insert into public.review_state (
    user_id, term_id, read_count, last_read_at,
    review_recall_count, last_review_recall_at,
    quiz_test_count, last_quiz_tested_at,
    recall_stability, recall_difficulty, quiz_knowledge_posterior,
    ever_mastered_at, ever_learning_at, last_review_grade
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
    case when p_crossed_learning_threshold then now() else null end,
    case when p_event in ('review_pass', 'review_fail') then p_grade else null end
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
    last_review_grade = case
      when p_event in ('review_pass', 'review_fail') then p_grade
      else public.review_state.last_review_grade
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
$function$;

-- ---------------------------------------------------------------------------
-- 3. get_trace_candidates: return last_review_grade.
--    Adding an output column changes the return type, which `create or
--    replace` refuses, so drop and recreate and reissue the grants. The _json
--    wrappers return json and pick the new column up on their own.
-- ---------------------------------------------------------------------------

drop function public.get_trace_candidates(uuid, uuid[]);

CREATE FUNCTION public.get_trace_candidates(p_user_id uuid, p_collection_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(term_id uuid, collection_id uuid, created_at timestamp with time zone, read_count integer, last_read_at timestamp with time zone, recall_stability double precision, recall_difficulty double precision, review_recall_count integer, last_review_recall_at timestamp with time zone, quiz_knowledge_posterior double precision, quiz_test_count integer, last_quiz_tested_at timestamp with time zone, ever_mastered_at timestamp with time zone, ever_learning_at timestamp with time zone, marked_known_at timestamp with time zone, last_review_grade smallint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_collections uuid[];
begin
  select coalesce(array_agg(rid.review_collection_id), '{}'::uuid[])
  into v_collections
  from public.review_collection_ids(p_user_id) as rid(review_collection_id)
  where p_collection_ids is null
     or cardinality(p_collection_ids) = 0
     or rid.review_collection_id = any(p_collection_ids);

  if cardinality(v_collections) = 0 then
    return;
  end if;

  return query
  select
    t.id,
    t.collection_id,
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
    rs.ever_learning_at,
    rs.marked_known_at,
    rs.last_review_grade
  from public.terms t
  left join public.review_state rs
    on rs.term_id = t.id
   and rs.user_id = p_user_id
  where t.collection_id = any(v_collections)
    and t.definition is not null;
end;
$function$;
revoke all on function public.get_trace_candidates(uuid,uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.get_trace_candidates(uuid,uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- 4. admin_queue_debug_terms: include the grade so the admin Queue page can
--    show which terms are in the lane. Returns json, so `create or replace`
--    works and the grants stay.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_queue_debug_terms(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_active uuid[];
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can read a member''s queue';
  end if;

  select coalesce(array_agg(rid.review_collection_id), '{}'::uuid[])
  into v_active
  from public.review_collection_ids(p_user_id) as rid(review_collection_id);

  return (
    select coalesce(json_agg(row_to_json(r) order by r.term_id), '[]'::json)
    from (
      select
        t.id as term_id,
        t.term as term,
        t.collection_id,
        d.name as collection_name,
        t.collection_id = any(v_active) as active,
        t.definition is not null as finished,
        t.created_at,
        coalesce(rs.read_count, 0)::int as read_count,
        rs.last_read_at,
        rs.recall_stability,
        rs.recall_difficulty,
        coalesce(rs.review_recall_count, 0)::int as review_recall_count,
        rs.last_review_recall_at,
        rs.quiz_knowledge_posterior,
        coalesce(rs.quiz_test_count, 0)::int as quiz_test_count,
        rs.last_quiz_tested_at,
        rs.ever_mastered_at,
        rs.ever_learning_at,
        rs.marked_known_at,
        rs.last_review_grade
      from public.terms t
      join public.collections d on d.id = t.collection_id
      left join public.review_state rs
        on rs.term_id = t.id
       and rs.user_id = p_user_id
      where t.collection_id in (
        select dd.id from public.collections dd where dd.owner_id = p_user_id
        union
        select ucd.collection_id from public.user_collections ucd where ucd.user_id = p_user_id
      )
    ) r
  );
end;
$function$;
