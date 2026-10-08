-- Behavior checks for AI credits (grant lots, prices, refunds, top-up, admin).
-- Runs in one transaction and rolls back, so it is safe against the local
-- database:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/ai_credits.sql
begin;

create function pg_temp.make_user(p_email text, p_admin boolean default false)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
  v_code text := 'T' || replace(gen_random_uuid()::text, '-', '');
begin
  insert into public.referral_codes (code) values (v_code);
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (v_id, p_email, jsonb_build_object('referral_code', v_code), 'authenticated', 'authenticated');
  if p_admin then
    update public.users set role = 'admin' where id = v_id;
  end if;
  return v_id;
end;
$$;

create function pg_temp.remaining(p_user uuid) returns integer
language sql as $$ select remaining from public.ai_credit_balance(p_user) $$;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

-- Balance, settle and the free tier.
do $$
declare
  u1 uuid := pg_temp.make_user('t1@example.test');
  r record;
begin
  -- New accounts: 50 starter + 20 monthly, shown without writing anything.
  assert pg_temp.remaining(u1) = 70, 'fresh balance should be 70';
  assert (select total from public.ai_credit_balance(u1)) = 70, 'total should be 70';
  assert (select count(*) from public.ai_credit_ledger where user_id = u1) = 0,
    'reading the balance must not write';

  -- The first charge writes this period's grants, once.
  select * into r from public.reserve_ai_credits(u1, 'story', 6);
  assert r.status = 'ok' and r.credits = 5 and r.remaining = 65, 'a 6-term story costs 5';
  perform public.reserve_ai_credits(u1, 'quiz', 1);
  assert (select count(*) from public.ai_credit_ledger
          where user_id = u1 and kind = 'grant' and source = 'starter') = 1, 'one starter grant';
  assert (select count(*) from public.ai_credit_ledger
          where user_id = u1 and kind = 'grant' and source = 'monthly') = 1, 'one monthly grant';
  assert (select expires_at from public.ai_credit_ledger
          where user_id = u1 and source = 'monthly')
         = (date_trunc('month', now() at time zone 'utc') + interval '1 month') at time zone 'utc',
    'the monthly lot lapses at the end of the UTC month';
  assert (select expires_at from public.ai_credit_ledger
          where user_id = u1 and source = 'starter') is null, 'the starter lot never lapses';
  assert pg_temp.remaining(u1) = 64, 'after a story and a question';
end;
$$;

-- Prices.
do $$
declare
  u1 uuid := pg_temp.make_user('p1@example.test');
begin
  assert (select credits from public.ai_credit_price('story', 3)) = 4, '3 terms';
  assert (select credits from public.ai_credit_price('story', 6)) = 5, '6 terms';
  assert (select credits from public.ai_credit_price('story', 7)) = 6, '7 terms';
  assert (select credits from public.ai_credit_price('story', 10)) = 7, '10 terms';
  assert (select credits from public.ai_credit_price('quiz', 8)) = 8, '8 questions';
  assert (select credits from public.ai_credit_price('narration_story', 524)) = 4, '524 characters';
  assert (select credits from public.ai_credit_price('narration_story', 1009)) = 8, '1009 characters';
  assert (select credits from public.ai_credit_price('narration_story', 1737)) = 14, '1737 characters';
  assert (select credits from public.ai_credit_price('narration_story', 1)) = 1, 'at least one credit';
  assert (select price_id from public.ai_credit_price('story', 6)) is not null, 'a price row';

  -- A spend records the price row and the units it was priced from.
  perform public.reserve_ai_credits(u1, 'story', 6);
  assert (select price_id is not null and units = 6 and amount = 5
          from public.ai_credit_ledger where user_id = u1 and kind = 'spend'),
    'the spend keeps its price and units';

  -- Story narration is billable; term narration is not.
  update public.ai_feature_settings set enabled = true where feature = 'narration_story';
  perform public.reserve_ai_credits(u1, 'narration_story', 524);
  assert pg_temp.remaining(u1) = 70 - 5 - 4, 'narration charged';
  begin
    perform public.reserve_ai_credits(u1, 'narration_term', 1);
    raise exception 'term narration was charged';
  exception when others then
    if sqlerrm not like 'Feature narration_term cannot be charged%' then raise; end if;
  end;
end;
$$;

-- Insufficient balance writes no spend.
do $$
declare
  u1 uuid := pg_temp.make_user('i1@example.test');
  r record;
  n integer;
begin
  perform public.reserve_ai_credits(u1, 'quiz', 1);
  select count(*) into n from public.ai_credit_ledger where user_id = u1 and kind = 'spend';
  select * into r from public.reserve_ai_credits(u1, 'story', 500);
  assert r.status = 'insufficient' and r.remaining = 69, 'oversized reserve is refused';
  assert (select count(*) from public.ai_credit_ledger where user_id = u1 and kind = 'spend') = n,
    'a refused reserve writes no spend';
  assert (select count(*) from public.ai_credit_allocations a
          join public.ai_credit_ledger l on l.id = a.spend_id where l.user_id = u1) = 1,
    'and no allocations';
end;
$$;

-- Deduction order and allocations.
do $$
declare
  u1 uuid := pg_temp.make_user('o1@example.test');
  admin_id uuid := pg_temp.make_user('o-admin@example.test', true);
  v_soon bigint;
  v_spend bigint;
begin
  -- A lot that lapses within the hour is used before the month's lot, which is
  -- used before the starter lot that never lapses.
  perform pg_temp.act_as(admin_id);
  perform public.admin_grant_ai_credits(u1, 3, 'short lived', now() + interval '1 hour');
  execute 'reset role';
  select id into v_soon from public.ai_credit_ledger
    where user_id = u1 and source = 'admin';

  select ledger_id into v_spend from public.reserve_ai_credits(u1, 'quiz', 5);
  assert (select amount from public.ai_credit_allocations where spend_id = v_spend and lot_id = v_soon) = 3,
    'the soonest-expiring lot is emptied first';
  assert (select a.amount from public.ai_credit_allocations a
          join public.ai_credit_ledger l on l.id = a.lot_id
          where a.spend_id = v_spend and l.source = 'monthly') = 2,
    'then the monthly lot';
  assert not exists (select 1 from public.ai_credit_allocations a
                     join public.ai_credit_ledger l on l.id = a.lot_id
                     where a.spend_id = v_spend and l.source = 'starter'),
    'the starter lot is last';
  assert (select sum(amount) from public.ai_credit_allocations where spend_id = v_spend) = 5,
    'allocations add up to the price';

  -- The database refuses to take more from a lot than it holds.
  begin
    insert into public.ai_credit_allocations (spend_id, lot_id, amount) values (v_spend, v_soon + 0, 1)
      on conflict do nothing;
    insert into public.ai_credit_allocations (spend_id, lot_id, amount)
    select v_spend, l.id, 1000 from public.ai_credit_ledger l
    where l.user_id = u1 and l.source = 'starter';
    raise exception 'allocated more than the lot holds';
  exception when others then
    if sqlerrm not like 'Lot % holds%' then raise; end if;
  end;
end;
$$;

-- Refunds.
do $$
declare
  u1 uuid := pg_temp.make_user('f1@example.test');
  admin_id uuid := pg_temp.make_user('f-admin@example.test', true);
  v_spend bigint;
  v_monthly bigint;
  v_starter bigint;
begin
  perform pg_temp.act_as(admin_id);
  perform public.admin_grant_ai_credits(u1, 3, 'short lived', now() + interval '1 hour');
  execute 'reset role';

  -- A spend that drew from three lots is refunded as three lots, once.
  select ledger_id into v_spend from public.reserve_ai_credits(u1, 'quiz', 30);
  assert pg_temp.remaining(u1) = 70 + 3 - 30, 'after the spend';
  perform public.refund_ai_credits(v_spend, 'TEST');
  perform public.refund_ai_credits(v_spend, 'again');
  assert pg_temp.remaining(u1) = 73, 'refund restores the balance once';
  assert (select count(*) from public.ai_credit_ledger where refund_of = v_spend) = 3,
    'one refund row per lot the spend drew from';
  assert (select sum(amount) from public.ai_credit_ledger where refund_of = v_spend) = 30,
    'refunds add up to the spend';
  assert (select count(distinct note) from public.ai_credit_ledger where refund_of = v_spend) = 1
         and (select min(note) from public.ai_credit_ledger where refund_of = v_spend) = 'TEST',
    'the first reason stays';

  select id into v_monthly from public.ai_credit_ledger where user_id = u1 and source = 'monthly';
  select id into v_starter from public.ai_credit_ledger where user_id = u1 and source = 'starter';
  -- A refund of a lot that never lapses never lapses; of one that does, it lives
  -- at least 30 more days.
  assert (select expires_at from public.ai_credit_ledger
          where refund_of = v_spend and lot_id = v_starter) is null, 'starter refund never lapses';
  assert (select expires_at from public.ai_credit_ledger
          where refund_of = v_spend and lot_id = v_monthly) >= now() + interval '29 days',
    'a refund into a lapsing lot lives at least 30 days';

  -- A refund is itself a lot and can be spent.
  perform public.reserve_ai_credits(u1, 'quiz', 73);
  assert pg_temp.remaining(u1) = 0, 'everything, refund lots included, can be spent';
end;
$$;

-- Expiry.
do $$
declare
  u1 uuid := pg_temp.make_user('e1@example.test');
  v_lot bigint;
  n integer;
begin
  perform public.reserve_ai_credits(u1, 'quiz', 1);
  insert into public.ai_credit_ledger (user_id, kind, amount, source, expires_at)
  values (u1, 'grant', 12, 'admin', now() - interval '1 minute')
  returning id into v_lot;

  assert pg_temp.remaining(u1) = 69, 'a lapsed lot is not counted';
  assert not exists (select 1 from public.ai_credit_ledger where kind = 'expire' and lot_id = v_lot),
    'reading the balance does not write the expire row';

  perform public.reserve_ai_credits(u1, 'quiz', 1);
  perform public.reserve_ai_credits(u1, 'quiz', 1);
  select count(*) into n from public.ai_credit_ledger where kind = 'expire' and lot_id = v_lot;
  assert n = 1, 'the lapsed lot is written off once';
  assert (select amount from public.ai_credit_ledger where kind = 'expire' and lot_id = v_lot) = 12,
    'for what was left in it';
  assert (select reason from public.ai_credit_ledger where kind = 'expire' and lot_id = v_lot) = 'lapsed',
    'with the reason';
  assert pg_temp.remaining(u1) = 67, 'the balance never counted it';

  -- Nothing is ever taken from a lapsed lot.
  assert not exists (select 1 from public.ai_credit_allocations where lot_id = v_lot), 'no allocations';
end;
$$;

-- Policy grants are idempotent.
do $$
declare
  u1 uuid := pg_temp.make_user('g1@example.test');
  u2 uuid := pg_temp.make_user('g2@example.test');
  p_old bigint;
begin
  perform public.reserve_ai_credits(u1, 'quiz', 1);
  perform public.reserve_ai_credits(u1, 'quiz', 1);
  assert (select count(*) from public.ai_credit_ledger where user_id = u1 and kind = 'grant') = 2,
    'two charges in one month still make only two grants';

  -- Changing the monthly policy mid-month does not regrant the month.
  select id into p_old from public.credit_grant_policies
    where source = 'monthly' and effective_to is null and accounts_created_to is null
    order by id desc limit 1;
  perform public._credit_policy_set_amount('monthly', 25);
  perform public.reserve_ai_credits(u1, 'quiz', 1);
  assert (select count(*) from public.ai_credit_ledger
          where user_id = u1 and kind = 'grant' and source = 'monthly') = 1,
    'a new policy row does not regrant the running period';
  assert (select effective_to is not null from public.credit_grant_policies where id = p_old),
    'the old policy is closed';
  perform public.reserve_ai_credits(u2, 'quiz', 1);
  assert (select amount from public.ai_credit_ledger where user_id = u2 and source = 'monthly') = 25,
    'a new account gets the new amount';
  perform public._credit_policy_set_amount('monthly', 20);
end;
$$;

-- Accounts that existed at the cutover keep their own terms.
do $$
declare
  u1 uuid := pg_temp.make_user('old1@example.test');
  v_cut timestamptz;
begin
  select min(accounts_created_from) into v_cut from public.credit_grant_policies
    where source = 'starter';
  update public.users set created_at = v_cut - interval '1 day' where id = u1;

  assert pg_temp.remaining(u1) = 0,
    'an existing account gets no new starter, and no monthly grant until its opening lots say so';
  assert not exists (select 1 from public.ai_credit_ledger where user_id = u1), 'nothing written';
end;
$$;

-- The ledger is insert-only.
do $$
declare
  u1 uuid := pg_temp.make_user('ins1@example.test');
  u2 uuid := pg_temp.make_user('ins2@example.test');
begin
  perform public.reserve_ai_credits(u1, 'quiz', 1);
  begin
    update public.ai_credit_ledger set amount = 99 where user_id = u1;
    raise exception 'ledger update accepted';
  exception when others then
    if sqlerrm not like '%insert-only' then raise; end if;
  end;
  begin
    delete from public.ai_credit_ledger where user_id = u1;
    raise exception 'ledger delete accepted';
  exception when others then
    if sqlerrm not like '%insert-only' then raise; end if;
  end;
  begin
    update public.ai_credit_allocations set amount = 9
      where spend_id in (select id from public.ai_credit_ledger where user_id = u1);
    raise exception 'allocation update accepted';
  exception when others then
    if sqlerrm not like '%insert-only' then raise; end if;
  end;

  -- Deleting the person still removes their rows.
  perform public.reserve_ai_credits(u2, 'quiz', 1);
  delete from auth.users where id = u2;
  assert not exists (select 1 from public.ai_credit_ledger where user_id = u2), 'rows removed with the person';
  assert not exists (select 1 from public.ai_credit_allocations a
                     where not exists (select 1 from public.ai_credit_ledger l where l.id = a.spend_id)),
    'and their allocations';
end;
$$;

-- Reset restores the free allowance and keeps admin grants.
do $$
declare
  u1 uuid := pg_temp.make_user('r1@example.test');
  u2 uuid := pg_temp.make_user('r2@example.test');
  admin_id uuid := pg_temp.make_user('r-admin@example.test', true);
  v_spend bigint;
begin
  perform public.reserve_ai_credits(u1, 'quiz', 40);
  perform pg_temp.act_as(admin_id);
  perform public.admin_grant_ai_credits(u1, 25, 'test');
  perform public.admin_reset_ai_credits(u1, 'test');
  execute 'reset role';
  assert pg_temp.remaining(u1) = 70 + 25, 'reset gives back the allowance and keeps the grant';
  assert (select count(*) from public.ai_credit_ledger
          where user_id = u1 and kind = 'expire' and reason = 'reset') >= 1, 'lots were written off';
  assert (select count(*) from public.ai_credit_ledger where user_id = u1 and source = 'reset') = 2,
    'starter and monthly lots were granted fresh';
  assert (select count(*) from public.admin_audit_log
          where action = 'reset_ai_credits' and target_id = u1::text) = 1, 'audited';

  -- Refunding a spend whose lots a reset wrote off does not undo the reset.
  select ledger_id into v_spend from public.reserve_ai_credits(u2, 'quiz', 5);
  perform pg_temp.act_as(admin_id);
  perform public.admin_reset_ai_credits(u2, null);
  execute 'reset role';
  perform public.refund_ai_credits(v_spend);
  assert pg_temp.remaining(u2) = 70, 'a refund into a written-off lot is skipped';
end;
$$;

-- Switches.
do $$
declare
  u1 uuid := pg_temp.make_user('d1@example.test');
  r record;
begin
  update public.ai_credit_settings set enabled = false;
  select * into r from public.reserve_ai_credits(u1, 'quiz', 1);
  assert r.status = 'disabled', 'the credits switch is honored';
  update public.ai_credit_settings set enabled = true;

  update public.ai_feature_settings set enabled = false where feature = 'story';
  select * into r from public.reserve_ai_credits(u1, 'story', 6);
  assert r.status = 'disabled', 'a feature switch is honored';
  update public.ai_feature_settings set enabled = true where feature = 'story';
end;
$$;

-- Permissions.
do $$
declare
  u1 uuid := pg_temp.make_user('perm1@example.test');
  n integer;
begin
  perform public.reserve_ai_credits(u1, 'quiz', 8);
  perform pg_temp.act_as(u1);
  begin
    perform public.reserve_ai_credits(u1, 'quiz', 1);
    raise exception 'authenticated could call reserve_ai_credits';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.refund_ai_credits(1);
    raise exception 'authenticated could call refund_ai_credits';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.ai_credit_price('story', 3);
    raise exception 'authenticated could call ai_credit_price';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.ai_credit_ledger (user_id, kind, feature, amount) values (u1, 'spend', 'quiz', 1);
    raise exception 'authenticated could insert into the ledger';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_grant_ai_credits(u1, 5, null);
    raise exception 'member could grant credits';
  exception when others then
    if sqlerrm not like 'Only admins%' then raise; end if;
  end;
  begin
    perform public.admin_reset_ai_credits(u1, null);
    raise exception 'member could reset credits';
  exception when others then
    if sqlerrm not like 'Only admins%' then raise; end if;
  end;
  begin
    perform public.admin_set_ai_credit_settings(1, 1, 1, 1, 1, 1, 1);
    raise exception 'member could change the settings';
  exception when others then
    if sqlerrm not like 'Only admins%' then raise; end if;
  end;
  assert (select remaining from public.my_ai_credit_state()) = 62, 'my state matches the balance';
  select count(*) into n from public.ai_credit_ledger;
  assert n = 0, 'a member must not see ledger rows';
  select count(*) into n from public.credit_grant_policies;
  assert n = 0, 'a member must not see the grant policies';
  select count(*) into n from public.credit_prices;
  assert n >= 3, 'a member can read the prices';
  select count(*) into n from public.ai_credit_settings;
  assert n = 0, 'a member must not see the settings';
  execute 'reset role';

  execute 'set local role anon';
  begin
    perform public.my_ai_credit_state();
    raise exception 'anon could call my_ai_credit_state';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  assert not has_table_privilege('authenticated', 'public.ai_credit_ledger', 'INSERT');
  assert not has_table_privilege('service_role', 'public.ai_credit_ledger', 'UPDATE');
  assert not has_table_privilege('service_role', 'public.ai_credit_ledger', 'DELETE');
  assert not has_table_privilege('service_role', 'public.ai_credit_ledger', 'TRUNCATE');
  assert not has_table_privilege('service_role', 'public.ai_credit_allocations', 'UPDATE');
  assert not has_table_privilege('service_role', 'public.credit_prices', 'INSERT');
  assert not has_table_privilege('service_role', 'public.credit_grant_policies', 'UPDATE');
  assert not has_table_privilege('anon', 'public.ai_credit_ledger', 'SELECT');
  assert not has_table_privilege('anon', 'public.credit_prices', 'SELECT');
end;
$$;

-- Admin summary, usage and failure reasons.
do $$
declare
  admin_id uuid := pg_temp.make_user('s-admin@example.test', true);
  u1 uuid := pg_temp.make_user('s1@example.test');
  u2 uuid := pg_temp.make_user('s2@example.test');
  u3 uuid := pg_temp.make_user('s3@example.test');
  before_row record;
  after_row record;
  r record;
  v_ledger bigint;
begin
  perform pg_temp.act_as(admin_id);
  select * into before_row from public.admin_ai_credit_summary();
  execute 'reset role';

  perform public.reserve_ai_credits(u1, 'quiz', 7);
  select ledger_id into v_ledger from public.reserve_ai_credits(u2, 'story', 6);
  perform public.refund_ai_credits(v_ledger, 'TEST reason A');
  perform public.refund_ai_credits(v_ledger, 'something else');
  select ledger_id into v_ledger from public.reserve_ai_credits(u3, 'quiz', 70);
  assert pg_temp.remaining(u3) = 0, 'u3 ran out';
  select ledger_id into v_ledger from public.reserve_ai_credits(u2, 'quiz', 30);
  perform public.refund_ai_credits(v_ledger, 'TEST reason A');
  select ledger_id into v_ledger from public.reserve_ai_credits(u2, 'quiz', 30);
  perform public.refund_ai_credits(v_ledger, 'TEST reason B');

  perform pg_temp.act_as(admin_id);
  select * into after_row from public.admin_ai_credit_summary();
  assert after_row.users_with_use = before_row.users_with_use + 2, 'two people kept a spend';
  assert after_row.credits_spent = before_row.credits_spent + 7 + 70, 'refunded credits are not spent';
  assert after_row.users_exhausted = before_row.users_exhausted + 1, 'one person ran out';
  assert after_row.refunds_24h = before_row.refunds_24h + 3, 'three refunded requests, not rows';
  assert after_row.refund_users_24h = before_row.refund_users_24h + 1, 'from one person';

  select * into r from public.admin_ai_credit_usage(50) where user_id = u1;
  assert r.spent = 7 and r.remaining = 63 and r.granted = 70, 'usage for u1';

  select * into r from public.admin_ai_credit_failure_reasons(20) where reason = 'TEST reason A';
  assert r.failures = 2 and r.people = 1, 'reason A: two failed requests (refunded lots counted once)';
  select * into r from public.admin_ai_credit_failure_reasons(20) where reason = 'TEST reason B';
  assert r.failures = 1, 'reason B: one failure';
  execute 'reset role';

  perform pg_temp.act_as(u1);
  begin
    perform public.admin_ai_credit_summary();
    raise exception 'member could read the summary';
  exception when others then
    if sqlerrm not like 'Only admins%' then raise; end if;
  end;
  begin
    perform public.admin_ai_credit_failure_reasons(5);
    raise exception 'member could read failure reasons';
  exception when others then
    if sqlerrm not like 'Only admins%' then raise; end if;
  end;
  execute 'reset role';
end;
$$;

-- Self-service top-up.
do $$
declare
  u1 uuid := pg_temp.make_user('topup1@example.test');
  u2 uuid := pg_temp.make_user('topup2@example.test');
  r record;
  v_failed boolean;
begin
  assert not has_function_privilege('anon', 'public.my_self_topup_ai_credits()', 'execute'), 'anon could top up';

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', '{}', true);
  v_failed := false;
  begin perform public.my_self_topup_ai_credits(); exception when others then v_failed := sqlerrm like 'Not authenticated%'; end;
  assert v_failed, 'signed-out top-up was accepted';

  perform pg_temp.act_as(u1);
  v_failed := false;
  begin perform public.my_self_topup_ai_credits(); exception when others then v_failed := sqlerrm like 'topup_not_needed%'; end;
  assert v_failed, 'topped up with plenty of credits';
  execute 'reset role';

  -- Under 10 left: adds the policy's amount, once a day.
  perform public.reserve_ai_credits(u1, 'quiz', 62);
  assert pg_temp.remaining(u1) = 8, 'down to 8';
  perform pg_temp.act_as(u1);
  select * into r from public.my_self_topup_ai_credits();
  assert r.added = 30 and r.remaining = 38, 'first top-up result';
  execute 'reset role';

  perform public.reserve_ai_credits(u1, 'quiz', 30);
  perform pg_temp.act_as(u1);
  v_failed := false;
  begin perform public.my_self_topup_ai_credits(); exception when others then v_failed := sqlerrm like 'topup_already_today%'; end;
  assert v_failed, 'a second top-up the same day was accepted';
  execute 'reset role';

  assert (select count(*) = 1 and bool_and(source = 'self_topup' and note = 'self_topup'
            and created_by = u1 and expires_at >= now() + interval '89 days')
          from public.ai_credit_ledger where user_id = u1 and source = 'self_topup'), 'top-up ledger row';
  assert (select count(*) = 1 and bool_and(actor_id = u1 and details = '{"amount":30}'::jsonb)
          from public.admin_audit_log where action = 'self_topup_ai_credits' and target_id = u1::text),
    'top-up audit row';
  assert pg_temp.remaining(u2) = 70, 'someone else was not topped up';

  -- Off when credits are off.
  update public.ai_credit_settings set enabled = false where id;
  perform pg_temp.act_as(u2);
  v_failed := false;
  begin perform public.my_self_topup_ai_credits(); exception when others then v_failed := sqlerrm like 'topup_unavailable%'; end;
  assert v_failed, 'topped up while credits were off';
  execute 'reset role';
  update public.ai_credit_settings set enabled = true where id;

  -- Off when the policy has ended.
  update public.credit_grant_policies set effective_to = now() where on_request;
  perform public.reserve_ai_credits(u2, 'quiz', 65);
  perform pg_temp.act_as(u2);
  v_failed := false;
  begin perform public.my_self_topup_ai_credits(); exception when others then v_failed := sqlerrm like 'topup_unavailable%'; end;
  assert v_failed, 'topped up after the policy ended';
  execute 'reset role';
end;
$$;

-- Admin settings write policies and prices.
do $$
declare
  admin_id uuid := pg_temp.make_user('cfg-admin@example.test', true);
  u1 uuid := pg_temp.make_user('cfg1@example.test');
  n_prices integer;
begin
  select count(*) into n_prices from public.credit_prices where feature = 'story';

  perform pg_temp.act_as(admin_id);
  perform public.admin_set_ai_credit_settings(100, 20, 30, 1, 3, 0.5, 7.5);
  execute 'reset role';

  assert (select count(*) from public.credit_prices where feature = 'story') = n_prices + 1,
    'a changed story price adds a row';
  assert (select count(*) from public.credit_prices where feature = 'quiz') = 1,
    'an unchanged price adds nothing';
  assert (select credits from public.ai_credit_price('story', 6, clock_timestamp())) = 6, 'new story price: 3 + 0.5 x 6';
  assert (select amount from public.credit_grant_policies
          where source = 'starter' and effective_to is null) = 100, 'new starter amount';

  perform public.reserve_ai_credits(u1, 'quiz', 1);
  assert (select amount from public.ai_credit_ledger where user_id = u1 and source = 'starter') = 100,
    'a new account gets the new starter amount';
  assert (select count(*) from public.admin_audit_log where action = 'set_ai_credit_settings') >= 1, 'audited';

  -- Old spends keep the price row that priced them.
  assert (select p.base_credits from public.ai_credit_ledger l
          join public.credit_prices p on p.id = l.price_id
          where l.user_id = u1 and l.kind = 'spend') = 0, 'the quiz spend points at the quiz price';
end;
$$;

rollback;
\echo ai_credits.sql: ok
