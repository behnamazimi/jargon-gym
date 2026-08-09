-- Smart queue v4: split Review and Quiz into independent histories, drop the
-- Seen tier entirely, add directional fail propagation, drop presets.
--
-- Why: review_outcome's 4 "recalled" values (learning/solid/verified/forgot)
-- only ever encoded two independent things bolted together — pass/fail, and
-- known/unknown pool status (already tracked separately in user_progress).
-- Worse, Quiz (graded recognition, guessable — MCQ/true-false has a guess
-- floor) and Review (self-graded recall, not guessable) shared that same
-- outcome history, so a lucky quiz guess could trigger the 72h solid-cooldown
-- and suppress Review priority for a term never actually recalled unprompted.
--
-- New model: two independent test histories (review_streak / quiz_streak,
-- signed — positive run of passes, negative run of fails, replacing both
-- last_recalled_outcome and fail_streak in one field), plus directional fail
-- propagation — failing either test boosts Read priority and the *other*
-- test's priority (never the one that just failed; its own streak already
-- covers that), since a fail is strong evidence (can't happen by lucky
-- guessing) but a pass is not (guessable), so only fails cross over.
--
-- The Seen tier (widget rotation, quiz-question-appearing, jargon-page
-- toggle) is dropped from scoring entirely — those are pool-flip or pure-UI
-- concerns now, not study signals. seen_count and its penalty go with it.

-- 1. New enums.
create type public.review_event as enum (
  'read', 'reveal', 'review_pass', 'review_fail', 'quiz_pass', 'quiz_fail'
);

create type public.review_fail_source as enum ('review', 'quiz');

-- 2. New columns on review_state (additive).
alter table public.review_state
  add column new_read_count int not null default 0 check (new_read_count >= 0),
  add column new_last_read_at timestamptz,
  add column review_recall_count int not null default 0 check (review_recall_count >= 0),
  add column last_review_recall_at timestamptz,
  add column review_streak int not null default 0,
  add column quiz_test_count int not null default 0 check (quiz_test_count >= 0),
  add column last_quiz_tested_at timestamptz,
  add column quiz_streak int not null default 0,
  add column pending_reveal boolean not null default false,
  add column last_fail_at timestamptz,
  add column last_fail_source public.review_fail_source;

comment on column public.review_state.new_last_read_at is
  'Read tier: Read page/command, /read, jargon card open. Renamed to last_read_at after old last_seen_at is dropped.';
comment on column public.review_state.review_recall_count is
  'Count of Review ratings (reveal-then-rate). Independent of quiz_test_count.';
comment on column public.review_state.review_streak is
  'Signed: positive = consecutive Review passes, negative = consecutive Review fails, 0 = never tested. Replaces last_recalled_outcome + fail_streak for the Review activity.';
comment on column public.review_state.quiz_test_count is
  'Count of quiz answers. Independent of review_recall_count.';
comment on column public.review_state.quiz_streak is
  'Signed, same convention as review_streak, scoped to Quiz.';
comment on column public.review_state.pending_reveal is
  'Review-only: true once revealed, cleared on rating. Replaces the last_review_reveal_at = last_seen_at equality check.';
comment on column public.review_state.last_fail_at is
  'Most recent fail from either activity (Review or Quiz) — drives cross-activity fail propagation. Cleared on next Read or any pass.';
comment on column public.review_state.last_fail_source is
  'Which activity produced last_fail_at — the OTHER activity is the one that gets boosted, not this one (its own streak already reflects the fail).';

-- 3. Backfill from the old columns, one-time best-effort approximation
-- (single-user app, forward-looking signal — not a ledger). Quiz history
-- can't be retroactively split out of the old combined recalled_count, so it
-- starts at 0 and will populate honestly from the next quiz.
update public.review_state
set new_read_count = read_count,
    new_last_read_at = case when last_outcome = 'read' then last_seen_at else null end,
    review_recall_count = recalled_count,
    last_review_recall_at = last_recalled_at,
    review_streak = case
      when last_recalled_outcome in ('learning', 'forgot') then -greatest(fail_streak, 1)
      when last_recalled_outcome in ('solid', 'verified') then 1
      else 0
    end,
    pending_reveal = (
      last_outcome = 'read'
      and last_review_reveal_at is not null
      and last_review_reveal_at = last_seen_at
    );

-- 4. Drop old columns + the outcome enum they depended on.
alter table public.review_state
  drop column seen_count,
  drop column last_seen_at,
  drop column last_outcome,
  drop column read_count,
  drop column recalled_count,
  drop column last_recalled_outcome,
  drop column last_recalled_at,
  drop column review_reveal_count,
  drop column last_review_reveal_at,
  drop column fail_streak;

alter table public.review_state rename column new_read_count to read_count;
alter table public.review_state rename column new_last_read_at to last_read_at;

comment on column public.review_state.read_count is
  'Read tier: Read page/command, /read, jargon card open.';

-- 5. Drop the old write/read RPCs (they reference review_outcome) before the
-- enum itself, then recreate everything against the new shape.
drop function if exists public.my_record_review_outcome(uuid, text, boolean, boolean);
drop function if exists public.record_review_outcome(uuid, uuid, text, boolean, boolean);
drop function if exists public.my_get_review_candidates(uuid[], text);
drop function if exists public.get_review_candidates(uuid, uuid[], text);

drop type public.review_outcome;

create or replace function public.record_review_event(
  p_user_id uuid,
  p_term_id uuid,
  p_event public.review_event
)
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

  insert into public.review_state (
    user_id, term_id, read_count, last_read_at,
    review_recall_count, last_review_recall_at, review_streak, pending_reveal,
    quiz_test_count, last_quiz_tested_at, quiz_streak,
    last_fail_at, last_fail_source
  )
  values (
    p_user_id,
    p_term_id,
    case when p_event = 'read' then 1 else 0 end,
    case when p_event = 'read' then now() else null end,
    case when p_event in ('review_pass', 'review_fail') then 1 else 0 end,
    case when p_event in ('review_pass', 'review_fail') then now() else null end,
    case
      when p_event = 'review_pass' then 1
      when p_event = 'review_fail' then -1
      else 0
    end,
    p_event = 'reveal',
    case when p_event in ('quiz_pass', 'quiz_fail') then 1 else 0 end,
    case when p_event in ('quiz_pass', 'quiz_fail') then now() else null end,
    case
      when p_event = 'quiz_pass' then 1
      when p_event = 'quiz_fail' then -1
      else 0
    end,
    case when p_event in ('review_fail', 'quiz_fail') then now() else null end,
    case
      when p_event = 'review_fail' then 'review'::public.review_fail_source
      when p_event = 'quiz_fail' then 'quiz'::public.review_fail_source
      else null
    end
  )
  on conflict (user_id, term_id) do update
  set
    read_count = public.review_state.read_count
      + case when p_event = 'read' then 1 else 0 end,
    last_read_at = case
      when p_event = 'read' then now()
      else public.review_state.last_read_at
    end,
    review_recall_count = public.review_state.review_recall_count
      + case when p_event in ('review_pass', 'review_fail') then 1 else 0 end,
    last_review_recall_at = case
      when p_event in ('review_pass', 'review_fail') then now()
      else public.review_state.last_review_recall_at
    end,
    review_streak = case
      when p_event = 'review_pass' then greatest(public.review_state.review_streak, 0) + 1
      when p_event = 'review_fail' then least(public.review_state.review_streak, 0) - 1
      else public.review_state.review_streak
    end,
    pending_reveal = case
      when p_event = 'reveal' then true
      when p_event in ('review_pass', 'review_fail') then false
      else public.review_state.pending_reveal
    end,
    quiz_test_count = public.review_state.quiz_test_count
      + case when p_event in ('quiz_pass', 'quiz_fail') then 1 else 0 end,
    last_quiz_tested_at = case
      when p_event in ('quiz_pass', 'quiz_fail') then now()
      else public.review_state.last_quiz_tested_at
    end,
    quiz_streak = case
      when p_event = 'quiz_pass' then greatest(public.review_state.quiz_streak, 0) + 1
      when p_event = 'quiz_fail' then least(public.review_state.quiz_streak, 0) - 1
      else public.review_state.quiz_streak
    end,
    last_fail_at = case
      when p_event in ('review_fail', 'quiz_fail') then now()
      when p_event in ('read', 'review_pass', 'quiz_pass') then null
      else public.review_state.last_fail_at
    end,
    last_fail_source = case
      when p_event = 'review_fail' then 'review'::public.review_fail_source
      when p_event = 'quiz_fail' then 'quiz'::public.review_fail_source
      when p_event in ('read', 'review_pass', 'quiz_pass') then null
      else public.review_state.last_fail_source
    end;
end;
$$;

revoke all on function public.record_review_event(uuid, uuid, public.review_event) from public;
grant execute on function public.record_review_event(uuid, uuid, public.review_event) to service_role;

create or replace function public.my_record_review_event(
  p_term_id uuid,
  p_event public.review_event
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

  perform public.record_review_event(v_user_id, p_term_id, p_event);
end;
$$;

revoke all on function public.my_record_review_event(uuid, public.review_event) from public;
grant execute on function public.my_record_review_event(uuid, public.review_event) to authenticated;

create or replace function public.get_review_candidates(
  p_user_id uuid,
  p_domain_ids uuid[] default null,
  p_status text default 'unknown'
)
returns table (
  term_id uuid,
  domain_id uuid,
  created_at timestamptz,
  read_count int,
  last_read_at timestamptz,
  review_recall_count int,
  last_review_recall_at timestamptz,
  review_streak int,
  quiz_test_count int,
  last_quiz_tested_at timestamptz,
  quiz_streak int,
  pending_reveal boolean,
  last_fail_at timestamptz,
  last_fail_source public.review_fail_source
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
    coalesce(rs.read_count, 0)::int,
    rs.last_read_at,
    coalesce(rs.review_recall_count, 0)::int,
    rs.last_review_recall_at,
    coalesce(rs.review_streak, 0)::int,
    coalesce(rs.quiz_test_count, 0)::int,
    rs.last_quiz_tested_at,
    coalesce(rs.quiz_streak, 0)::int,
    coalesce(rs.pending_reveal, false),
    rs.last_fail_at,
    rs.last_fail_source
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
  read_count int,
  last_read_at timestamptz,
  review_recall_count int,
  last_review_recall_at timestamptz,
  review_streak int,
  quiz_test_count int,
  last_quiz_tested_at timestamptz,
  quiz_streak int,
  pending_reveal boolean,
  last_fail_at timestamptz,
  last_fail_source public.review_fail_source
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
    c.read_count,
    c.last_read_at,
    c.review_recall_count,
    c.last_review_recall_at,
    c.review_streak,
    c.quiz_test_count,
    c.last_quiz_tested_at,
    c.quiz_streak,
    c.pending_reveal,
    c.last_fail_at,
    c.last_fail_source
  from public.get_review_candidates(auth.uid(), p_domain_ids, p_status) as c;
end;
$$;

revoke all on function public.my_get_review_candidates(uuid[], text) from public;
grant execute on function public.my_get_review_candidates(uuid[], text) to authenticated;

-- 6. Drop presets — single fixed weight set lives in application code now,
-- since this is a single-user app and per-user preset selection added a
-- dimension nobody was using to differentiate users.
alter table public.user_settings drop column review_preset;
drop type public.review_preset;
