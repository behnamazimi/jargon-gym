-- Manual "mark as known" override: a user can flag a term as already known,
-- independent of TRACE's own earned known/learning/unknown label. This is
-- deliberately NOT a TRACE math input (recall_stability, quiz_knowledge_
-- posterior, etc. are untouched) and never sets ever_mastered_at/
-- ever_learning_at — it's a separate, user-set signal that only affects
-- (a) which terms Read/Review/Quiz serve, and (b) how the Mastery page
-- displays and counts the term.
-- @see docs/trace.md

-- ---------------------------------------------------------------------------
-- 1. review_state: add marked_known_at.
-- ---------------------------------------------------------------------------

alter table public.review_state
  add column marked_known_at timestamptz;

comment on column public.review_state.marked_known_at is
  'User-set override: "I already know this term." Set/cleared by hand via set_term_marked_known, never by TRACE scoring. Independent of ever_mastered_at/ever_learning_at (earned high-water marks) and of the live Mastery_adjusted known/learning/unknown label. When set, the term is excluded from Read/Review/Quiz candidate pools.';

-- ---------------------------------------------------------------------------
-- 2. get_trace_candidates / my_get_trace_candidates: return marked_known_at
--    alongside ever_mastered_at/ever_learning_at, so lib/trace-queue can
--    filter marked-known terms out of the candidate pool.
--
--    Adding an output column changes the function's return type, which
--    `create or replace function` refuses — drop first, then recreate, and
--    reissue every grant (dropping a function loses its grants).
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
  ever_learning_at timestamptz,
  marked_known_at timestamptz
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
    rs.ever_learning_at,
    rs.marked_known_at
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
  ever_learning_at timestamptz,
  marked_known_at timestamptz
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
-- 3. progress_state_by_domain / my_progress_state_by_domain: same treatment,
--    so the Jargon page and Mastery page can read marked_known_at per term.
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
  ever_mastered_at timestamptz,
  marked_known_at timestamptz
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
    rs.ever_mastered_at,
    rs.marked_known_at
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
  ever_mastered_at timestamptz,
  marked_known_at timestamptz
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
-- 4. set_term_marked_known / my_set_term_marked_known: the only write path
--    for marked_known_at. review_state has no direct authenticated write
--    access (RLS grants select-only, see 20260801170000_schema_cleanup.sql)
--    — every write goes through a security definer RPC, same as
--    record_review_event/reset_domain_progress.
-- ---------------------------------------------------------------------------

create function public.set_term_marked_known(p_user_id uuid, p_term_id uuid, p_marked boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.review_state (user_id, term_id, marked_known_at)
  values (p_user_id, p_term_id, case when p_marked then now() else null end)
  on conflict (user_id, term_id) do update
    set marked_known_at = case when p_marked then now() else null end;
end;
$$;

revoke all on function public.set_term_marked_known(uuid, uuid, boolean) from public;
grant execute on function public.set_term_marked_known(uuid, uuid, boolean) to service_role;

create function public.my_set_term_marked_known(p_term_id uuid, p_marked boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.set_term_marked_known(auth.uid(), p_term_id, p_marked);
end;
$$;

revoke all on function public.my_set_term_marked_known(uuid, boolean) from public;
grant execute on function public.my_set_term_marked_known(uuid, boolean) to authenticated;
