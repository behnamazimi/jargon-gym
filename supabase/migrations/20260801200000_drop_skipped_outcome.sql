-- Remove unused 'skipped' review outcome (Telegram Skip is now a plain Next).

-- 1. Backfill: skipped terms were already delivered as shown on delivery.
update public.review_state
set last_outcome = 'shown'
where last_outcome = 'skipped';

-- 2. Recreate enum without skipped (Postgres cannot drop a single enum value).
create type public.review_outcome_new as enum (
  'unseen',
  'shown',
  'learning',
  'solid',
  'verified',
  'forgot'
);

alter table public.review_state
  alter column last_outcome drop default;

alter table public.review_state
  alter column last_outcome type public.review_outcome_new
  using last_outcome::text::public.review_outcome_new;

alter table public.review_state
  alter column last_outcome set default 'unseen'::public.review_outcome_new;

-- Drop RPCs that expose the old enum in their signature before swapping types.
drop function if exists public.my_get_review_candidates(uuid[], text);
drop function if exists public.get_review_candidates(uuid, uuid[], text);

drop type public.review_outcome;
alter type public.review_outcome_new rename to review_outcome;

comment on column public.review_state.last_outcome is
  'Last event: unseen (default), shown (delivered/revealed), learning, solid, verified, forgot.';

-- 3. Recreate candidate RPCs with the new enum type.
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

-- Refresh record_review_outcome so its declared enum type binds to the renamed type.
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
