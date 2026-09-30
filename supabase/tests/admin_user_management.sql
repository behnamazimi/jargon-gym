-- Behavior checks for suspend, remove API key and delete account. One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/admin_user_management.sql
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
  admin_id uuid := pg_temp.make_user('um-admin@example.test', true);
  admin2_id uuid := pg_temp.make_user('um-admin2@example.test', true);
  member_id uuid := pg_temp.make_user('um-member@example.test');
  other_id uuid := pg_temp.make_user('um-other@example.test');
  d_priv uuid;
  d_shared uuid;
  t_shared uuid;
  v_failed boolean;
  v_state text;
  v_msg text;
  v_code text;
begin
  -- Privileges: nothing is callable by anon or through the helpers.
  assert not has_function_privilege('anon', 'public.admin_set_user_suspended(uuid,boolean,text)', 'execute'), 'anon suspend';
  assert not has_function_privilege('anon', 'public.admin_remove_user_api_key(uuid,text)', 'execute'), 'anon remove key';
  assert not has_function_privilege('anon', 'public.admin_delete_user(uuid,text,text)', 'execute'), 'anon delete';
  assert not has_function_privilege('anon', 'public.admin_person_detail(uuid)', 'execute'), 'anon detail';
  assert has_function_privilege('authenticated', 'public.admin_delete_user(uuid,text,text)', 'execute'), 'authenticated delete';
  assert not has_function_privilege('authenticated', 'public._admin_manage_target(uuid)', 'execute'), 'helper callable';
  assert not has_function_privilege('authenticated', 'public._admin_people_using_collections(uuid)', 'execute'), 'helper callable';
  assert not has_function_privilege('service_role', 'public._admin_manage_target(uuid)', 'execute'), 'helper callable';
  assert not has_table_privilege('authenticated', 'public.users', 'update'), 'users updatable by clients';
  assert not has_column_privilege('authenticated', 'public.users', 'suspended_at', 'update'), 'suspended_at updatable by clients';

  -- Fixtures: the member owns a private and a shared collection, has a key, a session, a telegram link and a widget token.
  insert into public.domains (name, owner_id) values ('UM Private', member_id) returning id into d_priv;
  insert into public.domains (name, owner_id, visibility) values ('UM Shared', member_id, 'shared') returning id into d_shared;
  insert into public.terms (domain_id, term, category, definition) values (d_shared, 'um-term', 'c', 'd') returning id into t_shared;
  insert into public.user_settings (user_id, provider, api_key_encrypted, api_key_last4)
  values (member_id, 'google', 'enc', '1234')
  on conflict (user_id) do update set provider = 'google', api_key_encrypted = 'enc', api_key_last4 = '1234';
  insert into auth.sessions (id, user_id) values (gen_random_uuid(), member_id);
  insert into public.telegram_links (user_id, chat_id, cadence, linked_at) values (member_id, 987654321, '6h', now());

  -- Signed-out and non-admin callers are refused everywhere.
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role authenticated';
  v_failed := false;
  begin perform public.admin_set_user_suspended(member_id, true, 'x'); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'signed-out suspend';
  v_failed := false;
  begin perform public.admin_person_detail(member_id); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'signed-out detail';
  execute 'reset role';

  perform pg_temp.act_as(other_id);
  v_failed := false;
  begin perform public.admin_set_user_suspended(member_id, true, 'x'); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member suspended a member';
  v_failed := false;
  begin perform public.admin_remove_user_api_key(member_id, 'x'); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member removed a key';
  v_failed := false;
  begin perform public.admin_delete_user(member_id, 'um-member@example.test', 'x'); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member deleted a member';
  v_failed := false;
  begin perform public.admin_person_detail(member_id); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member read detail';
  -- Nor can a member lift their own suspension by writing to the table.
  v_failed := false;
  begin update public.users set suspended_at = null where id = other_id; exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'a member could write users';
  execute 'reset role';
  assert (select count(*) from public.admin_audit_log where actor_id = other_id) = 0, 'a refused call left an audit row';

  -- Guards, as an admin.
  perform pg_temp.act_as(admin_id);

  -- Self, another admin, a missing account.
  v_failed := false;
  begin perform public.admin_set_user_suspended(admin_id, true, 'x'); exception when sqlstate 'AD001' then v_failed := sqlerrm like '%your own account%'; end;
  assert v_failed, 'an admin suspended themselves';
  v_failed := false;
  begin perform public.admin_delete_user(admin_id, 'um-admin@example.test', 'x'); exception when sqlstate 'AD001' then v_failed := true; end;
  assert v_failed, 'an admin deleted themselves';
  v_failed := false;
  begin perform public.admin_remove_user_api_key(admin_id, 'x'); exception when sqlstate 'AD001' then v_failed := true; end;
  assert v_failed, 'an admin removed their own key';
  v_failed := false;
  begin perform public.admin_set_user_suspended(admin2_id, true, 'x'); exception when sqlstate 'AD001' then v_failed := sqlerrm like 'Admin accounts%'; end;
  assert v_failed, 'an admin suspended another admin';
  v_failed := false;
  begin perform public.admin_delete_user(admin2_id, 'um-admin2@example.test', 'x'); exception when sqlstate 'AD001' then v_failed := true; end;
  assert v_failed, 'an admin deleted another admin';
  v_failed := false;
  begin perform public.admin_set_user_suspended(gen_random_uuid(), true, 'x'); exception when sqlstate 'AD001' then v_failed := sqlerrm like '%no longer exists%'; end;
  assert v_failed, 'a missing account was suspended';

  -- Reasons: missing, blank, too long.
  foreach v_msg in array array[null, '', '   ', repeat('a', 201)] loop
    v_failed := false;
    begin perform public.admin_set_user_suspended(member_id, true, v_msg); exception when sqlstate 'AD001' then v_failed := true; end;
    assert v_failed, 'a bad reason was accepted for suspend';
    v_failed := false;
    begin perform public.admin_remove_user_api_key(member_id, v_msg); exception when sqlstate 'AD001' then v_failed := true; end;
    assert v_failed, 'a bad reason was accepted for key removal';
    v_failed := false;
    begin perform public.admin_delete_user(member_id, 'um-member@example.test', v_msg); exception when sqlstate 'AD001' then v_failed := true; end;
    assert v_failed, 'a bad reason was accepted for delete';
  end loop;
  assert (select suspended_at is null from public.users where id = member_id), 'a refused suspend changed the flag';
  assert (select count(*) from public.admin_audit_log where actor_id = admin_id) = 0, 'refused calls left audit rows';

  -- Detail.
  assert (select d.suspended_at is null and not d.ban_mismatch and d.key_provider = 'google' and d.key_last4 = '1234'
                 and d.owned_collections = 2 and d.people_using_collections = 0
          from public.admin_person_detail(member_id) d), 'detail before';
  assert not exists (select 1 from public.admin_person_detail(gen_random_uuid())), 'detail for a missing account returned a row';

  -- Suspend.
  perform public.admin_set_user_suspended(member_id, true, 'spam');
  assert (select suspended_at is not null from public.users where id = member_id), 'flag not set';
  execute 'reset role';
  assert (select banned_until > now() + interval '50 years' from auth.users where id = member_id), 'not banned';
  assert not exists (select 1 from auth.sessions where user_id = member_id), 'sessions kept';
  perform pg_temp.act_as(admin_id);
  assert (select details = '{"reason":"spam"}'::jsonb and target_type = 'user' and target_id = member_id::text
          from public.admin_audit_log where action = 'suspend_user'), 'suspend audit row';
  assert (select not d.ban_mismatch and d.suspended_at is not null from public.admin_person_detail(member_id) d), 'detail after suspend';
  -- Doing it again changes nothing and adds no row.
  perform public.admin_set_user_suspended(member_id, true, 'spam again');
  assert (select count(*) from public.admin_audit_log where action = 'suspend_user') = 1, 'a repeat suspend was audited';
  -- Suspended people get no Telegram sends and can't link a chat.
  execute 'reset role';
  assert not exists (select 1 from public.list_due_telegram_users() where user_id = member_id), 'suspended person is due';
  update public.telegram_links set link_token_hash = 'tok', link_token_expires_at = now() + interval '1 hour' where user_id = member_id;
  v_failed := false;
  begin perform public.complete_telegram_link('tok', 111); exception when others then v_failed := sqlerrm like 'Invalid or expired%'; end;
  assert v_failed, 'a suspended person linked a chat';
  perform pg_temp.act_as(admin_id);

  -- Drift: a hand edit that lifts the ban shows up and re-suspending repairs it without a duplicate row only when nothing is wrong.
  execute 'reset role';
  update auth.users set banned_until = null where id = member_id;
  perform pg_temp.act_as(admin_id);
  assert (select d.ban_mismatch from public.admin_person_detail(member_id) d), 'drift not reported';
  perform public.admin_set_user_suspended(member_id, true, 'repair');
  assert (select not d.ban_mismatch from public.admin_person_detail(member_id) d), 'drift not repaired';

  -- Reactivate.
  perform public.admin_set_user_suspended(member_id, false, 'sorted out');
  assert (select suspended_at is null from public.users where id = member_id), 'flag kept';
  execute 'reset role';
  assert (select banned_until is null from auth.users where id = member_id), 'ban kept';
  perform pg_temp.act_as(admin_id);
  assert (select count(*) from public.admin_audit_log where action = 'reactivate_user') = 1, 'reactivate audit row';
  perform public.admin_set_user_suspended(member_id, false, 'again');
  assert (select count(*) from public.admin_audit_log where action = 'reactivate_user') = 1, 'a repeat reactivate was audited';
  execute 'reset role';
  assert exists (select 1 from public.list_due_telegram_users() where user_id = member_id), 'reactivated person not due';
  perform pg_temp.act_as(admin_id);

  -- Remove the API key: all three columns together, once.
  perform public.admin_remove_user_api_key(member_id, 'asked to');
  execute 'reset role';
  assert (select provider is null and api_key_encrypted is null and api_key_last4 is null from public.user_settings where user_id = member_id), 'key kept';
  perform pg_temp.act_as(admin_id);
  assert (select details = '{"reason":"asked to","provider":"google"}'::jsonb from public.admin_audit_log where action = 'remove_user_api_key'), 'key audit row';
  v_failed := false;
  begin perform public.admin_remove_user_api_key(member_id, 'again'); exception when sqlstate 'AD001' then v_failed := sqlerrm like 'No API key%'; end;
  assert v_failed, 'removed a key twice';
  assert (select count(*) from public.admin_audit_log where action = 'remove_user_api_key') = 1, 'a failed removal was audited';
  assert (select d.key_provider is null and d.key_last4 is null from public.admin_person_detail(member_id) d), 'detail still shows a key';

  -- Delete is refused while another person uses the collections, one way at a time.
  execute 'reset role';
  insert into public.user_collection_domains (user_id, domain_id) values (other_id, d_shared);
  perform pg_temp.act_as(admin_id);
  assert (select d.people_using_collections = 1 from public.admin_person_detail(member_id) d), 'subscriber not counted';
  v_failed := false;
  begin perform public.admin_delete_user(member_id, 'um-member@example.test', 'x'); exception when sqlstate 'AD001' then v_failed := sqlerrm like 'Can''t delete: 1 other person%'; end;
  assert v_failed, 'deleted while someone subscribes';

  execute 'reset role';
  delete from public.user_collection_domains where user_id = other_id;
  insert into public.review_state (user_id, term_id) values (other_id, t_shared);
  perform pg_temp.act_as(admin_id);
  v_failed := false;
  begin perform public.admin_delete_user(member_id, 'um-member@example.test', 'x'); exception when sqlstate 'AD001' then v_failed := true; end;
  assert v_failed, 'deleted while someone has review state on the terms';

  execute 'reset role';
  delete from public.review_state where user_id = other_id;
  insert into public.review_events (user_id, term_id, event) values (other_id, t_shared, 'read');
  perform pg_temp.act_as(admin_id);
  v_failed := false;
  begin perform public.admin_delete_user(member_id, 'um-member@example.test', 'x'); exception when sqlstate 'AD001' then v_failed := true; end;
  assert v_failed, 'deleted while someone has review events on the terms';

  execute 'reset role';
  delete from public.review_events where user_id = other_id;
  insert into public.user_active_domains (user_id, domain_id) values (other_id, d_shared);
  perform pg_temp.act_as(admin_id);
  v_failed := false;
  begin perform public.admin_delete_user(member_id, 'um-member@example.test', 'x'); exception when sqlstate 'AD001' then v_failed := true; end;
  assert v_failed, 'deleted while someone studies the collection';

  execute 'reset role';
  delete from public.user_active_domains where user_id = other_id;
  insert into public.story_collection_prefs (user_id, domain_id, reading_level, cefr_level) values (other_id, d_shared, 'plain', 'B1');
  perform pg_temp.act_as(admin_id);
  v_failed := false;
  begin perform public.admin_delete_user(member_id, 'um-member@example.test', 'x'); exception when sqlstate 'AD001' then v_failed := true; end;
  assert v_failed, 'deleted while someone has story preferences on the collection';

  execute 'reset role';
  delete from public.story_collection_prefs where user_id = other_id;
  perform pg_temp.act_as(admin_id);
  assert (select count(*) from public.admin_audit_log where action = 'delete_user') = 0, 'a refused delete was audited';

  -- Wrong email (case and spaces are forgiven, other text is not).
  v_failed := false;
  begin perform public.admin_delete_user(member_id, 'someone-else@example.test', 'x'); exception when sqlstate 'AD001' then v_failed := sqlerrm like '%doesn''t match%'; end;
  assert v_failed, 'deleted with the wrong email';
  v_failed := false;
  begin perform public.admin_delete_user(member_id, null, 'x'); exception when sqlstate 'AD001' then v_failed := true; end;
  assert v_failed, 'deleted with no email';
  assert exists (select 1 from public.users where id = member_id), 'a refused delete removed the account';

  -- A waitlist row for the member, to check it survives.
  execute 'reset role';
  insert into public.waitlist_requests (email, normalized_email, status) values ('um-member@example.test', 'um-member@example.test', 'pending');
  perform pg_temp.act_as(admin_id);

  -- Delete succeeds: a member who owns collections and signed up with a code.
  execute 'reset role';
  select code into v_code from public.referral_codes where used_by = member_id;
  assert v_code is not null, 'the member has no code';
  perform pg_temp.act_as(admin_id);
  perform public.admin_delete_user(member_id, '  UM-Member@Example.test ', 'requested by them');
  execute 'reset role';
  assert not exists (select 1 from auth.users where id = member_id), 'auth user kept';
  assert not exists (select 1 from public.users where id = member_id), 'user kept';
  assert not exists (select 1 from public.domains where owner_id = member_id), 'collections kept';
  assert not exists (select 1 from public.terms where id = t_shared), 'terms kept';
  assert not exists (select 1 from public.user_settings where user_id = member_id), 'settings kept';
  assert not exists (select 1 from public.telegram_links where user_id = member_id), 'telegram link kept';
  assert not exists (select 1 from auth.sessions where user_id = member_id), 'sessions kept';
  assert exists (select 1 from public.waitlist_requests where normalized_email = 'um-member@example.test'), 'waitlist row removed';
  assert (select used_by is null and used_at is not null from public.referral_codes where code = v_code), 'used code not kept as used';
  assert (select details = '{"reason":"requested by them"}'::jsonb and target_id = member_id::text and actor_id = admin_id
                 and not (details::text ilike '%example.test%') and actor_email = 'um-admin@example.test'
          from public.admin_audit_log where action = 'delete_user'), 'delete audit row';
  assert (select count(*) from public.admin_audit_log where action = 'delete_user') = 1, 'delete audited more than once';
  -- The other person's own data is untouched.
  assert exists (select 1 from public.users where id = other_id), 'someone else was deleted';

  -- Deleting again says so.
  perform pg_temp.act_as(admin_id);
  v_failed := false;
  begin perform public.admin_delete_user(member_id, 'um-member@example.test', 'x'); exception when sqlstate 'AD001' then v_failed := sqlerrm like '%no longer exists%'; end;
  assert v_failed, 'deleted twice';
  execute 'reset role';
end;
$$;

rollback;
