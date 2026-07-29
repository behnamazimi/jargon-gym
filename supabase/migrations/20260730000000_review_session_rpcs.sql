-- Add RPCs for review sessions that need multiple terms at once

create or replace function public.pick_multiple_unknown_terms(p_user_id uuid, p_limit int)
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
        select jsonb_agg(
          jsonb_build_object(
            'direction', case when tr.source_term_id = t.id then 'outgoing' else 'incoming' end,
            'relationship_type', tr.relationship_type,
            'related_term_name', case 
              when tr.source_term_id = t.id then t_target.term 
              else t_source.term 
            end,
            'description', tr.description
          )
        )
        from public.term_relationships tr
        left join public.terms t_source on tr.source_term_id = t_source.id
        left join public.terms t_target on tr.target_term_id = t_target.id
        where tr.source_term_id = t.id or tr.target_term_id = t.id
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
  limit p_limit;
$$;

revoke all on function public.pick_multiple_unknown_terms(uuid, int) from public;
grant execute on function public.pick_multiple_unknown_terms(uuid, int) to service_role;

create or replace function public.pick_multiple_known_terms(p_user_id uuid, p_limit int)
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
        select jsonb_agg(
          jsonb_build_object(
            'direction', case when tr.source_term_id = t.id then 'outgoing' else 'incoming' end,
            'relationship_type', tr.relationship_type,
            'related_term_name', case 
              when tr.source_term_id = t.id then t_target.term 
              else t_source.term 
            end,
            'description', tr.description
          )
        )
        from public.term_relationships tr
        left join public.terms t_source on tr.source_term_id = t_source.id
        left join public.terms t_target on tr.target_term_id = t_target.id
        where tr.source_term_id = t.id or tr.target_term_id = t.id
      ),
      '[]'::jsonb
    ) as relationships
  from public.terms t
  join public.domains d on d.id = t.domain_id
  where t.domain_id in (select public.telegram_review_domain_ids(p_user_id))
    and exists (
      select 1
      from public.user_progress up
      where up.user_id = p_user_id
        and up.term_id = t.id
        and up.is_known = true
    )
  order by random()
  limit p_limit;
$$;

revoke all on function public.pick_multiple_known_terms(uuid, int) from public;
grant execute on function public.pick_multiple_known_terms(uuid, int) to service_role;

create or replace function public.count_known_terms(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.terms t
  where t.domain_id in (select public.telegram_review_domain_ids(p_user_id))
    and exists (
      select 1
      from public.user_progress up
      where up.user_id = p_user_id
        and up.term_id = t.id
        and up.is_known = true
    );
$$;

revoke all on function public.count_known_terms(uuid) from public;
grant execute on function public.count_known_terms(uuid) to service_role;
