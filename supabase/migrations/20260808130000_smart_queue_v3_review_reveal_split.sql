-- Smart queue v3 follow-up: split review_reveal out of read_count into its own
-- counter, and drop the review_shown_origin enum entirely.
--
-- Read-tier exposure had two purposes bundled into one counter + an origin tag:
-- "opened via Read/widget" and "opened via a Review reveal, not yet rated" were
-- both just `read_count` increments distinguished only by `last_shown_origin`,
-- which only remembers the MOST RECENT origin (not a count). That's more
-- structure than needed for read_cta vs widget (they mean the same thing:
-- deliberate exposure) and not enough for review_reveal, which is a distinct
-- state worth counting on its own — it's the leading edge of an actual test.
--
-- New: review_reveal_count (subset of seen_count, disjoint from read_count) and
-- last_review_reveal_at (mirrors last_recalled_at's pattern: last time a reveal
-- happened, independent of what happened since). last_shown_origin is dropped —
-- nothing reads it once abandoned_review is redefined below.

-- 1. New columns.
alter table public.review_state
  add column review_reveal_count int not null default 0 check (review_reveal_count >= 0),
  add column last_review_reveal_at timestamptz;

comment on column public.review_state.review_reveal_count is
  'Count of Review-reveal writes (outcome=read, is_review_reveal=true) — subset of seen_count, disjoint from read_count.';
comment on column public.review_state.last_review_reveal_at is
  'Timestamp of the last review-reveal write. Equal to last_seen_at iff the most recent event of any kind was a reveal — that equality is what abandoned_review checks.';

-- 2. Backfill: rows whose last recorded origin was specifically a review reveal
-- get last_review_reveal_at seeded from last_seen_at (we know THAT particular
-- most-recent event was a reveal). review_reveal_count stays 0 for every
-- pre-existing row — read_count already holds the historical combined total
-- and there's no way to retroactively split how much of it was reveals vs
-- plain reads/widget-next; guessing would be worse than admitting we don't
-- know, same reasoning as the original v3 backfill.
update public.review_state
set last_review_reveal_at = last_seen_at
where last_shown_origin = 'review_reveal';

-- 3. record_review_outcome / my_record_review_outcome: replace p_shown_origin
-- with p_is_review_reveal. Only meaningful when p_outcome = 'read': true routes
-- the increment to review_reveal_count + last_review_reveal_at, false (default)
-- routes it to read_count. Ignored for 'seen' (always browse, no distinction
-- needed) and for Recalled outcomes.
drop function if exists public.my_record_review_outcome(uuid, text, boolean, text);
drop function if exists public.record_review_outcome(uuid, uuid, text, boolean, text);

create or replace function public.record_review_outcome(
  p_user_id uuid,
  p_term_id uuid,
  p_outcome text,
  p_increment_seen boolean default true,
  p_is_review_reveal boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outcome public.review_outcome;
  v_is_recalled boolean;
begin
  begin
    v_outcome := p_outcome::public.review_outcome;
  exception
    when invalid_text_representation then
      raise exception 'Invalid review outcome: %', p_outcome;
  end;

  v_is_recalled := v_outcome in ('learning', 'solid', 'verified', 'forgot');

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
    read_count, review_reveal_count, recalled_count,
    last_recalled_outcome, last_recalled_at, last_review_reveal_at,
    fail_streak
  )
  values (
    p_user_id,
    p_term_id,
    case when p_increment_seen then 1 else 0 end,
    now(),
    v_outcome,
    case when v_outcome = 'read' and not p_is_review_reveal then 1 else 0 end,
    case when v_outcome = 'read' and p_is_review_reveal then 1 else 0 end,
    case when v_is_recalled then 1 else 0 end,
    case when v_is_recalled then v_outcome else null end,
    case when v_is_recalled then now() else null end,
    case when v_outcome = 'read' and p_is_review_reveal then now() else null end,
    case when v_outcome in ('learning', 'forgot') then 1 else 0 end
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
      + case when v_outcome = 'read' and not p_is_review_reveal then 1 else 0 end,
    review_reveal_count = public.review_state.review_reveal_count
      + case when v_outcome = 'read' and p_is_review_reveal then 1 else 0 end,
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
    last_review_reveal_at = case
      when v_outcome = 'read' and p_is_review_reveal then now()
      else public.review_state.last_review_reveal_at
    end,
    fail_streak = case
      when v_outcome in ('learning', 'forgot') then public.review_state.fail_streak + 1
      when v_outcome in ('solid', 'verified') then 0
      else public.review_state.fail_streak
    end;
end;
$$;

revoke all on function public.record_review_outcome(uuid, uuid, text, boolean, boolean) from public;
grant execute on function public.record_review_outcome(uuid, uuid, text, boolean, boolean) to service_role;

create or replace function public.my_record_review_outcome(
  p_term_id uuid,
  p_outcome text,
  p_increment_seen boolean default true,
  p_is_review_reveal boolean default false
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

  perform public.record_review_outcome(v_user_id, p_term_id, p_outcome, p_increment_seen, p_is_review_reveal);
end;
$$;

revoke all on function public.my_record_review_outcome(uuid, text, boolean, boolean) from public;
grant execute on function public.my_record_review_outcome(uuid, text, boolean, boolean) to authenticated;

-- 4. get_review_candidates / my_get_review_candidates: swap last_shown_origin
-- for review_reveal_count + last_review_reveal_at.
drop function if exists public.my_get_review_candidates(uuid[], text);
drop function if exists public.get_review_candidates(uuid, uuid[], text);

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
  review_reveal_count int,
  recalled_count int,
  last_recalled_outcome public.review_outcome,
  last_recalled_at timestamptz,
  last_review_reveal_at timestamptz,
  fail_streak int
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
    coalesce(rs.review_reveal_count, 0)::int,
    coalesce(rs.recalled_count, 0)::int,
    rs.last_recalled_outcome,
    rs.last_recalled_at,
    rs.last_review_reveal_at,
    coalesce(rs.fail_streak, 0)::int
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
  review_reveal_count int,
  recalled_count int,
  last_recalled_outcome public.review_outcome,
  last_recalled_at timestamptz,
  last_review_reveal_at timestamptz,
  fail_streak int
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
    c.review_reveal_count,
    c.recalled_count,
    c.last_recalled_outcome,
    c.last_recalled_at,
    c.last_review_reveal_at,
    c.fail_streak
  from public.get_review_candidates(auth.uid(), p_domain_ids, p_status) as c;
end;
$$;

revoke all on function public.my_get_review_candidates(uuid[], text) from public;
grant execute on function public.my_get_review_candidates(uuid[], text) to authenticated;

-- 5. Drop last_shown_origin and the review_shown_origin enum — nothing reads
-- them once abandoned_review moves to comparing last_review_reveal_at against
-- last_seen_at.
alter table public.review_state drop column last_shown_origin;
drop type public.review_shown_origin;
