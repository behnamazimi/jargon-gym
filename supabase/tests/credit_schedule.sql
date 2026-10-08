-- Behavior checks for my_credit_schedule (soonest expiry and next refill). Runs in one
-- transaction and rolls back, so it is safe against the local database:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/credit_schedule.sql
begin;

create function pg_temp.make_user(p_email text)
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
  return v_id;
end;
$$;

create function pg_temp.act_as(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create function pg_temp.back_to_owner() returns void
language plpgsql as $$
begin
  execute 'reset role';
end;
$$;

do $$
declare
  v_month_end timestamptz := (date_trunc('month', now() at time zone 'utc') + interval '1 month') at time zone 'utc';
  u1 uuid := pg_temp.make_user('sched1@example.test');
  u2 uuid := pg_temp.make_user('sched2@example.test');
  u3 uuid := pg_temp.make_user('sched3@example.test');
  r record;
begin
  -- A new account: this month's 20 monthly credits lapse at month end (even though
  -- nothing is written yet), and 20 more arrive next month.
  perform pg_temp.act_as(u1);
  select * into r from public.my_credit_schedule();
  assert r.expiring_at = v_month_end and r.expiring_amount = 20, 'new account: 20 monthly credits lapse at month end';
  assert r.next_refill_at = v_month_end and r.next_refill_amount = 20, 'new account: 20 refill next month';
  perform pg_temp.back_to_owner();

  -- Spending takes the soonest-expiring credits first, so the expiring amount shrinks.
  perform public.reserve_ai_credits(u1, 'quiz', 8);
  perform pg_temp.act_as(u1);
  select * into r from public.my_credit_schedule();
  assert r.expiring_amount = 12, 'after spending 8 the expiring amount is 12, got ' || coalesce(r.expiring_amount::text, 'null');
  perform pg_temp.back_to_owner();

  -- Spent through the monthly lot: nothing is left to expire, the refill is still due.
  perform public.reserve_ai_credits(u1, 'quiz', 12);
  perform pg_temp.act_as(u1);
  select * into r from public.my_credit_schedule();
  assert r.expiring_at is null and r.expiring_amount is null, 'a fully spent lot is ignored';
  assert r.next_refill_amount = 20, 'the refill still shows';
  perform pg_temp.back_to_owner();

  -- A free top-up lot that lapses later does not hide the sooner monthly one.
  insert into public.ai_credit_ledger (user_id, kind, amount, source, expires_at)
  values (u2, 'grant', 30, 'admin', now() + interval '90 days');
  perform pg_temp.act_as(u2);
  select * into r from public.my_credit_schedule();
  assert r.expiring_at = v_month_end and r.expiring_amount = 20, 'the soonest expiry wins';
  perform pg_temp.back_to_owner();

  -- An already-expired lot is ignored.
  insert into public.ai_credit_ledger (user_id, kind, amount, source, expires_at)
  values (u3, 'grant', 15, 'admin', now() - interval '1 day');
  perform pg_temp.act_as(u3);
  select * into r from public.my_credit_schedule();
  assert r.expiring_amount = 20, 'an expired lot is ignored';
  perform pg_temp.back_to_owner();

  -- No monthly policy: no refill, and a never-expiring grant alone has nothing to expire.
  update public.credit_grant_policies set effective_to = now() - interval '1 second'
  where source = 'monthly' and effective_to is null and effective_from <= now();
  perform pg_temp.act_as(u2);
  select * into r from public.my_credit_schedule();
  assert r.next_refill_at is null and r.next_refill_amount is null, 'no monthly policy means no refill';
  assert r.expiring_at is not null and r.expiring_amount = 30, 'the admin grant is the only expiry';
  perform pg_temp.back_to_owner();

  -- Credits switched off: all nulls.
  update public.ai_credit_settings set enabled = false;
  perform pg_temp.act_as(u1);
  select * into r from public.my_credit_schedule();
  assert r.next_refill_at is null and r.expiring_at is null, 'nothing is shown when credits are off';
  perform pg_temp.back_to_owner();

  -- Permissions.
  assert has_function_privilege('authenticated', 'public.my_credit_schedule()', 'execute'), 'members can read their schedule';
  assert not has_function_privilege('anon', 'public.my_credit_schedule()', 'execute'), 'anon cannot';
  begin
    perform set_config('request.jwt.claims', '', true);
    perform public.my_credit_schedule();
    assert false, 'a call without a user should fail';
  exception when others then
    assert sqlerrm = 'Not authenticated', 'unauthenticated message, got ' || sqlerrm;
  end;
end;
$$;

rollback;
