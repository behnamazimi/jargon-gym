-- Batched sibling of get_term_card: fetches multiple term cards in one round
-- trip instead of one RPC call per term id (the service-role hydrate path
-- was doing N sequential RPCs for a batch of N terms). Mirrors
-- get_term_card's current shape (see 20260808100000_add_term_mental_model_anti_example.sql
-- and 20260825120948_lock_down_p_user_id_rpc_grants.sql).

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
  domain_id uuid,
  domain_name text,
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
    t.domain_id,
    d.name as domain_name,
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
        ) rel
      ),
      '[]'::jsonb
    ) as relationships
  from public.terms t
  join public.domains d on d.id = t.domain_id
  where t.id = any(p_term_ids)
    and t.domain_id in (select public.review_domain_ids(p_user_id));
$$;

revoke all on function public.get_term_cards(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.get_term_cards(uuid, uuid[]) to service_role;
