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

rollback;
\echo ai_credits.sql: ok
