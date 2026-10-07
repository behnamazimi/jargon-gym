-- Users can no longer bring their own AI key, so the key columns and everything
-- that read them go. Credits are the only way to use AI, and a user who runs
-- out can top up. The top-up is free for now; a payment step will replace it.
-- To undo: re-add the three columns and the user_settings_llm_pair_check
-- constraint from 20260801170000_schema_cleanup.sql. Keys already dropped are
-- gone for good.

-- ---------------------------------------------------------------------------
-- Drop the saved keys.
-- ---------------------------------------------------------------------------

drop function public.admin_remove_user_api_key(uuid, text);

alter table public.user_settings
  drop constraint if exists user_settings_llm_pair_check,
  drop column provider,
  drop column api_key_encrypted,
  drop column api_key_last4;

-- ---------------------------------------------------------------------------
-- Admin functions that returned or read the key.
-- ---------------------------------------------------------------------------

drop function public.admin_ai_credit_summary();

create function public.admin_ai_credit_summary()
returns table (
  total_users integer,
  users_with_use integer,
  users_exhausted integer,
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

revoke all on function public.admin_ai_credit_summary() from public, anon;
grant execute on function public.admin_ai_credit_summary() to authenticated;

drop function public.admin_person_detail(uuid);

create function public.admin_person_detail(p_user_id uuid)
returns table (
  suspended_at timestamptz,
  referral_verified boolean,
  ban_mismatch boolean,
  current_streak integer,
  longest_streak integer,
  last_active_date date,
  owned_collections integer,
  people_using_collections integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can view accounts';
  end if;

  return query
  select
    u.suspended_at,
    u.referral_verified,
    (u.suspended_at is not null) <> coalesce(au.banned_until > now(), false),
    coalesce(s.current_streak, 0),
    coalesce(s.longest_streak, 0),
    s.last_active_date,
    (select count(*)::integer from public.domains d where d.owner_id = u.id),
    public._admin_people_using_collections(u.id)
  from public.users u
  join auth.users au on au.id = u.id
  left join public.user_settings s on s.user_id = u.id
  where u.id = p_user_id;
end;
$$;

revoke all on function public.admin_person_detail(uuid) from public, anon;
grant execute on function public.admin_person_detail(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- How much one top-up adds. Admins change it with the other credit settings.
-- ---------------------------------------------------------------------------

alter table public.ai_credit_settings
  add column self_topup_amount integer not null default 30
    constraint ai_credit_settings_self_topup_amount_check
    check (self_topup_amount between 1 and 10000);

drop function public.admin_set_ai_credit_settings(integer, integer, integer, integer);

create function public.admin_set_ai_credit_settings(
  p_default_allowance integer,
  p_monthly_refill integer,
  p_quiz_cost integer,
  p_story_cost integer,
  p_self_topup_amount integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.ai_credit_settings;
  v_old_quiz integer;
  v_old_story integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can change AI credit settings';
  end if;
  if p_default_allowance is null or p_default_allowance not between 0 and 1000000
     or p_monthly_refill is null or p_monthly_refill not between 0 and 1000000 then
    raise exception 'Allowances must be between 0 and 1000000';
  end if;
  if p_quiz_cost is null or p_quiz_cost not between 1 and 1000
     or p_story_cost is null or p_story_cost not between 1 and 1000 then
    raise exception 'Costs must be between 1 and 1000';
  end if;
  if p_self_topup_amount is null or p_self_topup_amount not between 1 and 10000 then
    raise exception 'The top-up amount must be between 1 and 10000';
  end if;

  select * into v_old from public.ai_credit_settings where id for update;
  select credit_cost into v_old_quiz from public.ai_feature_settings where feature = 'quiz' for update;
  select credit_cost into v_old_story from public.ai_feature_settings where feature = 'story' for update;
  if v_old.id is null or v_old_quiz is null or v_old_story is null then
    raise exception 'AI credit settings are not set up';
  end if;

  update public.ai_credit_settings
  set default_allowance = p_default_allowance,
      monthly_refill = p_monthly_refill,
      self_topup_amount = p_self_topup_amount
  where id;
  update public.ai_feature_settings set credit_cost = p_quiz_cost where feature = 'quiz';
  update public.ai_feature_settings set credit_cost = p_story_cost where feature = 'story';

  perform public._admin_audit_insert(
    'set_ai_credit_settings', 'settings', 'ai_credits',
    jsonb_build_object(
      'old', jsonb_build_object(
        'default_allowance', v_old.default_allowance, 'monthly_refill', v_old.monthly_refill,
        'quiz_cost', v_old_quiz, 'story_cost', v_old_story,
        'self_topup_amount', v_old.self_topup_amount
      ),
      'new', jsonb_build_object(
        'default_allowance', p_default_allowance, 'monthly_refill', p_monthly_refill,
        'quiz_cost', p_quiz_cost, 'story_cost', p_story_cost,
        'self_topup_amount', p_self_topup_amount
      )
    )
  );
end;
$$;

revoke all on function public.admin_set_ai_credit_settings(integer, integer, integer, integer, integer)
  from public, anon;
grant execute on function public.admin_set_ai_credit_settings(integer, integer, integer, integer, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- The top-up. A grant on the person's own ledger, with a note that says where
-- it came from, and an audit row in the same transaction. The person's row is
-- locked so two clicks are written one after the other. Only people with fewer
-- than 10 credits left can top up, and there is no other cap.
-- ---------------------------------------------------------------------------

create function public.my_self_topup_ai_credits()
returns table (added integer, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  s public.ai_credit_settings;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  perform 1 from public.users where id = v_user for update;

  select * into s from public.ai_credit_settings where id;
  if s.id is null or not s.enabled then
    raise exception 'topup_unavailable';
  end if;

  if (select b.remaining from public.ai_credit_balance(v_user) b) >= 10 then
    raise exception 'topup_not_needed';
  end if;

  insert into public.ai_credit_ledger (user_id, kind, amount, created_by, note)
  values (v_user, 'grant', s.self_topup_amount, v_user, 'self_topup');

  perform public._admin_audit_insert(
    'self_topup_ai_credits', 'user', v_user::text,
    jsonb_build_object('amount', s.self_topup_amount)
  );

  return query
  select s.self_topup_amount, b.remaining
  from public.ai_credit_balance(v_user) b;
end;
$$;

revoke all on function public.my_self_topup_ai_credits() from public, anon;
grant execute on function public.my_self_topup_ai_credits() to authenticated;
