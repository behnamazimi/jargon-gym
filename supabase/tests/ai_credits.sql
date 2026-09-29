-- Behavior checks for AI credits. Runs in one transaction and rolls back, so
-- it is safe against the local database:
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

do $$
declare
  u1 uuid := pg_temp.make_user('t1@example.test');
  u2 uuid := pg_temp.make_user('t2@example.test');
  u3 uuid := pg_temp.make_user('t3@example.test');
  u4 uuid := pg_temp.make_user('t4@example.test');
  admin_id uuid := pg_temp.make_user('admin@example.test', true);
  r record;
  v_ledger bigint;
begin
  -- Defaults: 100 starter + 30 monthly.
  assert pg_temp.remaining(u1) = 130, 'fresh balance should be 130';
  assert (select total from public.ai_credit_balance(u1)) = 130, 'total should be 130';

  -- Reserve ok, then insufficient without inserting a row.
  select * into r from public.reserve_ai_credits(u1, 'quiz', 8);
  assert r.status = 'ok' and r.remaining = 122, 'reserve 8 should leave 122';
  select * into r from public.reserve_ai_credits(u1, 'story', 500);
  assert r.status = 'insufficient' and r.remaining = 122, 'oversized reserve is refused';
  assert (select count(*) from public.ai_credit_ledger where user_id = u1) = 1,
    'a refused reserve must not write a row';

  -- Refund restores the balance and is idempotent.
  select * into r from public.reserve_ai_credits(u1, 'story', 10);
  v_ledger := r.ledger_id;
  assert pg_temp.remaining(u1) = 112, 'after second reserve';
  perform public.refund_ai_credits(v_ledger);
  perform public.refund_ai_credits(v_ledger);
  assert pg_temp.remaining(u1) = 122, 'refund restores the balance once';
  assert (select count(*) from public.ai_credit_ledger where kind = 'refund' and user_id = u1) = 1,
    'a second refund is a no-op';

  -- Monthly pool refills each month: 50 spent last month uses 30 monthly + 20 starter.
  insert into public.ai_credit_ledger (user_id, kind, feature, amount, created_at)
  values (u2, 'spend', 'quiz', 50, date_trunc('month', now()) - interval '2 days');
  assert pg_temp.remaining(u2) = 110, 'old-month spend only dents starter by 20';

  -- Reset clears usage, keeps rows, and grants survive it.
  perform public.reserve_ai_credits(u3, 'quiz', 40);
  assert pg_temp.remaining(u3) = 90;
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.admin_grant_ai_credits(u3, 25, 'test');
  perform public.admin_reset_ai_credits(u3, 'test');
  execute 'reset role';
  assert pg_temp.remaining(u3) = 155, 'reset restores usage and keeps the grant';
  assert (select count(*) from public.ai_credit_ledger where user_id = u3) = 3,
    'reset must keep history';

  -- A refund of a pre-reset spend never makes usage negative.
  perform public.reserve_ai_credits(u4, 'quiz', 20);
  select id into v_ledger from public.ai_credit_ledger where user_id = u4 and kind = 'spend';
  perform public.admin_reset_ai_credits(u4, null);
  perform public.refund_ai_credits(v_ledger);
  assert pg_temp.remaining(u4) = 130, 'refund after reset stays at full balance';

  -- Disabled switch refuses without charging.
  update public.ai_credit_settings set enabled = false;
  select * into r from public.reserve_ai_credits(u1, 'quiz', 1);
  assert r.status = 'disabled', 'disabled switch is honored';
  update public.ai_credit_settings set enabled = true;

  -- Lowering the allowance below usage clamps at zero.
  update public.ai_credit_settings set default_allowance = 0, monthly_refill = 0;
  assert pg_temp.remaining(u1) = 0, 'clamped at zero';
  update public.ai_credit_settings set default_allowance = 100, monthly_refill = 30;

  -- Permissions.
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.reserve_ai_credits(u1, 'quiz', 1);
    raise exception 'authenticated could call reserve_ai_credits';
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
  assert (select remaining from public.my_ai_credit_state()) = 122, 'my state matches balance';
  execute 'reset role';

  execute 'set local role anon';
  begin
    perform public.my_ai_credit_state();
    raise exception 'anon could call my_ai_credit_state';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
end;
$$;

do $$
declare
  u1 uuid := pg_temp.make_user('r1@example.test');
  u2 uuid := pg_temp.make_user('r2@example.test');
  admin_id uuid := pg_temp.make_user('admin2@example.test', true);
  r record;
  n integer;
begin
  -- The monthly pool is spent first: 20 spent last month never touches the starter pool.
  insert into public.ai_credit_ledger (user_id, kind, feature, amount, created_at)
  values (u1, 'spend', 'quiz', 20, date_trunc('month', now()) - interval '2 days');
  assert pg_temp.remaining(u1) = 130, 'last month spend within the monthly pool leaves the starter whole';

  -- Non-admins can't read the ledger or the settings, or change the settings.
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.ai_credit_ledger;
  assert n = 0, 'a member must not see ledger rows';
  select count(*) into n from public.ai_credit_settings;
  assert n = 0, 'a member must not see the settings';
  update public.ai_credit_settings set default_allowance = 5;
  get diagnostics n = row_count;
  assert n = 0, 'a member must not change the settings';
  execute 'reset role';
  assert (select default_allowance from public.ai_credit_settings) = 100, 'settings untouched';

  -- Admin usage counts spend since the last reset, like the balance.
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  perform public.reserve_ai_credits(u2, 'quiz', 40);
  perform public.admin_reset_ai_credits(u2, null);
  perform public.reserve_ai_credits(u2, 'story', 5);
  execute 'set local role authenticated';
  select * into r from public.admin_ai_credit_usage(50) where user_id = u2;
  execute 'reset role';
  assert r.spent = 5 and r.remaining = 125, 'usage reflects spend since the reset';

  -- Settings are bounded.
  begin
    update public.ai_credit_settings set default_allowance = -1;
    raise exception 'negative allowance accepted';
  exception when check_violation then null;
  end;
  begin
    update public.ai_credit_settings set monthly_refill = 2000000;
    raise exception 'huge refill accepted';
  exception when check_violation then null;
  end;

  -- Table privileges are only what the app needs.
  assert not has_table_privilege('authenticated', 'public.ai_credit_ledger', 'INSERT');
  assert not has_table_privilege('service_role', 'public.ai_credit_ledger', 'TRUNCATE');
  assert not has_table_privilege('service_role', 'public.ai_credit_ledger', 'UPDATE');
  assert not has_table_privilege('service_role', 'public.ai_credit_ledger', 'DELETE');
  assert not has_table_privilege('anon', 'public.ai_credit_ledger', 'SELECT');
  assert not has_table_privilege('anon', 'public.ai_credit_settings', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.ai_credit_settings', 'TRUNCATE');
end;
$$;

do $$
declare
  admin_id uuid := pg_temp.make_user('admin3@example.test', true);
  u1 uuid := pg_temp.make_user('s1@example.test');
  u2 uuid := pg_temp.make_user('s2@example.test');
  before_row record;
  after_row record;
  v_ledger bigint;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into before_row from public.admin_ai_credit_summary();
  execute 'reset role';

  -- One kept spend, and one spend that failed and was refunded.
  perform public.reserve_ai_credits(u1, 'quiz', 7);
  select ledger_id into v_ledger from public.reserve_ai_credits(u2, 'story', 5);
  perform public.refund_ai_credits(v_ledger);

  execute 'set local role authenticated';
  select * into after_row from public.admin_ai_credit_summary();
  execute 'reset role';

  assert after_row.total_users = before_row.total_users, 'users were created before the baseline';
  assert after_row.users_with_use = before_row.users_with_use + 1, 'only the kept spend counts as use';
  assert after_row.credits_spent = before_row.credits_spent + 7, 'refunded credits are not spent';
  assert after_row.spends_24h = before_row.spends_24h + 2, 'both requests count as requests';
  assert after_row.refunds_24h = before_row.refunds_24h + 1, 'the failure shows as a refund';

  -- Members can't see it.
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.admin_ai_credit_summary();
    raise exception 'member could read the summary';
  exception when others then
    if sqlerrm not like 'Only admins%' then raise; end if;
  end;
  execute 'reset role';
end;
$$;

do $$
declare
  admin_id uuid := pg_temp.make_user('admin4@example.test', true);
  u1 uuid := pg_temp.make_user('m1@example.test');
  u2 uuid := pg_temp.make_user('m2@example.test');
  u3 uuid := pg_temp.make_user('m3@example.test');
  before_row record;
  after_row record;
  v_ledger bigint;
begin
  -- With every action costing 3, someone with 1 credit left can't do anything.
  update public.ai_credit_settings set quiz_credits_per_question = 3, story_credits_per_term = 3;

  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select * into before_row from public.admin_ai_credit_summary();
  execute 'reset role';

  insert into public.ai_credit_ledger (user_id, kind, feature, amount)
  values (u1, 'spend', 'quiz', 129), (u3, 'spend', 'quiz', 100);
  insert into public.user_settings (user_id, provider, api_key_encrypted, api_key_last4)
  values (u1, 'google', 'x', 'abcd');

  -- Three failed requests from two different people.
  select ledger_id into v_ledger from public.reserve_ai_credits(u2, 'quiz', 5);
  perform public.refund_ai_credits(v_ledger);
  select ledger_id into v_ledger from public.reserve_ai_credits(u2, 'quiz', 5);
  perform public.refund_ai_credits(v_ledger);
  select ledger_id into v_ledger from public.reserve_ai_credits(u3, 'story', 5);
  perform public.refund_ai_credits(v_ledger);

  execute 'set local role authenticated';
  select * into after_row from public.admin_ai_credit_summary();
  execute 'reset role';

  assert after_row.users_with_use = before_row.users_with_use + 2, 'two people used credits';
  assert after_row.users_exhausted = before_row.users_exhausted + 1,
    'one credit left, at 3 per action, counts as ran out; 30 left does not';
  assert after_row.users_with_own_key = before_row.users_with_own_key + 1, 'one saved a key';
  assert after_row.refunds_24h = before_row.refunds_24h + 3, 'three refunds';
  assert after_row.refund_users_24h = before_row.refund_users_24h + 2,
    'refunds come from two different people';
end;
$$;

rollback;
\echo ai_credits.sql: ok
