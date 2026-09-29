-- Phase 5c, the contract step. The app reads prices from ai_feature_settings
-- and audio from audio_jobs; nothing reads the objects dropped here. No
-- cascade is used anywhere, so a missed dependency fails the migration instead
-- of silently dropping something else. The storage bucket and the clips in it
-- are not touched.

-- ---------------------------------------------------------------------------
-- Safety check: audio_jobs must cover everything in the old tables.
-- ---------------------------------------------------------------------------

do $$
declare
  v_terms integer;
  v_stories integer;
begin
  select count(*) into v_terms
  from public.term_narrations t
  where not exists (
    select 1 from public.audio_jobs j
    where j.subject_type = 'term' and j.subject_id = t.term_id
  );
  select count(*) into v_stories
  from public.stories s
  where s.narration_status <> 'none'
    and not exists (
      select 1 from public.audio_jobs j
      where j.subject_type = 'story' and j.subject_id = s.id
    );
  if v_terms > 0 or v_stories > 0 then
    raise exception
      'audio_jobs is missing % term and % story rows that still exist in the old tables; not dropping them. Run select public.backfill_audio_jobs() and retry.',
      v_terms, v_stories;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Prices live on the feature rows. Admins edit them there (the admin-only
-- update policy and the billable/price checks still apply).
-- ---------------------------------------------------------------------------

grant update (credit_cost) on public.ai_feature_settings to authenticated;

drop trigger if exists ai_credit_settings_sync_feature_costs on public.ai_credit_settings;
drop function if exists public.sync_ai_feature_costs();

-- The balance functions lose the two price columns (a return type change, so
-- drop and create). Everything that calls them reads enabled, total and
-- remaining only. Grants are set again exactly as they were.
drop function if exists public.my_ai_credit_state();
drop function if exists public.ai_credit_balance(uuid);

create function public.ai_credit_balance(p_user_id uuid)
returns table (enabled boolean, total integer, remaining integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.ai_credit_settings;
  v_reset_id bigint;
  v_granted integer;
  v_starter_used integer;
  v_month_spent integer;
begin
  select * into s from public.ai_credit_settings where id;

  select coalesce(max(l.id), 0) into v_reset_id
  from public.ai_credit_ledger l
  where l.user_id = p_user_id and l.kind = 'reset';

  select coalesce(sum(l.amount), 0) into v_granted
  from public.ai_credit_ledger l
  where l.user_id = p_user_id and l.kind = 'grant';

  -- Net spend per UTC month: spends after the last reset that were not refunded.
  with monthly as (
    select
      date_trunc('month', l.created_at at time zone 'utc') as month,
      sum(l.amount)::integer as spent
    from public.ai_credit_ledger l
    where l.user_id = p_user_id
      and l.kind = 'spend'
      and l.id > v_reset_id
      and not exists (
        select 1 from public.ai_credit_ledger r where r.refund_of = l.id
      )
    group by 1
  )
  select
    coalesce(sum(greatest(0, m.spent - s.monthly_refill)), 0),
    coalesce(
      sum(m.spent) filter (
        where m.month = date_trunc('month', now() at time zone 'utc')
      ),
      0
    )
  into v_starter_used, v_month_spent
  from monthly m;

  return query select
    s.enabled,
    s.default_allowance + v_granted + s.monthly_refill,
    greatest(0, s.default_allowance + v_granted - v_starter_used)
      + greatest(0, s.monthly_refill - v_month_spent);
end;
$$;

revoke all on function public.ai_credit_balance(uuid) from public, anon, authenticated;
grant execute on function public.ai_credit_balance(uuid) to service_role;

create function public.my_ai_credit_state()
returns table (enabled boolean, total integer, remaining integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query select * from public.ai_credit_balance(auth.uid());
end;
$$;

revoke all on function public.my_ai_credit_state() from public, anon;
grant execute on function public.my_ai_credit_state() to authenticated;

-- Same return type, so this keeps its grants. The cheapest price now comes
-- from the feature rows.
create or replace function public.admin_ai_credit_summary()
returns table (
  total_users integer,
  users_with_use integer,
  users_exhausted integer,
  users_with_own_key integer,
  credits_spent integer,
  spends_24h integer,
  refunds_24h integer,
  refund_users_24h integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cheapest integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can view AI credit metrics';
  end if;

  select coalesce(min(f.credit_cost), 1)
  into v_cheapest
  from public.ai_feature_settings f
  where f.billable;

  return query
  with kept_spends as (
    select l.user_id, l.amount
    from public.ai_credit_ledger l
    where l.kind = 'spend'
      and not exists (select 1 from public.ai_credit_ledger r where r.refund_of = l.id)
  ),
  users_used as (
    select distinct k.user_id from kept_spends k
  )
  select
    (select count(*) from public.users)::integer,
    (select count(*) from users_used)::integer,
    (
      select count(*)
      from users_used u
      where (select b.remaining from public.ai_credit_balance(u.user_id) b) < v_cheapest
    )::integer,
    (
      select count(*)
      from users_used u
      join public.user_settings s on s.user_id = u.user_id
      where s.api_key_last4 is not null
    )::integer,
    coalesce((select sum(k.amount) from kept_spends k), 0)::integer,
    (
      select count(*) from public.ai_credit_ledger l
      where l.kind = 'spend' and l.created_at > now() - interval '24 hours'
    )::integer,
    (
      select count(*) from public.ai_credit_ledger l
      where l.kind = 'refund' and l.created_at > now() - interval '24 hours'
    )::integer,
    (
      select count(distinct l.user_id) from public.ai_credit_ledger l
      where l.kind = 'refund' and l.created_at > now() - interval '24 hours'
    )::integer;
end;
$$;

alter table public.ai_credit_settings
  drop column quiz_credits_per_question,
  drop column story_credits_per_term;

-- ---------------------------------------------------------------------------
-- The old narration tables and their copy machinery.
-- ---------------------------------------------------------------------------

-- Returns the old table's row type, so it goes before the table.
drop function public.claim_term_narration(uuid, text);

-- Removes their triggers, indexes and policies (the term_narrations policy
-- was the only user of has_narration_access).
drop table public.term_narrations;
drop table public.narration_settings;
drop table public.narration_allowlist;

drop trigger stories_narration_mirror on public.stories;
drop trigger stories_narration_mirror_delete on public.stories;

drop function public.mirror_term_narration();
drop function public.mirror_term_narration_delete();
drop function public.mirror_story_narration();
drop function public.mirror_story_narration_delete();
drop function public.mirror_narration_settings();
drop function public.mirror_narration_allowlist_insert();
drop function public.mirror_narration_allowlist_delete();
drop function public.backfill_audio_jobs();
drop function public.sync_narration_features_from_old_tables();
drop function public.has_narration_access(uuid);

drop index public.stories_user_narration_requested_idx;
alter table public.stories
  drop constraint stories_narration_status_check,
  drop column narration_status,
  drop column narration_path,
  drop column narration_requested_at;
