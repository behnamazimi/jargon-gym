-- Behavior checks for shared reference codes. One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/shared_referral_codes.sql
begin;

create function pg_temp.make_admin(p_email text)
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
  update public.users set role = 'admin' where id = v_id;
  return v_id;
end;
$$;

create function pg_temp.act_as(p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

-- Signs someone up by email with a code, the way the app does.
create function pg_temp.sign_up(p_email text, p_code text, p_confirmed boolean default false)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data, aud, role, email_confirmed_at)
  values (v_id, p_email, jsonb_build_object('referral_code', p_code), 'authenticated', 'authenticated',
          case when p_confirmed then now() end);
  return v_id;
end;
$$;

do $$
declare
  admin_id uuid := pg_temp.make_admin('sc-admin@example.test');
  member_id uuid := pg_temp.make_admin('sc-member@example.test');
  v_row public.referral_codes;
  v_id uuid;
  v_a uuid;
  v_b uuid;
  v_c uuid;
  v_failed boolean;
  v_msg text;
begin
  update public.users set role = 'member' where id = member_id;

  assert not has_function_privilege('anon', 'public.admin_create_shared_referral_code(text,text,integer,timestamptz)', 'execute'), 'anon create';
  assert not has_function_privilege('anon', 'public.admin_list_shared_referral_codes()', 'execute'), 'anon list';
  assert not has_function_privilege('authenticated', 'public._consume_referral_code(uuid,text)', 'execute'), 'consume callable';
  assert not has_table_privilege('authenticated', 'public.referral_redemptions', 'select'), 'redemptions readable';

  -- Only admins create shared codes, and bad input is turned away with a readable message.
  perform pg_temp.act_as(member_id);
  v_failed := false;
  begin perform public.admin_create_shared_referral_code('LAUNCH', 'x', 3, now() + interval '1 day'); exception when others then v_failed := true; end;
  assert v_failed, 'member created a shared code';
  execute 'reset role';

  perform pg_temp.act_as(admin_id);
  v_failed := false;
  begin perform public.admin_create_shared_referral_code('ab', 'x', 3, now() + interval '1 day'); exception when sqlstate 'AD001' then v_failed := true; end;
  assert v_failed, 'short code accepted';
  v_failed := false;
  begin perform public.admin_create_shared_referral_code('LAUNCH', 'x', 1, now() + interval '1 day'); exception when sqlstate 'AD001' then v_failed := true; end;
  assert v_failed, 'one seat accepted';
  v_failed := false;
  begin perform public.admin_create_shared_referral_code('LAUNCH', 'x', 3, now() - interval '1 day'); exception when sqlstate 'AD001' then v_failed := true; end;
  assert v_failed, 'past end date accepted';

  v_row := public.admin_create_shared_referral_code('sclaunch', 'Newsletter', 2, now() + interval '1 day');
  assert v_row.code = 'SCLAUNCH' and v_row.max_uses = 2 and v_row.label = 'Newsletter', 'created row';
  v_failed := false;
  begin perform public.admin_create_shared_referral_code('SCLAUNCH', 'Again', 5, now() + interval '1 day'); exception when sqlstate 'AD001' then v_failed := true; end;
  assert v_failed, 'duplicate code accepted';
  assert (select count(*) from public.admin_audit_log where action = 'create_shared_referral_code' and target_id = v_row.id::text) = 1, 'create audit row';
  assert (select status from public.admin_list_shared_referral_codes() where code = 'SCLAUNCH') = 'active', 'listed as active';
  assert not exists (select 1 from public.admin_list_shared_referral_codes() where max_uses = 1), 'single-use code listed';
  execute 'reset role';

  -- With email confirmation on, the seat is not taken at signup.
  v_a := pg_temp.sign_up('sc-a@example.test', 'SCLAUNCH');
  assert (select not referral_verified and pending_referral_code = 'SCLAUNCH' from public.users where id = v_a), 'signup should wait for the email';
  assert (select use_count from public.referral_codes where code = 'SCLAUNCH') = 0, 'seat taken before confirmation';

  -- Confirming the email takes the seat and verifies the account.
  update auth.users set email_confirmed_at = now() where id = v_a;
  assert (select referral_verified and pending_referral_code is null from public.users where id = v_a), 'confirmed account not verified';
  assert (select use_count from public.referral_codes where code = 'SCLAUNCH') = 1, 'seat count after confirm';
  assert (select used_by is null and used_at is null and is_active from public.referral_codes where code = 'SCLAUNCH'), 'shared code marked used by one person';

  -- Confirming again changes nothing.
  update auth.users set email_confirmed_at = now() + interval '1 second' where id = v_a;
  assert (select use_count from public.referral_codes where code = 'SCLAUNCH') = 1, 'seat taken twice';

  -- With confirmation off (already confirmed at signup) the seat is taken at once.
  v_b := pg_temp.sign_up('sc-b@example.test', 'SCLAUNCH', true);
  assert (select referral_verified from public.users where id = v_b), 'auto-confirmed account not verified';
  assert (select use_count from public.referral_codes where code = 'SCLAUNCH') = 2, 'seat count after second';

  -- Full: a new signup is turned away with the "full or expired" message.
  v_failed := false;
  begin perform pg_temp.sign_up('sc-c@example.test', 'SCLAUNCH'); exception when others then v_failed := true; v_msg := sqlerrm; end;
  assert v_failed and v_msg = 'Referral code is full or expired', 'full code accepted: ' || coalesce(v_msg, 'no error');
  assert (select use_count = max_uses from public.referral_codes where code = 'SCLAUNCH'), 'not full';

  -- Deleting an account does not give its seat back.
  delete from auth.users where id = v_b;
  assert (select use_count from public.referral_codes where code = 'SCLAUNCH') = 2, 'seat returned on delete';
  assert (select count(*) from public.referral_redemptions r join public.referral_codes c on c.id = r.code_id where c.code = 'SCLAUNCH') = 2, 'redemption lost on delete';

  -- A seat can't run out between signup and confirmation: the late one stays unverified.
  perform pg_temp.act_as(admin_id);
  v_row := public.admin_create_shared_referral_code('sclast', 'Last seat', 2, now() + interval '1 day');
  execute 'reset role';
  v_a := pg_temp.sign_up('sc-d@example.test', 'SCLAST');
  v_b := pg_temp.sign_up('sc-e@example.test', 'SCLAST');
  update auth.users set email_confirmed_at = now() where id = v_a;
  update public.referral_codes set use_count = max_uses where code = 'SCLAST';
  update auth.users set email_confirmed_at = now() where id = v_b;
  assert (select not referral_verified and pending_referral_code is null from public.users where id = v_b), 'late confirmation took a seat';
  assert (select referral_code_ran_out from public.users where id = v_b), 'ran-out not remembered';

  -- ... and can still enter another code afterwards.
  perform pg_temp.act_as(v_b);
  v_failed := false;
  begin perform public.redeem_referral_code('SCLAST'); exception when others then v_failed := true; v_msg := sqlerrm; end;
  assert v_failed and v_msg = 'Referral code is full or expired', 'full code redeemed after sign-in';
  execute 'reset role';
  perform pg_temp.act_as(admin_id);
  v_row := public.admin_create_shared_referral_code('scopen', 'Open', 3, now() + interval '1 day');
  execute 'reset role';
  perform pg_temp.act_as(v_b);
  perform public.redeem_referral_code('scopen');
  execute 'reset role';
  assert (select referral_verified from public.users where id = v_b), 'redeem after sign-in';
  assert (select not referral_code_ran_out from public.users where id = v_b), 'ran-out not cleared';
  assert (select use_count from public.referral_codes where code = 'SCOPEN') = 1, 'seat after sign-in redeem';

  -- Verified accounts can't take another seat.
  perform pg_temp.act_as(v_b);
  v_failed := false;
  begin perform public.redeem_referral_code('SCOPEN'); exception when others then v_failed := true; end;
  assert v_failed, 'verified account redeemed again';
  execute 'reset role';

  -- Pausing stops new seats, resuming brings them back, and both are audited once.
  perform pg_temp.act_as(admin_id);
  perform public.admin_set_referral_code_active(v_row.id, false);
  perform public.admin_set_referral_code_active(v_row.id, false);
  assert (select status from public.admin_list_shared_referral_codes() where code = 'SCOPEN') = 'paused', 'not paused';
  assert (select count(*) from public.admin_audit_log where action = 'set_referral_code_active' and target_id = v_row.id::text) = 1, 'pause audited more than once';
  execute 'reset role';
  v_failed := false;
  begin perform pg_temp.sign_up('sc-f@example.test', 'SCOPEN'); exception when others then v_failed := true; end;
  assert v_failed, 'paused code accepted';
  perform pg_temp.act_as(admin_id);
  perform public.admin_set_referral_code_active(v_row.id, true);
  execute 'reset role';
  v_c := pg_temp.sign_up('sc-g@example.test', 'SCOPEN', true);
  assert (select referral_verified from public.users where id = v_c), 'resumed code refused';

  -- Expired codes stop working and show as expired.
  update public.referral_codes set expires_at = now() - interval '1 minute' where code = 'SCOPEN';
  v_failed := false;
  begin perform pg_temp.sign_up('sc-h@example.test', 'SCOPEN'); exception when others then v_failed := true; v_msg := sqlerrm; end;
  assert v_failed and v_msg = 'Referral code is full or expired', 'expired code accepted';
  perform pg_temp.act_as(admin_id);
  assert (select status from public.admin_list_shared_referral_codes() where code = 'SCOPEN') = 'expired', 'not listed as expired';
  -- Single-use codes can't be paused through the shared-code function.
  v_failed := false;
  begin
    select id into v_id from public.referral_codes where max_uses = 1 limit 1;
    perform public.admin_set_referral_code_active(v_id, false);
  exception when sqlstate 'AD001' then v_failed := true; end;
  assert v_failed, 'single-use code paused';
  execute 'reset role';

  -- Single-use codes still work exactly as before, and a used one is refused.
  insert into public.referral_codes (code) values ('SCSINGLEUSE1');
  v_a := pg_temp.sign_up('sc-i@example.test', 'SCSINGLEUSE1');
  assert (select referral_verified and pending_referral_code is null from public.users where id = v_a), 'single-use account not verified';
  assert (select used_by = v_a and used_at is not null and not is_active and use_count = 1 from public.referral_codes where code = 'SCSINGLEUSE1'), 'single-use code not marked used';
  v_failed := false;
  begin perform pg_temp.sign_up('sc-j@example.test', 'SCSINGLEUSE1'); exception when others then v_failed := true; v_msg := sqlerrm; end;
  assert v_failed and v_msg = 'Invalid or already used referral code', 'used single-use code accepted';
  v_failed := false;
  begin perform pg_temp.sign_up('sc-k@example.test', 'NOSUCHCODE12'); exception when others then v_failed := true; v_msg := sqlerrm; end;
  assert v_failed and v_msg = 'Invalid or already used referral code', 'unknown code accepted';
end;
$$;

rollback;
