-- Unfinished terms: a term needs only its name. Category and definition become
-- optional. A term with no definition is "unfinished": it stays out of every
-- study and delivery surface until it has one.
-- @see docs/trace.md

-- ---------------------------------------------------------------------------
-- 1. Nullable columns. null is the one representation of "none".
-- ---------------------------------------------------------------------------

alter table public.terms
  alter column category drop not null,
  alter column definition drop not null;

update public.terms set category = null where btrim(category) = '';
update public.terms set definition = null where btrim(definition) = '';

alter table public.terms
  add constraint terms_category_not_blank check (category is null or btrim(category) <> ''),
  add constraint terms_definition_not_blank check (definition is null or btrim(definition) <> '');

-- ---------------------------------------------------------------------------
-- 2. A finished term never goes back. Every review_state row therefore always
--    belongs to a finished term.
-- ---------------------------------------------------------------------------

create function public.terms_keep_definition()
returns trigger
language plpgsql
as $$
begin
  if old.definition is not null and new.definition is null then
    raise exception 'A term needs a definition once it has one.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger terms_keep_definition
  before update of definition on public.terms
  for each row execute function public.terms_keep_definition();

create index terms_unfinished_idx on public.terms (domain_id) where definition is null;

-- ---------------------------------------------------------------------------
-- 3. RLS: only the owner sees their unfinished terms. Other readers, shared
--    viewers and the public site never do.
-- ---------------------------------------------------------------------------

drop policy "Users read visible terms" on public.terms;
create policy "Users read visible terms"
  on public.terms for select
  to authenticated
  using (
    public.can_read_domain(domain_id)
    and (definition is not null or public.owns_domain(domain_id))
  );

drop policy "Anyone can read public terms" on public.terms;
create policy "Anyone can read public terms"
  on public.terms for select
  to anon
  using (
    terms.definition is not null
    and exists (
      select 1 from public.domains d
      where d.id = terms.domain_id and d.is_public = true
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Functions that read terms around RLS (security definer / service role).
--    Same signatures, so create or replace.
-- ---------------------------------------------------------------------------

create or replace function public.get_trace_candidates(
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
  where t.domain_id = any(v_domains)
    and t.definition is not null;
end;
$$;

create or replace function public.progress_state_by_domain(p_user_id uuid, p_domain_ids uuid[])
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
  where t.domain_id = any(p_domain_ids)
    and t.definition is not null;
$$;

-- Relationships never expose an unfinished term's name to someone who can't
-- see that term.
create or replace function public.my_term_relationships_by_domain(p_domain_id uuid)
returns table (
  id uuid,
  relationship_type text,
  description text,
  source_term_id uuid,
  target_term_id uuid,
  source_term_name text,
  target_term_name text
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

  return query
  select
    tr.id,
    tr.relationship_type,
    tr.description,
    tr.source_term_id,
    tr.target_term_id,
    s.term as source_term_name,
    t.term as target_term_name
  from public.term_relationships tr
  join public.terms s on s.id = tr.source_term_id
  join public.terms t on t.id = tr.target_term_id
  where (s.domain_id = p_domain_id or t.domain_id = p_domain_id)
    and (s.definition is not null or public.owns_domain(s.domain_id))
    and (t.definition is not null or public.owns_domain(t.domain_id));
end;
$$;

create or replace function public.get_term_card(p_user_id uuid, p_term_id uuid)
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
  where t.id = p_term_id
    and t.definition is not null
    and t.domain_id in (select public.review_domain_ids(p_user_id))
  limit 1;
$$;

create or replace function public.get_term_cards(p_user_id uuid, p_term_ids uuid[])
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

-- ---------------------------------------------------------------------------
-- 5. Unfinished counts per collection. Security invoker: RLS limits the rows
--    to terms the caller may read, so only owners get a non-zero count.
-- ---------------------------------------------------------------------------

create function public.my_unfinished_term_counts(p_domain_ids uuid[])
returns table (domain_id uuid, unfinished_count int)
language sql
stable
security invoker
set search_path = public
as $$
  select t.domain_id, count(*)::int
  from public.terms t
  where t.domain_id = any(p_domain_ids)
    and t.definition is null
  group by t.domain_id;
$$;

revoke all on function public.my_unfinished_term_counts(uuid[]) from public, anon;
grant execute on function public.my_unfinished_term_counts(uuid[]) to authenticated;
