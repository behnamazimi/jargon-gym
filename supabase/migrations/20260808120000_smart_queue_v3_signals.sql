-- Smart queue v3: split the flat "shown" outcome into seen/read/recalled tiers.
--
-- Today `last_outcome` is the literal last event of ANY kind, so a term rated
-- `learning` in Review loses that signal the moment it's later opened on the
-- jargon page (last_outcome overwritten to `shown`) — same for `solid_cooldown`.
-- `last_recalled_outcome`/`last_recalled_at` fix this: they only move on a
-- tested (Recalled-tier) outcome and survive later passive Seen/Read writes.
--
-- Tiers: seen (incidental, e.g. jargon-page browse) < read (deliberate but
-- untested, e.g. Read CTA / widget Next / Review reveal) < recalled
-- (learning/solid/verified/forgot — an actual tested judgment).

create type public.review_shown_origin as enum ('browse', 'read_cta', 'widget', 'review_reveal');

-- 1. Swap review_outcome: drop 'shown', add 'seen' + 'read'.
create type public.review_outcome_new as enum (
  'unseen', 'seen', 'read', 'learning', 'solid', 'verified', 'forgot'
);

drop function if exists public.my_get_review_candidates(uuid[], text);
drop function if exists public.get_review_candidates(uuid, uuid[], text);
drop function if exists public.my_record_review_outcome(uuid, text, boolean);
drop function if exists public.record_review_outcome(uuid, uuid, text, boolean);

alter table public.review_state
  alter column last_outcome drop default;

alter table public.review_state
  alter column last_outcome type public.review_outcome_new
  using (
    case last_outcome::text
      -- Historical 'shown' rows could have come from Read, browsing, the widget,
      -- or an abandoned Review reveal — we can't know which. 'read' is the safer
      -- over-estimate: it was the dominant shown-writer across surfaces pre-v3.
      when 'shown' then 'read'
      else last_outcome::text
    end
  )::public.review_outcome_new;

alter table public.review_state
  alter column last_outcome set default 'unseen'::public.review_outcome_new;

drop type public.review_outcome;
alter type public.review_outcome_new rename to review_outcome;

comment on column public.review_state.last_outcome is
  'Last event of any tier: unseen (default), seen, read, learning, solid, verified, forgot.';

-- 2. New columns — subset counters + recalled-only history immune to later Seen/Read writes.
alter table public.review_state
  add column read_count int not null default 0 check (read_count >= 0),
  add column recalled_count int not null default 0 check (recalled_count >= 0),
  add column last_recalled_outcome public.review_outcome
    check (last_recalled_outcome is null or last_recalled_outcome in ('learning', 'solid', 'verified', 'forgot')),
  add column last_recalled_at timestamptz,
  add column last_shown_origin public.review_shown_origin;

comment on column public.review_state.read_count is
  'Count of Read-tier writes (deliberate, untested exposure) — subset of seen_count.';
comment on column public.review_state.recalled_count is
  'Count of Recalled-tier writes (tested/judged outcomes) — subset of seen_count.';
comment on column public.review_state.last_recalled_outcome is
  'Last tested/judged outcome (learning/solid/verified/forgot), unaffected by later seen/read writes.';
comment on column public.review_state.last_recalled_at is
  'Timestamp of last_recalled_outcome.';
comment on column public.review_state.last_shown_origin is
  'Origin of the last seen/read write: browse, read_cta, widget, or review_reveal.';

-- 3. Backfill from the only history we have: the current aggregate row.
-- Rows with a real judgment get their recalled fields seeded as a lower bound
-- (we know it happened at least once, not how many times). read_count and
-- last_shown_origin stay at their defaults for pre-existing rows — we have no
-- way to know the historical split, and guessing would be worse than admitting
-- we don't know.
update public.review_state
set recalled_count = 1,
    last_recalled_outcome = last_outcome,
    last_recalled_at = last_seen_at
where last_outcome in ('learning', 'solid', 'verified', 'forgot');

-- 4. record_review_outcome / my_record_review_outcome: thread shown_origin through,
-- keep the new columns in sync alongside the existing seen_count/last_outcome writes.
create or replace function public.record_review_outcome(
  p_user_id uuid,
  p_term_id uuid,
  p_outcome text,
  p_increment_seen boolean default true,
  p_shown_origin text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outcome public.review_outcome;
  v_origin public.review_shown_origin;
  v_is_recalled boolean;
  v_is_light boolean;
begin
  begin
    v_outcome := p_outcome::public.review_outcome;
  exception
    when invalid_text_representation then
      raise exception 'Invalid review outcome: %', p_outcome;
  end;

  v_is_recalled := v_outcome in ('learning', 'solid', 'verified', 'forgot');
  v_is_light := v_outcome in ('seen', 'read');

  if v_is_light then
    if p_shown_origin is null then
      raise exception 'shown_origin required for seen/read outcomes';
    end if;
    begin
      v_origin := p_shown_origin::public.review_shown_origin;
    exception
      when invalid_text_representation then
        raise exception 'Invalid shown origin: %', p_shown_origin;
    end;
  end if;

  if not exists (
    select 1
    from public.terms t
    where t.id = p_term_id
      and t.domain_id in (select public.review_domain_ids(p_user_id))
  ) then
    raise exception 'Term not in review pool';
  end if;

  insert into public.review_state (
    user_id, term_id, seen_count, last_seen_at, last_outcome,
    read_count, recalled_count, last_recalled_outcome, last_recalled_at, last_shown_origin
  )
  values (
    p_user_id,
    p_term_id,
    case when p_increment_seen then 1 else 0 end,
    now(),
    v_outcome,
    case when v_outcome = 'read' then 1 else 0 end,
    case when v_is_recalled then 1 else 0 end,
    case when v_is_recalled then v_outcome else null end,
    case when v_is_recalled then now() else null end,
    v_origin
  )
  on conflict (user_id, term_id) do update
  set
    seen_count = case
      when p_increment_seen then public.review_state.seen_count + 1
      else public.review_state.seen_count
    end,
    last_seen_at = now(),
    last_outcome = v_outcome,
    read_count = public.review_state.read_count
      + case when v_outcome = 'read' then 1 else 0 end,
    recalled_count = public.review_state.recalled_count
      + case when v_is_recalled then 1 else 0 end,
    last_recalled_outcome = case
      when v_is_recalled then v_outcome
      else public.review_state.last_recalled_outcome
    end,
    last_recalled_at = case
      when v_is_recalled then now()
      else public.review_state.last_recalled_at
    end,
    last_shown_origin = case
      when v_is_light then v_origin
      else public.review_state.last_shown_origin
    end;
end;
$$;

revoke all on function public.record_review_outcome(uuid, uuid, text, boolean, text) from public;
grant execute on function public.record_review_outcome(uuid, uuid, text, boolean, text) to service_role;

create or replace function public.my_record_review_outcome(
  p_term_id uuid,
  p_outcome text,
  p_increment_seen boolean default true,
  p_shown_origin text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.record_review_outcome(v_user_id, p_term_id, p_outcome, p_increment_seen, p_shown_origin);
end;
$$;

revoke all on function public.my_record_review_outcome(uuid, text, boolean, text) from public;
grant execute on function public.my_record_review_outcome(uuid, text, boolean, text) to authenticated;

-- 5. get_review_candidates / my_get_review_candidates: expose the new columns to the scorer.
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
  last_outcome public.review_outcome,
  read_count int,
  recalled_count int,
  last_recalled_outcome public.review_outcome,
  last_recalled_at timestamptz,
  last_shown_origin public.review_shown_origin
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
    coalesce(rs.last_outcome, 'unseen'::public.review_outcome),
    coalesce(rs.read_count, 0)::int,
    coalesce(rs.recalled_count, 0)::int,
    rs.last_recalled_outcome,
    rs.last_recalled_at,
    rs.last_shown_origin
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
  last_outcome public.review_outcome,
  read_count int,
  recalled_count int,
  last_recalled_outcome public.review_outcome,
  last_recalled_at timestamptz,
  last_shown_origin public.review_shown_origin
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
    c.term_id,
    c.domain_id,
    c.created_at,
    c.seen_count,
    c.last_seen_at,
    c.last_outcome,
    c.read_count,
    c.recalled_count,
    c.last_recalled_outcome,
    c.last_recalled_at,
    c.last_shown_origin
  from public.get_review_candidates(auth.uid(), p_domain_ids, p_status) as c;
end;
$$;

revoke all on function public.my_get_review_candidates(uuid[], text) from public;
grant execute on function public.my_get_review_candidates(uuid[], text) to authenticated;
