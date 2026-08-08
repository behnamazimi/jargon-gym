alter table public.terms
  add column mental_model text,
  add column anti_example text;

-- Recreate get_term_card to surface the two new optional fields. Output columns are
-- changing, so the function must be dropped first (CREATE OR REPLACE cannot change
-- the return type of an existing function).
drop function if exists public.get_term_card(uuid, uuid);

create function public.get_term_card(p_user_id uuid, p_term_id uuid)
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
  where t.id = p_term_id
    and t.domain_id in (select public.review_domain_ids(p_user_id))
  limit 1;
$$;

revoke all on function public.get_term_card(uuid, uuid) from public;
grant execute on function public.get_term_card(uuid, uuid) to service_role;
