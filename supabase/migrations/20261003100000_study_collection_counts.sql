-- Faster study pages (Review, Read, Quiz, Stories):
--
-- 1. my_study_collection_term_counts: per-collection term counts in one call,
--    so listing a user's collections no longer loads every term's progress.
-- 2. get_trace_candidates_json / my_get_trace_candidates_json: the same rows
--    as get_trace_candidates, ordered by term_id, as one JSON array. PostgREST
--    caps a set-returning call at 1000 rows, so the app used to page through
--    them, re-running the whole function for every page.
-- 3. get_term_cards also returns the collection's language, which the app
--    used to fetch with a second query.
--
-- Rollback (as a new migration): drop the three new functions and restore
-- get_term_cards from 20261001120000_unfinished_terms.sql.

-- ---------------------------------------------------------------------------
-- 1. Term counts per collection
-- ---------------------------------------------------------------------------

create function public.my_study_collection_term_counts()
returns table (domain_id uuid, term_count int)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select t.domain_id, count(*)::int
  from public.terms t
  where t.definition is not null
    and t.domain_id in (
      select d.id from public.domains d where d.owner_id = auth.uid()
      union
      select ucd.domain_id from public.user_collection_domains ucd where ucd.user_id = auth.uid()
    )
  group by t.domain_id;
end;
$$;

revoke all on function public.my_study_collection_term_counts() from public;
grant execute on function public.my_study_collection_term_counts() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Trace candidates as one JSON array
-- ---------------------------------------------------------------------------

create function public.get_trace_candidates_json(
  p_user_id uuid,
  p_domain_ids uuid[] default null
)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(c order by c.term_id), '[]'::json)
  from public.get_trace_candidates(p_user_id, p_domain_ids) as c;
$$;

revoke all on function public.get_trace_candidates_json(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.get_trace_candidates_json(uuid, uuid[]) to service_role;

create function public.my_get_trace_candidates_json(p_domain_ids uuid[] default null)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return public.get_trace_candidates_json(auth.uid(), p_domain_ids);
end;
$$;

revoke all on function public.my_get_trace_candidates_json(uuid[]) from public;
grant execute on function public.my_get_trace_candidates_json(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. get_term_cards with the collection's language
-- ---------------------------------------------------------------------------

drop function public.get_term_cards(uuid, uuid[]);

create function public.get_term_cards(p_user_id uuid, p_term_ids uuid[])
returns table (
  id uuid,
  term text,
  category text,
  definition text,
  example text,
  mental_model text,
  discussion text,
  anti_example text,
  controversy text,
  note text,
  domain_id uuid,
  domain_name text,
  domain_language text,
  relationships jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.term,
    t.category,
    t.definition,
    t.example,
    t.mental_model,
    t.discussion,
    t.anti_example,
    t.controversy,
    t.note,
    t.domain_id,
    d.name as domain_name,
    d.language::text as domain_language,
    coalesce(
      (
        select jsonb_agg(rel.rel order by rel.rel->>'related_term_name')
        from (
          select jsonb_build_object(
            'direction', 'outgoing',
            'relationship_type', tr.relationship_type,
            'related_term_name', tgt.term,
            'description', tr.description
          ) as rel
          from public.term_relationships tr
          join public.terms tgt on tgt.id = tr.target_term_id
          where tr.source_term_id = t.id
            and tgt.definition is not null

          union all

          select jsonb_build_object(
            'direction', 'incoming',
            'relationship_type', tr.relationship_type,
            'related_term_name', src.term,
            'description', tr.description
          )
          from public.term_relationships tr
          join public.terms src on src.id = tr.source_term_id
          where tr.target_term_id = t.id
            and src.definition is not null
        ) rel
      ),
      '[]'::jsonb
    ) as relationships
  from public.terms t
  join public.domains d on d.id = t.domain_id
  where t.id = any(p_term_ids)
    and t.definition is not null
    and t.domain_id in (select public.review_domain_ids(p_user_id));
$$;

revoke all on function public.get_term_cards(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.get_term_cards(uuid, uuid[]) to service_role;
