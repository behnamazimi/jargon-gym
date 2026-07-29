-- Domain-scoped quiz term picking and Telegram quiz setup wizard state.

alter table public.telegram_links
  add column if not exists quiz_setup jsonb;

comment on column public.telegram_links.quiz_setup is
  'In-progress /quiz setup wizard state. Null when not configuring a quiz.';

drop function if exists public.pick_multiple_unknown_terms(uuid, int);
drop function if exists public.pick_multiple_known_terms(uuid, int);

-- Replace pick/count RPCs with optional domain filter (null/empty = all active collections).

create or replace function public.pick_multiple_unknown_terms(
  p_user_id uuid,
  p_limit int,
  p_domain_ids uuid[] default null
)
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
    and (
      p_domain_ids is null
      or cardinality(p_domain_ids) = 0
      or t.domain_id = any(p_domain_ids)
    )
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

revoke all on function public.pick_multiple_unknown_terms(uuid, int, uuid[]) from public;
grant execute on function public.pick_multiple_unknown_terms(uuid, int, uuid[]) to service_role;

create or replace function public.pick_multiple_known_terms(
  p_user_id uuid,
  p_limit int,
  p_domain_ids uuid[] default null
)
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
    and (
      p_domain_ids is null
      or cardinality(p_domain_ids) = 0
      or t.domain_id = any(p_domain_ids)
    )
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

revoke all on function public.pick_multiple_known_terms(uuid, int, uuid[]) from public;
grant execute on function public.pick_multiple_known_terms(uuid, int, uuid[]) to service_role;

create or replace function public.count_unknown_terms(
  p_user_id uuid,
  p_domain_ids uuid[] default null
)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.terms t
  where t.domain_id in (select public.telegram_review_domain_ids(p_user_id))
    and (
      p_domain_ids is null
      or cardinality(p_domain_ids) = 0
      or t.domain_id = any(p_domain_ids)
    )
    and not exists (
      select 1
      from public.user_progress up
      where up.user_id = p_user_id
        and up.term_id = t.id
        and up.is_known = true
    );
$$;

revoke all on function public.count_unknown_terms(uuid, uuid[]) from public;
grant execute on function public.count_unknown_terms(uuid, uuid[]) to service_role;

create or replace function public.count_known_terms(
  p_user_id uuid,
  p_domain_ids uuid[] default null
)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.terms t
  where t.domain_id in (select public.telegram_review_domain_ids(p_user_id))
    and (
      p_domain_ids is null
      or cardinality(p_domain_ids) = 0
      or t.domain_id = any(p_domain_ids)
    )
    and exists (
      select 1
      from public.user_progress up
      where up.user_id = p_user_id
        and up.term_id = t.id
        and up.is_known = true
    );
$$;

revoke all on function public.count_known_terms(uuid, uuid[]) from public;
grant execute on function public.count_known_terms(uuid, uuid[]) to service_role;

-- Keep single-arg overloads for existing callers.
create or replace function public.count_unknown_terms(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select public.count_unknown_terms(p_user_id, null::uuid[]);
$$;

revoke all on function public.count_unknown_terms(uuid) from public;
grant execute on function public.count_unknown_terms(uuid) to service_role;

create or replace function public.count_known_terms(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select public.count_known_terms(p_user_id, null::uuid[]);
$$;

revoke all on function public.count_known_terms(uuid) from public;
grant execute on function public.count_known_terms(uuid) to service_role;
