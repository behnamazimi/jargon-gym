-- Schema cleanup: drop dead columns/RPCs, rename review-pool helper,
-- tighten RLS, add candidate RPC, convert constrained text to enums.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

create type public.review_outcome as enum (
  'unseen',
  'shown',
  'learning',
  'solid',
  'skipped',
  'verified',
  'forgot'
);

create type public.review_preset as enum (
  'balanced',
  'learn_new',
  'drill_weak'
);

-- ---------------------------------------------------------------------------
-- 2. Drop deprecated pick/count RPCs (before rename; they embed old name)
-- ---------------------------------------------------------------------------

drop function if exists public.pick_random_unknown_term(uuid);
drop function if exists public.pick_multiple_unknown_terms(uuid, int, uuid[]);
drop function if exists public.pick_multiple_known_terms(uuid, int, uuid[]);
drop function if exists public.count_unknown_terms(uuid);
drop function if exists public.count_unknown_terms(uuid, uuid[]);
drop function if exists public.count_known_terms(uuid);
drop function if exists public.count_known_terms(uuid, uuid[]);

-- ---------------------------------------------------------------------------
-- 3. Rename telegram_review_domain_ids → review_domain_ids
-- ---------------------------------------------------------------------------

alter function public.telegram_review_domain_ids(uuid)
  rename to review_domain_ids;

comment on function public.review_domain_ids(uuid) is
  'Domain ids in the user review pool (owned active + collection active).';

revoke all on function public.review_domain_ids(uuid) from public;
grant execute on function public.review_domain_ids(uuid) to service_role;

create or replace function public.my_review_domain_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.review_domain_ids(auth.uid());
$$;

revoke all on function public.my_review_domain_ids() from public;
grant execute on function public.my_review_domain_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Drop is_known (row presence = known)
-- ---------------------------------------------------------------------------

delete from public.user_progress where is_known = false;

alter table public.user_progress drop column is_known;

-- ---------------------------------------------------------------------------
-- 5. Convert constrained text columns to enums
-- ---------------------------------------------------------------------------

alter table public.review_state
  drop constraint if exists review_state_last_outcome_check;

alter table public.review_state
  alter column last_outcome drop default,
  alter column last_outcome type public.review_outcome
    using last_outcome::public.review_outcome,
  alter column last_outcome set default 'unseen'::public.review_outcome;

alter table public.user_settings
  drop constraint if exists user_settings_review_preset_check;

alter table public.user_settings
  alter column review_preset drop default,
  alter column review_preset type public.review_preset
    using review_preset::public.review_preset,
  alter column review_preset set default 'balanced'::public.review_preset;

alter table public.user_settings
  drop constraint if exists user_settings_llm_pair_check;

alter table public.user_settings
  add constraint user_settings_llm_pair_check check (
    (
      provider is null
      and api_key_encrypted is null
      and api_key_last4 is null
    )
    or (
      provider is not null
      and api_key_encrypted is not null
      and api_key_last4 is not null
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Recreate dependent RPCs (review_domain_ids + existence-based known)
-- ---------------------------------------------------------------------------

create or replace function public.mark_term_known(p_user_id uuid, p_term_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.terms t
    where t.id = p_term_id
      and t.domain_id in (select public.review_domain_ids(p_user_id))
  ) then
    raise exception 'Term not in review pool';
  end if;

  insert into public.user_progress (user_id, term_id)
  values (p_user_id, p_term_id)
  on conflict (user_id, term_id) do nothing;

  update public.telegram_links
  set all_caught_up_at = null, updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.mark_term_known(uuid, uuid) from public;
grant execute on function public.mark_term_known(uuid, uuid) to service_role;

create or replace function public.clear_term_known(p_user_id uuid, p_term_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.terms t
    where t.id = p_term_id
      and t.domain_id in (select public.review_domain_ids(p_user_id))
  ) then
    raise exception 'Term not in review pool';
  end if;

  delete from public.user_progress
  where user_id = p_user_id
    and term_id = p_term_id;
end;
$$;

revoke all on function public.clear_term_known(uuid, uuid) from public;
grant execute on function public.clear_term_known(uuid, uuid) to service_role;

create or replace function public.record_review_outcome(
  p_user_id uuid,
  p_term_id uuid,
  p_outcome text,
  p_increment_seen boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outcome public.review_outcome;
begin
  begin
    v_outcome := p_outcome::public.review_outcome;
  exception
    when invalid_text_representation then
      raise exception 'Invalid review outcome: %', p_outcome;
  end;

  if not exists (
    select 1
    from public.terms t
    where t.id = p_term_id
      and t.domain_id in (select public.review_domain_ids(p_user_id))
  ) then
    raise exception 'Term not in review pool';
  end if;

  insert into public.review_state (user_id, term_id, seen_count, last_seen_at, last_outcome)
  values (
    p_user_id,
    p_term_id,
    case when p_increment_seen then 1 else 0 end,
    case when p_increment_seen then now() else null end,
    v_outcome
  )
  on conflict (user_id, term_id) do update
  set
    seen_count = case
      when p_increment_seen then public.review_state.seen_count + 1
      else public.review_state.seen_count
    end,
    last_seen_at = case
      when p_increment_seen then now()
      else public.review_state.last_seen_at
    end,
    last_outcome = v_outcome;
end;
$$;

revoke all on function public.record_review_outcome(uuid, uuid, text, boolean) from public;
grant execute on function public.record_review_outcome(uuid, uuid, text, boolean) to service_role;

create or replace function public.get_term_card(p_user_id uuid, p_term_id uuid)
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
  where t.id = p_term_id
    and t.domain_id in (select public.review_domain_ids(p_user_id))
  limit 1;
$$;

revoke all on function public.get_term_card(uuid, uuid) from public;
grant execute on function public.get_term_card(uuid, uuid) to service_role;

-- Reset progress for all terms in a domain (replaces direct client deletes under SELECT-only RLS).
create or replace function public.reset_domain_progress(p_user_id uuid, p_domain_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term_ids uuid[];
begin
  if not exists (
    select 1 from public.domains d
    where d.id = p_domain_id and d.owner_id = p_user_id
  ) and not exists (
    select 1 from public.user_collection_domains ucd
    where ucd.domain_id = p_domain_id and ucd.user_id = p_user_id
  ) then
    raise exception 'Domain not in user collection';
  end if;

  select coalesce(array_agg(t.id), '{}'::uuid[])
  into v_term_ids
  from public.terms t
  where t.domain_id = p_domain_id;

  if cardinality(v_term_ids) = 0 then
    return;
  end if;

  delete from public.user_progress
  where user_id = p_user_id
    and term_id = any(v_term_ids);

  delete from public.review_state
  where user_id = p_user_id
    and term_id = any(v_term_ids);
end;
$$;

revoke all on function public.reset_domain_progress(uuid, uuid) from public;
grant execute on function public.reset_domain_progress(uuid, uuid) to service_role;

create or replace function public.my_reset_domain_progress(p_domain_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  perform public.reset_domain_progress(auth.uid(), p_domain_id);
end;
$$;

revoke all on function public.my_reset_domain_progress(uuid) from public;
grant execute on function public.my_reset_domain_progress(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Drop dead columns
-- ---------------------------------------------------------------------------

alter table public.domains drop column if exists icon_url;
alter table public.terms drop column if exists created_by;
alter table public.term_relationships drop column if exists created_by;
alter table public.user_collection_domains drop column if exists added_at;

-- ---------------------------------------------------------------------------
-- 8. Candidate-fetch RPC for smart queue
-- ---------------------------------------------------------------------------

create or replace function public.get_review_candidates(
  p_user_id uuid,
  p_domain_ids uuid[] default null,
  p_status text default 'unknown'
)
returns table (
  term_id uuid,
  domain_id uuid,
  created_at timestamptz,
  seen_count int,
  last_seen_at timestamptz,
  last_outcome public.review_outcome
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_domains uuid[];
begin
  if p_status not in ('known', 'unknown') then
    raise exception 'Invalid status: %', p_status;
  end if;

  -- Use a distinct column alias: OUT params (term_id/domain_id/…) shadow bare names in plpgsql.
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
    coalesce(rs.seen_count, 0)::int,
    rs.last_seen_at,
    coalesce(rs.last_outcome, 'unseen'::public.review_outcome)
  from public.terms t
  left join public.review_state rs
    on rs.term_id = t.id
   and rs.user_id = p_user_id
  where t.domain_id = any(v_domains)
    and (
      (p_status = 'known' and exists (
        select 1 from public.user_progress up
        where up.user_id = p_user_id and up.term_id = t.id
      ))
      or
      (p_status = 'unknown' and not exists (
        select 1 from public.user_progress up
        where up.user_id = p_user_id and up.term_id = t.id
      ))
    );
end;
$$;

revoke all on function public.get_review_candidates(uuid, uuid[], text) from public;
grant execute on function public.get_review_candidates(uuid, uuid[], text) to service_role;

create or replace function public.my_get_review_candidates(
  p_domain_ids uuid[] default null,
  p_status text default 'unknown'
)
returns table (
  term_id uuid,
  domain_id uuid,
  created_at timestamptz,
  seen_count int,
  last_seen_at timestamptz,
  last_outcome public.review_outcome
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

  -- Qualify columns via table alias so OUT params are not selected as NULLs.
  return query
  select
    c.term_id,
    c.domain_id,
    c.created_at,
    c.seen_count,
    c.last_seen_at,
    c.last_outcome
  from public.get_review_candidates(auth.uid(), p_domain_ids, p_status) as c;
end;
$$;

revoke all on function public.my_get_review_candidates(uuid[], text) from public;
grant execute on function public.my_get_review_candidates(uuid[], text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. RLS hardening: authenticated SELECT-only on progress/review_state
-- ---------------------------------------------------------------------------

drop policy if exists "Users insert own progress in review pool" on public.user_progress;
drop policy if exists "Users update own progress in review pool" on public.user_progress;
drop policy if exists "Users delete own progress in review pool" on public.user_progress;

revoke insert, update, delete on public.user_progress from authenticated;
grant select on public.user_progress to authenticated;

drop policy if exists "Users manage own review state" on public.review_state;

create policy "Users read own review state"
  on public.review_state for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.review_state from authenticated;
grant select on public.review_state to authenticated;

grant select, insert, update, delete on public.user_progress to service_role;
grant select, insert, update, delete on public.review_state to service_role;

-- ---------------------------------------------------------------------------
-- 10. Indexes + cosmetic FK renames
-- ---------------------------------------------------------------------------

create index if not exists term_relationships_source_term_id_idx
  on public.term_relationships (source_term_id);

create index if not exists term_relationships_target_term_id_idx
  on public.term_relationships (target_term_id);

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'domains_created_by_fkey'
      and conrelid = 'public.domains'::regclass
  ) then
    alter table public.domains
      rename constraint domains_created_by_fkey to domains_owner_id_fkey;
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'user_llm_settings_user_id_fkey'
      and conrelid = 'public.user_settings'::regclass
  ) then
    alter table public.user_settings
      rename constraint user_llm_settings_user_id_fkey to user_settings_user_id_fkey;
  end if;
end $$;
