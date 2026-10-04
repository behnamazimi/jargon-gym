-- Behavior checks for collection loves, reports and takedowns. One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/collection_moderation.sql
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

do $$
declare
  admin_id uuid := pg_temp.make_user('cm-admin@example.test', true);
  owner_id uuid := pg_temp.make_user('cm-owner@example.test');
  a_id uuid := pg_temp.make_user('cm-a@example.test');
  b_id uuid := pg_temp.make_user('cm-b@example.test');
  d_shared uuid;
  d_private uuid;
  d_builtin uuid;
  v_failed boolean;
  v_count integer;
  v_id uuid;
  v_id2 uuid;
  v_audits integer;
  i integer;
begin
  -- Grants
  assert not has_function_privilege('anon', 'public.my_set_collection_love(uuid,boolean)', 'execute'), 'anon love';
  assert not has_function_privilege('anon', 'public.my_report_collection(uuid,text,text)', 'execute'), 'anon report';
  assert not has_function_privilege('anon', 'public.admin_stop_sharing_collection(uuid,text,text)', 'execute'), 'anon stop';
  assert has_function_privilege('authenticated', 'public.admin_lift_share_lock(uuid,text)', 'execute'), 'authenticated lift';
  assert not has_function_privilege('authenticated', 'public._domains_guard_protected()', 'execute'), 'guard callable';
  assert not has_function_privilege('authenticated', 'public._collection_loves_count()', 'execute'), 'counter callable';
  assert not has_table_privilege('authenticated', 'public.collection_loves', 'insert'), 'loves writable';
  assert not has_table_privilege('authenticated', 'public.collection_reports', 'insert'), 'reports writable';

  insert into public.domains (name, owner_id, visibility) values ('CM Shared', owner_id, 'shared') returning id into d_shared;
  insert into public.domains (name, owner_id) values ('CM Private', owner_id) returning id into d_private;
  insert into public.domains (name, owner_id, visibility, is_builtin) values ('CM Builtin', owner_id, 'shared', true) returning id into d_builtin;
  insert into public.user_collection_domains (user_id, domain_id) values (a_id, d_shared), (b_id, d_shared);

  -- Loves
  perform pg_temp.act_as(owner_id);
  v_failed := false;
  begin perform public.my_set_collection_love(d_shared, true); exception when others then v_failed := sqlerrm = 'own_collection'; end;
  assert v_failed, 'self love';

  perform pg_temp.act_as(a_id);
  v_failed := false;
  begin perform public.my_set_collection_love(d_private, true); exception when others then v_failed := sqlerrm = 'collection_not_shared'; end;
  assert v_failed, 'love private';
  assert public.my_set_collection_love(d_shared, true) = 1, 'love count 1';
  assert public.my_set_collection_love(d_shared, true) = 1, 'love is idempotent';
  perform pg_temp.act_as(b_id);
  assert public.my_set_collection_love(d_shared, true) = 2, 'love count 2';
  assert (select count(*) from public.collection_loves) = 1, 'only own love rows visible';
  assert public.my_set_collection_love(d_shared, false) = 1, 'unlove count';
  assert public.my_set_collection_love(d_shared, false) = 1, 'unlove idempotent';

  -- The owner can't edit protected columns, or re-share while blocked
  perform pg_temp.act_as(owner_id);
  v_failed := false;
  begin update public.domains set love_count = 99 where id = d_shared; exception when others then v_failed := sqlerrm = 'love_count_protected'; end;
  assert v_failed, 'owner edits love_count';
  v_failed := false;
  begin update public.domains set share_blocked_at = now(), share_block_reason = 'rules' where id = d_shared; exception when others then v_failed := sqlerrm = 'share_lock_protected'; end;
  assert v_failed, 'owner sets lock';
  update public.domains set name = 'CM Shared renamed' where id = d_shared;

  -- Reports
  perform pg_temp.act_as(owner_id);
  v_failed := false;
  begin perform public.my_report_collection(d_shared, 'rules', null); exception when others then v_failed := sqlerrm = 'own_collection'; end;
  assert v_failed, 'self report';

  perform pg_temp.act_as(a_id);
  v_failed := false;
  begin perform public.my_report_collection(d_builtin, 'rules', null); exception when others then v_failed := sqlerrm = 'builtin_collection'; end;
  assert v_failed, 'report builtin';
  v_failed := false;
  begin perform public.my_report_collection(d_shared, 'spam', null); exception when others then v_failed := sqlerrm = 'invalid_report'; end;
  assert v_failed, 'bad reason';
  v_failed := false;
  begin perform public.my_report_collection(d_shared, 'rules', repeat('x', 501)); exception when others then v_failed := sqlerrm = 'invalid_report'; end;
  assert v_failed, 'long note';
  v_id := public.my_report_collection(d_shared, 'personal_info', 'has a phone number');
  v_id2 := public.my_report_collection(d_shared, 'rules', null);
  assert v_id = v_id2, 'one open report per member';
  perform pg_temp.act_as(b_id);
  perform public.my_report_collection(d_shared, 'rules', null);
  assert (select count(*) from public.collection_reports) = 1, 'reporters see only their own';

  -- Quota: 10 reports in 24h
  execute 'reset role';
  for i in 1..9 loop
    insert into public.domains (name, owner_id, visibility) values ('CM Q' || i, owner_id, 'shared') returning id into v_id;
    insert into public.collection_reports (domain_id, reporter_id, reason) values (v_id, b_id, 'rules');
  end loop;
  insert into public.domains (name, owner_id, visibility) values ('CM Q10', owner_id, 'shared') returning id into v_id;
  perform pg_temp.act_as(b_id);
  v_failed := false;
  begin perform public.my_report_collection(v_id, 'rules', null); exception when others then v_failed := sqlerrm = 'report_quota_reached'; end;
  assert v_failed, 'report quota';
  execute 'reset role';
  delete from public.collection_reports where domain_id <> d_shared;

  -- Non-admins can't use the admin functions
  perform pg_temp.act_as(owner_id);
  v_failed := false;
  begin perform public.admin_stop_sharing_collection(d_shared, 'rules', 'x'); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member stop sharing';

  -- Takedown
  perform pg_temp.act_as(admin_id);
  assert (select count(*) from public.collection_reports where domain_id = d_shared) = 2, 'admin sees both reports';
  assert (select count(*) from public.admin_list_collection_reports(d_shared)) = 2, 'report list';
  v_failed := false;
  begin perform public.admin_stop_sharing_collection(d_shared, 'rules', ''); exception when others then v_failed := sqlstate = 'AD001'; end;
  assert v_failed, 'note required';
  v_failed := false;
  begin perform public.admin_stop_sharing_collection(d_private, 'rules', 'n'); exception when others then v_failed := sqlstate = 'AD001'; end;
  assert v_failed, 'not shared';
  v_failed := false;
  begin perform public.admin_stop_sharing_collection(d_builtin, 'rules', 'n'); exception when others then v_failed := sqlstate = 'AD001'; end;
  assert v_failed, 'builtin';

  perform public.admin_stop_sharing_collection(d_shared, 'personal_info', 'phone number in term 3');
  execute 'reset role';
  assert (select visibility from public.domains where id = d_shared) = 'private', 'unshared';
  assert (select share_block_reason from public.domains where id = d_shared) = 'personal_info', 'reason set';
  assert not exists (select 1 from public.user_collection_domains where domain_id = d_shared and user_id <> owner_id), 'removed from libraries';
  assert (select count(*) from public.collection_reports where domain_id = d_shared and status = 'actioned') = 2, 'reports actioned';
  select count(*) into v_audits from public.admin_audit_log where action = 'stop_sharing_collection' and target_id = d_shared::text;
  assert v_audits = 1, 'one audit row';
  assert (select (details->>'removed_from')::int from public.admin_audit_log where action = 'stop_sharing_collection' and target_id = d_shared::text) = 2, 'removed_from counted';
  assert (select love_count from public.domains where id = d_shared) = 1, 'loves kept';

  -- Blocked: no sharing, no loves, no adding
  perform pg_temp.act_as(owner_id);
  v_failed := false;
  begin update public.domains set visibility = 'shared' where id = d_shared; exception when others then v_failed := sqlerrm = 'share_blocked'; end;
  assert v_failed, 're-share while blocked';
  perform pg_temp.act_as(a_id);
  v_failed := false;
  begin perform public.my_set_collection_love(d_shared, true); exception when others then v_failed := sqlerrm = 'collection_not_shared'; end;
  assert v_failed, 'love blocked';

  -- Lift
  perform pg_temp.act_as(admin_id);
  perform public.admin_lift_share_lock(d_shared, 'resolved');
  perform public.admin_lift_share_lock(d_shared, 'again');
  execute 'reset role';
  assert (select count(*) from public.admin_audit_log where action = 'lift_share_lock' and target_id = d_shared::text) = 1, 'lift audited once';
  perform pg_temp.act_as(owner_id);
  update public.domains set visibility = 'shared' where id = d_shared;
  execute 'reset role';
  assert not exists (select 1 from public.user_collection_domains where domain_id = d_shared and user_id <> owner_id), 'nothing restored';

  -- Dismiss
  perform pg_temp.act_as(a_id);
  perform public.my_report_collection(d_shared, 'rules', null);
  perform pg_temp.act_as(admin_id);
  assert public.admin_dismiss_collection_reports(d_shared) = 1, 'dismissed one';
  assert public.admin_dismiss_collection_reports(d_shared) = 0, 'dismiss idempotent';
  execute 'reset role';
  assert (select count(*) from public.admin_audit_log where action = 'dismiss_collection_reports' and target_id = d_shared::text) = 1, 'dismiss audited once';
  perform pg_temp.act_as(a_id);
  perform public.my_report_collection(d_shared, 'rules', null);
  execute 'reset role';
  assert (select count(*) from public.collection_reports where domain_id = d_shared and status = 'open') = 1, 'later report opens a new one';

  -- Admin list
  perform pg_temp.act_as(admin_id);
  assert (select open_report_count from public.admin_list_collections() where id = d_shared) = 1, 'list open reports';
  execute 'reset role';

  raise notice 'collection_moderation: all checks passed';
end;
$$;

rollback;
