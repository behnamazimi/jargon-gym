-- Admin queue debug page: one member's terms with their TRACE state and what
-- decides whether the queues can serve them (finished, collection on).
-- Read-only. Unlike get_trace_candidates it also returns the terms the queues
-- skip, so the page can say why a term is missing.
--
-- Rollback (as a new migration): drop function public.admin_queue_debug_terms(uuid).

create function public.admin_queue_debug_terms(p_user_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_active uuid[];
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can read a member''s queue';
  end if;

  select coalesce(array_agg(rid.review_domain_id), '{}'::uuid[])
  into v_active
  from public.review_domain_ids(p_user_id) as rid(review_domain_id);

  return (
    select coalesce(json_agg(row_to_json(r) order by r.term_id), '[]'::json)
    from (
      select
        t.id as term_id,
        t.term as term,
        t.domain_id,
        d.name as domain_name,
        t.domain_id = any(v_active) as active,
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
        rs.marked_known_at
      from public.terms t
      join public.domains d on d.id = t.domain_id
      left join public.review_state rs
        on rs.term_id = t.id
       and rs.user_id = p_user_id
      where t.domain_id in (
        select dd.id from public.domains dd where dd.owner_id = p_user_id
        union
        select ucd.domain_id from public.user_collection_domains ucd where ucd.user_id = p_user_id
      )
    ) r
  );
end;
$$;

revoke all on function public.admin_queue_debug_terms(uuid) from public, anon;
grant execute on function public.admin_queue_debug_terms(uuid) to authenticated;
