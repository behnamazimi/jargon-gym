-- Enrich Telegram term cards with controversy and relationships.

drop function if exists public.pick_random_unknown_term(uuid);

create function public.pick_random_unknown_term(p_user_id uuid)
returns table (
  id uuid,
  term text,
  category text,
  definition text,
  example text,
  discussion text,
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
    t.discussion,
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
  where t.domain_id in (select public.telegram_review_domain_ids(p_user_id))
    and not exists (
      select 1
      from public.user_progress up
      where up.user_id = p_user_id
        and up.term_id = t.id
        and up.is_known = true
    )
  order by random()
  limit 1;
$$;

revoke all on function public.pick_random_unknown_term(uuid) from public;
grant execute on function public.pick_random_unknown_term(uuid) to service_role;
