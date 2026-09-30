-- Behavior checks for the admin RPCs and the audit log. One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/admin_rpcs.sql
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
  admin_id uuid := pg_temp.make_user('rpc-admin@example.test', true);
  member_id uuid := pg_temp.make_user('rpc-member@example.test');
  other_id uuid := pg_temp.make_user('rpc-other@example.test');
  d1 uuid;
  d2 uuid;
  d3 uuid;
  t1 uuid;
  t2 uuid;
  t3 uuid;
  v_slug text;
  v_failed boolean;
  v_state text;
  v_count integer;
begin
  -- Fixtures: three collections (the first owned by someone else and shared; an admin can't read another person's private collection), one not built-in.
  insert into public.domains (name, owner_id, is_builtin, visibility) values ('RPC One', other_id, true, 'shared') returning id into d1;
  insert into public.domains (name, owner_id, is_builtin) values ('RPC Two', admin_id, true) returning id into d2;
  insert into public.domains (name, owner_id, is_builtin) values ('RPC Three', admin_id, false) returning id into d3;
  insert into public.terms (domain_id, term, category, definition) values (d1, 'alpha', 'c', 'a') returning id into t1;
  insert into public.terms (domain_id, term, category, definition) values (d1, 'beta', 'c', 'b') returning id into t2;
  insert into public.terms (domain_id, term, category, definition) values (d2, 'gamma', 'c', 'g') returning id into t3;

  -- Privileges: nothing here is callable by anon, and no client can write the audit log.
  assert not has_function_privilege('anon', 'public.admin_publish_collection(uuid,text,jsonb)', 'execute'), 'line 59';
  assert not has_function_privilege('anon', 'public.admin_list_collections()', 'execute'), 'line 60';
  assert not has_function_privilege('anon', 'public.admin_set_narration_enabled(boolean)', 'execute'), 'line 61';
  assert not has_function_privilege('anon', 'public.admin_set_narration_caps(integer,integer)', 'execute'), 'line 62';
  assert not has_function_privilege('anon', 'public.admin_set_narration_provider(text,boolean)', 'execute'), 'anon could switch a narration provider';
  assert not has_function_privilege('anon', 'public.admin_set_ai_credit_settings(integer,integer,integer,integer)', 'execute'), 'line 63';
  assert not has_function_privilege('anon', 'public.admin_write_audit(text,text,text,jsonb)', 'execute'), 'line 64';
  assert not has_function_privilege('authenticated', 'public._admin_audit_insert(text,text,text,jsonb)', 'execute'), 'line 65';
  assert not has_function_privilege('service_role', 'public._admin_audit_insert(text,text,text,jsonb)', 'execute'), 'line 66';
  assert not has_table_privilege('authenticated', 'public.admin_audit_log', 'insert'), 'line 67';
  assert not has_table_privilege('authenticated', 'public.admin_audit_log', 'update'), 'line 68';
  assert not has_table_privilege('authenticated', 'public.admin_audit_log', 'delete'), 'line 69';
  assert not has_table_privilege('service_role', 'public.admin_audit_log', 'insert'), 'line 70';
  assert has_table_privilege('authenticated', 'public.admin_audit_log', 'select'), 'line 71';

  -- A signed-out caller (a role with no user) is refused too.
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role authenticated';
  v_failed := false;
  begin perform public.admin_set_narration_enabled(true); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'a caller with no user could switch narration';
  v_failed := false;
  begin perform public.admin_set_narration_provider('murf', false); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'a caller with no user could switch a narration provider';
  v_failed := false;
  begin perform public.admin_grant_ai_credits(member_id, 5, null); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'a caller with no user could grant credits';
  execute 'reset role';

  -- One audit row exists before the member looks, so "sees none" means something.
  insert into public.admin_audit_log (actor_id, action) values (admin_id, 'seed');

  -- A member is refused by every function.
  perform pg_temp.act_as(member_id);
  v_failed := false;
  begin perform public.admin_publish_collection(d1, 'rpc-one', '{}'::jsonb); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member could publish';
  v_failed := false;
  begin perform public.admin_list_collections(); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member could list collections';
  v_failed := false;
  begin perform public.admin_set_narration_enabled(true); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member could switch narration';
  v_failed := false;
  begin perform public.admin_set_narration_provider('murf', false); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member could switch a narration provider';
  v_failed := false;
  begin perform public.admin_set_narration_caps(null, 5); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member could set caps';
  v_failed := false;
  begin perform public.admin_set_ai_credit_settings(1, 1, 1, 1); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member could set credit settings';
  v_failed := false;
  begin perform public.admin_write_audit('app.test'); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member could write the audit log';
  v_failed := false;
  begin perform public.admin_grant_ai_credits(member_id, 5, null); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member could grant credits';
  v_failed := false;
  begin perform public.admin_reset_ai_credits(member_id, null); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member could reset credits';
  assert (select count(*) from public.admin_audit_log) = 0, 'a member can read audit rows';
  execute 'reset role';

  -- The list shows everything, including a private collection someone else owns, with counts.
  execute 'reset role';
  update public.domains set visibility = 'private' where id = d1;
  perform pg_temp.act_as(admin_id);
  assert not exists (select 1 from public.domains where id = d1), 'test setup: an admin normally cannot read this row';
  assert (select term_count from public.admin_list_collections() c where c.id = d1) = 2, 'count for a private collection of someone else';
  assert (select owner_email from public.admin_list_collections() c where c.id = d1) = 'rpc-other@example.test', 'owner email';
  assert (select term_count from public.admin_list_collections() c where c.id = d2) = 1, 'count';
  assert (select term_count from public.admin_list_collections() c where c.id = d3) = 0, 'no terms shows 0';
  execute 'reset role';
  update public.domains set visibility = 'shared' where id = d1;
  perform pg_temp.act_as(admin_id);

  -- Publishing needs a built-in collection.
  v_failed := false;
  begin perform public.admin_publish_collection(d3, 'rpc-three', '{}'::jsonb); exception when others then v_failed := sqlerrm like 'Only built-in%'; end;
  assert v_failed, 'a non-built-in collection was published';

  -- Bad input is refused, and nothing is left behind.
  v_failed := false;
  begin perform public.admin_publish_collection(d1, 'Bad Slug', jsonb_build_object(t1::text, 'a', t2::text, 'b')); exception when others then v_failed := true; end;
  assert v_failed, 'a bad domain slug was accepted';
  v_failed := false;
  begin perform public.admin_publish_collection(d1, 'rpc-one', jsonb_build_object(t1::text, 'Same', t2::text, 'b')); exception when others then v_failed := true; end;
  assert v_failed, 'a bad term slug was accepted';
  v_failed := false;
  begin perform public.admin_publish_collection(d1, 'rpc-one', jsonb_build_object(t1::text, 'same', t2::text, 'same')); exception when others then v_failed := sqlerrm like 'Two terms%'; end;
  assert v_failed, 'duplicate term slugs were accepted';
  v_failed := false;
  begin perform public.admin_publish_collection(d1, 'rpc-one', jsonb_build_object('not-a-uuid', 'a')); exception when others then v_failed := sqlerrm like 'Term ids%'; end;
  assert v_failed, 'a bad key was accepted';
  v_failed := false;
  begin perform public.admin_publish_collection(d1, 'rpc-one', jsonb_build_object(t3::text, 'a', t1::text, 'b', t2::text, 'c')); exception when others then v_failed := sqlerrm like 'A slug was given%'; end;
  assert v_failed, 'a foreign term was accepted';
  -- A term-slug collision happens after the domain slug was written: all of it must go.
  execute 'reset role';
  update public.terms set slug = 'dup' where id = t2;
  perform pg_temp.act_as(admin_id);
  v_state := null;
  begin
    perform public.admin_publish_collection(d1, 'rpc-one', jsonb_build_object(t1::text, 'dup'));
  exception when unique_violation then v_state := sqlstate;
  end;
  assert v_state = '23505', 'a term slug collision should be a unique violation';
  assert (select slug is null and not is_public from public.domains where id = d1), 'the domain kept its slug after a term collision';
  assert (select slug is null from public.terms where id = t1), 'a term kept its slug after a collision';
  execute 'reset role';
  update public.terms set slug = null where id = t2;
  perform pg_temp.act_as(admin_id);

  -- A null or numeric slug value is refused with a clear message.
  v_failed := false;
  begin perform public.admin_publish_collection(d1, 'rpc-one', jsonb_build_object(t1::text, null)); exception when others then v_failed := sqlerrm like 'A term slug is not valid%'; end;
  assert v_failed, 'a null term slug was accepted';
  v_failed := false;
  begin perform public.admin_publish_collection(d1, 'rpc-one', jsonb_build_object(t1::text, 5)); exception when others then v_failed := sqlerrm like 'A term slug is not valid%'; end;
  assert v_failed, 'a numeric term slug was accepted';

  -- A stale map: a term added after the app looked has no slug, so the publish fails as a whole.
  v_failed := false;
  begin perform public.admin_publish_collection(d1, 'rpc-one', jsonb_build_object(t1::text, 'alpha')); exception when others then v_failed := sqlerrm like 'Some terms have no slug%' and sqlstate = '40001'; end;
  assert v_failed, 'published with an unslugged term';
  assert (select slug is null and not is_public from public.domains where id = d1), 'a failed publish left changes';
  assert (select count(*) from public.terms where domain_id = d1 and slug is not null) = 0, 'a failed publish left term slugs';

  -- The real thing, including a term created by someone else.
  v_slug := public.admin_publish_collection(d1, 'rpc-one', jsonb_build_object(t1::text, 'alpha', t2::text, 'beta'));
  assert v_slug = 'rpc-one', 'line 132';
  assert (select slug = 'rpc-one' and is_public from public.domains where id = d1), 'line 133';
  assert (select slug from public.terms where id = t1) = 'alpha', 'line 134';
  assert (select slug from public.terms where id = t2) = 'beta', 'line 135';

  -- Again: idempotent, keeps the slugs it has, and fills a new term.
  execute 'reset role';
  insert into public.terms (domain_id, term, category, definition) values (d1, 'delta', 'c', 'd') returning id into t3;
  perform pg_temp.act_as(admin_id);
  v_slug := public.admin_publish_collection(d1, 'other-slug', jsonb_build_object(t3::text, 'delta'));
  assert v_slug = 'rpc-one', 'an existing slug must be kept';
  assert (select slug from public.terms where id = t1) = 'alpha', 'line 141';

  -- An empty-string slug counts as missing.
  update public.domains set is_public = false, slug = '' where id = d2;
  update public.terms set slug = '' where domain_id = d2;
  v_slug := public.admin_publish_collection(d2, 'rpc-two', (select jsonb_object_agg(id::text, 'gamma') from public.terms where domain_id = d2));
  assert v_slug = 'rpc-two' and (select slug from public.terms where domain_id = d2) = 'gamma', 'line 147';

  -- A slug already taken by another collection is a unique violation, and nothing sticks.
  update public.domains set is_public = false, slug = null where id = d2;
  update public.terms set slug = null where domain_id = d2;
  v_state := null;
  begin
    perform public.admin_publish_collection(d2, 'rpc-one', (select jsonb_object_agg(id::text, 'gamma') from public.terms where domain_id = d2));
  exception when unique_violation then v_state := sqlstate;
  end;
  assert v_state = '23505', 'a taken slug should be a unique violation';
  assert (select slug is null and not is_public from public.domains where id = d2), 'line 158';

  -- Narration.
  perform public.admin_set_narration_enabled(true);
  assert (select count(*) from public.ai_feature_settings where feature in ('narration_term', 'narration_story') and enabled) = 2, 'line 162';
  v_failed := false;
  begin perform public.admin_set_narration_enabled(null); exception when others then v_failed := true; end;
  assert v_failed, 'null enabled accepted';

  assert (select bool_and(murf_enabled and elevenlabs_enabled) from public.ai_feature_settings where feature in ('narration_term', 'narration_story')), 'both providers start on';
  perform public.admin_set_narration_provider('murf', false);
  assert (select count(*) from public.ai_feature_settings where feature in ('narration_term', 'narration_story') and not murf_enabled and elevenlabs_enabled) = 2, 'murf switched off on both narration features only';
  perform public.admin_set_narration_provider('elevenlabs', false);
  assert (select count(*) from public.ai_feature_settings where feature in ('narration_term', 'narration_story') and not murf_enabled and not elevenlabs_enabled) = 2, 'elevenlabs switched off on both narration features';
  perform public.admin_set_narration_provider('murf', true);
  perform public.admin_set_narration_provider('elevenlabs', true);
  assert exists (select 1 from public.admin_audit_log where action = 'set_narration_provider' and details = jsonb_build_object('provider', 'murf', 'enabled', false)), 'the provider switch is audited';
  v_failed := false;
  begin perform public.admin_set_narration_provider('polly', true); exception when others then v_failed := sqlerrm like 'Unknown narration provider%'; end;
  assert v_failed, 'an unknown provider was accepted';
  v_failed := false;
  begin perform public.admin_set_narration_provider('murf', null); exception when others then v_failed := true; end;
  assert v_failed, 'null provider switch accepted';

  perform public.admin_set_narration_caps(null, 15);
  assert (select daily_cap is null from public.ai_feature_settings where feature = 'narration_term'), 'line 170';
  assert (select daily_cap = 15 from public.ai_feature_settings where feature = 'narration_story'), 'line 171';
  assert exists (select 1 from pg_trigger where tgname = 'ai_feature_settings_set_updated_at' and not tgisinternal), 'the updated_at trigger is what moves the timestamp';
  perform public.admin_set_narration_caps(1000, 1);
  foreach v_count in array array[0, 1001, -1] loop
    v_failed := false;
    begin perform public.admin_set_narration_caps(v_count, 5); exception when others then v_failed := true; end;
    assert v_failed, 'a bad term cap was accepted: ' || v_count;
    v_failed := false;
    begin perform public.admin_set_narration_caps(null, v_count); exception when others then v_failed := true; end;
    assert v_failed, 'a bad story cap was accepted: ' || v_count;
  end loop;
  v_failed := false;
  begin perform public.admin_set_narration_caps(5, null); exception when others then v_failed := true; end;
  assert v_failed, 'a null story cap was accepted';
  assert (select daily_cap = 1000 from public.ai_feature_settings where feature = 'narration_term'), 'a refused call changed a cap';

  -- AI credit settings.
  perform public.admin_set_ai_credit_settings(90, 20, 3, 4);
  assert (select default_allowance = 90 and monthly_refill = 20 from public.ai_credit_settings where id), 'line 189';
  assert (select credit_cost = 3 from public.ai_feature_settings where feature = 'quiz'), 'line 190';
  assert (select credit_cost = 4 from public.ai_feature_settings where feature = 'story'), 'line 191';
  for v_count in 1..4 loop
    v_failed := false;
    begin
      perform public.admin_set_ai_credit_settings(
        case v_count when 1 then -1 else 10 end,
        case v_count when 2 then 1000001 else 10 end,
        case v_count when 3 then 0 else 2 end,
        case v_count when 4 then 1001 else 2 end);
    exception when others then v_failed := true; end;
    assert v_failed, 'bad credit settings accepted, case ' || v_count;
  end loop;
  v_failed := false;
  begin perform public.admin_set_ai_credit_settings(1, 1, null, 1); exception when others then v_failed := true; end;
  assert v_failed, 'a null cost was accepted';
  assert (select credit_cost = 3 from public.ai_feature_settings where feature = 'quiz'), 'a refused call changed a price';

  -- Grant and reset still work and now leave audit rows without emails.
  perform public.admin_grant_ai_credits(member_id, 25, 'beta');
  perform public.admin_reset_ai_credits(member_id, null);
  assert (select count(*) from public.ai_credit_ledger where user_id = member_id) = 2, 'grant and reset ledger rows';
  assert (select details = jsonb_build_object('amount', 25, 'note', 'beta') from public.admin_audit_log where actor_id = admin_id and action = 'grant_ai_credits'), 'grant audit details';
  assert (select target_id = member_id::text from public.admin_audit_log where actor_id = admin_id and action = 'reset_ai_credits'), 'reset audit target';

  -- App-written audit rows.
  perform public.admin_write_audit('app.set_slug', 'domain', d1::text, '{"slug":"x"}'::jsonb);
  v_failed := false;
  begin perform public.admin_write_audit('grant_ai_credits'); exception when others then v_failed := true; end;
  assert v_failed, 'an app audit row posed as an RPC one';
  v_failed := false;
  begin perform public.admin_write_audit('app.' || repeat('a', 100)); exception when others then v_failed := true; end;
  assert v_failed, 'an over-long audit action was accepted';
  v_failed := false;
  begin perform public.admin_write_audit('app.big', null, null, jsonb_build_object('x', repeat('a', 5000))); exception when others then v_failed := true; end;
  assert v_failed, 'oversized audit details accepted';
  perform public.admin_write_audit('app.edge', null, null, jsonb_build_object('x', repeat('a', 4000)));
  v_failed := false;
  begin perform public.admin_write_audit('app.array', null, null, '[]'::jsonb); exception when others then v_failed := true; end;
  assert v_failed, 'non-object audit details accepted';

  -- The audit trail: exactly what this run did, by this admin, and nothing for refused calls.
  assert (select count(*) from public.admin_audit_log where actor_id = admin_id and actor_email = 'rpc-admin@example.test') = 15, 'unexpected number of audit rows';
  assert (select count(*) from public.admin_audit_log where actor_id = admin_id and action = 'publish_collection') = 3, 'publish audit rows';
  assert (select count(*) from public.admin_audit_log where actor_id = admin_id and action = 'set_narration_enabled') = 1, 'narration enabled audit rows';
  assert (select count(*) from public.admin_audit_log where actor_id = admin_id and action = 'set_narration_caps') = 2, 'narration caps audit rows';
  assert (select count(*) from public.admin_audit_log where actor_id = admin_id and action = 'set_ai_credit_settings') = 1, 'credit settings audit rows';
  assert exists (select 1 from public.admin_audit_log where actor_id = admin_id and action = 'publish_collection' and target_id = d1::text and details->>'slug' = 'rpc-one'), 'publish audit details';
  assert (select details->'new'->>'quiz_cost' = '3' and details->'old'->>'quiz_cost' = '1' and details->'old'->>'default_allowance' = '100'
          from public.admin_audit_log where actor_id = admin_id and action = 'set_ai_credit_settings'), 'old and new values in the credit settings audit row';
  execute 'reset role';

  -- Clients still can't write the audit log directly.
  perform pg_temp.act_as(admin_id);
  v_failed := false;
  begin insert into public.admin_audit_log (action) values ('forged'); exception when insufficient_privilege then v_failed := true; end;
  assert v_failed, 'an admin could insert into the audit log directly';
  execute 'reset role';
end;
$$;

rollback;
