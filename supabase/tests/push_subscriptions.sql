-- Behavior checks for push subscriptions (phase 3 of the import redesign). One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/push_subscriptions.sql
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

create function pg_temp.act_as(p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create function pg_temp.back_to_owner()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
end;
$$;

-- Expects the statement to fail with this message (or sqlstate when it starts with a digit).
create function pg_temp.fails_with(p_sql text, p_expected text)
returns boolean
language plpgsql
as $$
begin
  execute p_sql;
  return false;
exception when others then
  return sqlerrm like '%' || p_expected || '%' or sqlstate = p_expected;
end;
$$;

do $$
declare
  admin uuid := pg_temp.make_user('push-admin@example.test', true);
  ann uuid := pg_temp.make_user('push-ann@example.test');
  bob uuid := pg_temp.make_user('push-bob@example.test');
  k text := repeat('k', 30);
  n int;
  e text;
begin
  -- The table is closed to people: no direct reads or writes.
  perform pg_temp.act_as(ann);
  assert pg_temp.fails_with('select * from public.push_subscriptions', 'permission denied'), 'authenticated can read';
  assert pg_temp.fails_with($q$insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (gen_random_uuid(), 'https://x.test/a', repeat('k',30), repeat('a',10))$q$, 'permission denied'), 'authenticated can insert';
  perform pg_temp.back_to_owner();
  execute 'set local role anon';
  assert pg_temp.fails_with('select * from public.push_subscriptions', 'permission denied'), 'anon can read';
  assert pg_temp.fails_with($q$select public.my_save_push_subscription('https://x.test/a', repeat('k',30), repeat('a',10))$q$, 'permission denied'), 'anon can save';
  perform pg_temp.back_to_owner();

  -- Saving: insert, refresh, and the endpoint moves to the next person.
  perform pg_temp.act_as(ann);
  perform public.my_save_push_subscription('https://push.test/e1', k, repeat('a', 10), 'UA');
  assert public.my_has_push_subscription('https://push.test/e1'), 'ann should have e1';
  perform public.my_save_push_subscription('https://push.test/e1', k, repeat('b', 10), 'UA2');
  perform pg_temp.back_to_owner();
  select count(*) into n from public.push_subscriptions where user_id = ann; assert n = 1, 're-save should not duplicate';

  perform pg_temp.act_as(bob);
  assert not public.my_has_push_subscription('https://push.test/e1'), 'bob should not see ann endpoint';
  perform public.my_remove_push_subscription('https://push.test/e1');
  perform pg_temp.back_to_owner();
  select count(*) into n from public.push_subscriptions where user_id = ann; assert n = 1, 'bob removed ann row';

  perform pg_temp.act_as(bob);
  perform public.my_save_push_subscription('https://push.test/e1', k, repeat('c', 10));
  perform pg_temp.back_to_owner();
  select user_id::text into e from public.push_subscriptions where endpoint = 'https://push.test/e1';
  assert e = bob::text, 'shared device endpoint should move to bob';

  -- Validation.
  perform pg_temp.act_as(ann);
  assert pg_temp.fails_with($q$select public.my_save_push_subscription('http://push.test/plain', repeat('k',30), repeat('a',10))$q$, 'check'), 'http endpoint accepted';
  assert pg_temp.fails_with($q$select public.my_save_push_subscription('https://push.test/short', 'k', 'a')$q$, 'check'), 'short keys accepted';
  perform pg_temp.back_to_owner();

  -- Ten most recent are kept.
  perform pg_temp.act_as(ann);
  for i in 1..12 loop
    perform public.my_save_push_subscription('https://push.test/many' || i, k, repeat('a', 10));
  end loop;
  perform pg_temp.back_to_owner();
  select count(*) into n from public.push_subscriptions where user_id = ann; assert n = 10, 'cap should be 10, got ' || n;

  -- The sender (service role) can read and prune.
  execute 'set local role service_role';
  select count(*) into n from public.push_subscriptions; assert n >= 11, 'service role cannot read';
  delete from public.push_subscriptions where endpoint = 'https://push.test/many12';
  assert pg_temp.fails_with($q$update public.push_subscriptions set p256dh = 'x'$q$, 'permission denied'), 'service role can update';
  perform pg_temp.back_to_owner();

  -- The admin switch: admins only, off by default.
  assert (select push_enabled from public.collection_request_settings) = false, 'push should start off';
  perform pg_temp.act_as(ann);
  update public.collection_request_settings set push_enabled = true;
  perform pg_temp.back_to_owner();
  assert (select push_enabled from public.collection_request_settings) = false, 'a member changed the switch';
  perform pg_temp.act_as(admin);
  update public.collection_request_settings set push_enabled = true;
  perform pg_temp.back_to_owner();
  assert (select push_enabled from public.collection_request_settings) = true, 'admin could not change the switch';

  -- Deleting a person removes their subscriptions.
  delete from auth.users where id = ann;
  select count(*) into n from public.push_subscriptions where user_id = ann; assert n = 0, 'cascade failed';

  raise notice 'push_subscriptions: all checks passed';
end;
$$;

rollback;
