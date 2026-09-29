-- Behavior checks for AI feature settings, the ledger's billable rule and the
-- run guard. One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/ai_feature_settings.sql
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

do $$
declare
  u1 uuid := pg_temp.make_user('f1@example.test');
  u2 uuid := pg_temp.make_user('f2@example.test');
  admin_id uuid := pg_temp.make_user('fadmin@example.test', true);
  v_ledger bigint;
  v_token uuid;
  v_token2 uuid;
  v_status text;
  v_count integer;
  v_failed boolean;
begin
  -- The seeded features are exactly the registry's (lib/ai/registry.ts).
  assert (select array_agg(feature order by feature) from public.ai_feature_settings)
    = array['narration_story', 'narration_term', 'quiz', 'story', 'term_evaluation'],
    'seeded features should match the registry';

  -- Quiz and Stories keep today's behavior; costs come from the credit settings.
  assert (select enabled and access_mode = 'everyone' from public.ai_feature_settings where feature = 'quiz'),
    'quiz should be enabled for everyone';
  assert (select credit_cost from public.ai_feature_settings where feature = 'quiz')
    = (select quiz_credits_per_question from public.ai_credit_settings where id),
    'quiz cost should match the credit settings';

  -- Narration: the toggle and allowlist are copied, not opened up or lost.
  assert (select enabled from public.ai_feature_settings where feature = 'narration_term')
    = (select enabled from public.narration_settings where id),
    'narration toggle should be copied';
  assert (select count(*) from public.ai_feature_allowlist where feature = 'narration_term')
    = (select count(*) from public.narration_allowlist),
    'term narration allowlist should match';
  assert (select count(*) from public.ai_feature_allowlist where feature = 'narration_story')
    = (select count(*) from public.narration_allowlist),
    'story narration allowlist should match';
  assert (select access_mode = 'allowlist' and daily_cap = 20 from public.ai_feature_settings where feature = 'narration_story'),
    'story narration keeps its cap of 20';

  -- A new feature is off and admin-only until someone opens it up.
  insert into public.ai_feature_settings (feature, billable, unit) values ('new_feature', false, 'x');
  assert (select not enabled and access_mode = 'admin' from public.ai_feature_settings where feature = 'new_feature'),
    'new features default to disabled and admin only';
  -- The allowlist is per feature.
  insert into public.ai_feature_allowlist (feature, user_id) values ('new_feature', u1);
  assert (select count(*) from public.ai_feature_allowlist where feature = 'new_feature' and user_id = u1) = 1;
  assert (select count(*) from public.ai_feature_allowlist where feature = 'quiz' and user_id = u1) = 0,
    'an allowlist row for one feature must not grant another';

  -- Billable exactly when a cost is set.
  begin
    insert into public.ai_feature_settings (feature, billable, unit) values ('bad_a', true, 'x');
    v_failed := false;
  exception when check_violation then
    v_failed := true;
  end;
  assert v_failed, 'a billable feature needs a credit cost';

  -- A missing timeout falls back to the default rather than locking the user out.
  v_token := public.begin_ai_run(u2, 'term_evaluation', null);
  assert v_token is not null, 'a run with a null timeout should start';
  update public.ai_feature_runs set started_at = now() - interval '5 minutes' where user_id = u2 and feature = 'term_evaluation';
  assert public.begin_ai_run(u2, 'term_evaluation', null) is not null, 'a null timeout should still expire';

  -- Narration and other non-billable features can't be reserved or written to the ledger.
  begin
    perform public.reserve_ai_credits(u1, 'narration_term', 1);
    v_failed := false;
  exception when raise_exception then
    v_failed := true;
  end;
  assert v_failed, 'reserve should refuse a non-billable feature';

  begin
    perform public.reserve_ai_credits(u1, 'no_such_feature', 1);
    v_failed := false;
  exception when raise_exception then
    v_failed := true;
  end;
  assert v_failed, 'reserve should refuse an unknown feature';

  begin
    insert into public.ai_credit_ledger (user_id, kind, feature, amount) values (u1, 'spend', 'narration_term', 1);
    v_failed := false;
  exception when foreign_key_violation then
    v_failed := true;
  end;
  assert v_failed, 'the ledger should reject a non-billable feature';

  -- Spend and refund still work with the foreign key.
  select ledger_id into v_ledger from public.reserve_ai_credits(u1, 'quiz', 5);
  assert v_ledger is not null, 'reserve should still work';
  perform public.refund_ai_credits(v_ledger);
  assert (select count(*) from public.ai_credit_ledger where refund_of = v_ledger) = 1, 'refund should still work';

  -- Feature switch off: reserve reports disabled without spending.
  update public.ai_feature_settings set enabled = false where feature = 'story';
  select status into v_status from public.reserve_ai_credits(u1, 'story', 1);
  assert v_status = 'disabled', 'a disabled feature should report disabled';
  select status into v_status from public.reserve_ai_credits(u1, 'quiz', 1);
  assert v_status = 'ok', 'other features are unaffected by one feature switch';
  update public.ai_feature_settings set enabled = true where feature = 'story';

  -- Credits switch off blocks credits without touching the feature row.
  update public.ai_credit_settings set enabled = false;
  select status into v_status from public.reserve_ai_credits(u1, 'quiz', 1);
  assert v_status = 'disabled', 'credits switch should still block';
  assert (select enabled from public.ai_feature_settings where feature = 'quiz'), 'feature row unchanged';
  update public.ai_credit_settings set enabled = true;

  -- Costs edited on the old admin page flow to the feature rows, even as an admin.
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.ai_credit_settings set quiz_credits_per_question = 4, story_credits_per_term = 6;
  execute 'reset role';
  assert (select credit_cost from public.ai_feature_settings where feature = 'quiz') = 4, 'quiz cost should follow';
  assert (select credit_cost from public.ai_feature_settings where feature = 'story') = 6, 'story cost should follow';

  -- Run guard.
  v_token := public.begin_ai_run(u1, 'quiz', 120);
  assert v_token is not null, 'first run should start';
  assert public.begin_ai_run(u1, 'quiz', 120) is null, 'a second run should be refused while one is active';
  assert public.begin_ai_run(u1, 'story', 120) is not null, 'the guard is per feature';
  assert public.begin_ai_run(u2, 'quiz', 120) is not null, 'the guard is per user';
  perform public.end_ai_run(u1, 'quiz', gen_random_uuid());
  assert public.begin_ai_run(u1, 'quiz', 120) is null, 'a wrong token must not release the guard';
  perform public.end_ai_run(u1, 'quiz', v_token);
  v_token2 := public.begin_ai_run(u1, 'quiz', 120);
  assert v_token2 is not null, 'released guard allows a new run';

  -- An expired guard is taken over, and the old holder can't release the new one.
  update public.ai_feature_runs set started_at = now() - interval '5 minutes' where user_id = u1 and feature = 'quiz';
  v_token := public.begin_ai_run(u1, 'quiz', 120);
  assert v_token is not null and v_token <> v_token2, 'an expired guard should be taken over';
  perform public.end_ai_run(u1, 'quiz', v_token2);
  assert public.begin_ai_run(u1, 'quiz', 120) is null, 'the old holder must not free the new guard';

  -- Grants: the app's server role reads settings and allowlists, runs the guard,
  -- and cannot change settings; signed-in users read settings only.
  assert has_table_privilege('service_role', 'public.ai_feature_settings', 'select');
  assert not has_table_privilege('service_role', 'public.ai_feature_settings', 'update');
  assert not has_table_privilege('service_role', 'public.ai_feature_settings', 'insert');
  assert has_table_privilege('authenticated', 'public.ai_feature_settings', 'select');
  assert not has_table_privilege('authenticated', 'public.ai_feature_settings', 'insert');
  assert has_column_privilege('authenticated', 'public.ai_feature_settings', 'enabled', 'update');
  assert not has_column_privilege('authenticated', 'public.ai_feature_settings', 'credit_cost', 'update');
  assert not has_column_privilege('authenticated', 'public.ai_feature_settings', 'billable', 'update');
  assert has_table_privilege('service_role', 'public.ai_feature_allowlist', 'select');
  assert not has_table_privilege('service_role', 'public.ai_feature_allowlist', 'insert');
  assert has_table_privilege('service_role', 'public.ai_feature_runs', 'insert');
  assert has_table_privilege('service_role', 'public.ai_feature_runs', 'update');
  assert has_table_privilege('service_role', 'public.ai_feature_runs', 'delete');
  assert not has_table_privilege('authenticated', 'public.ai_feature_runs', 'select');
  assert has_function_privilege('service_role', 'public.begin_ai_run(uuid, text, integer)', 'execute');
  assert not has_function_privilege('authenticated', 'public.begin_ai_run(uuid, text, integer)', 'execute');
  assert not has_function_privilege('anon', 'public.end_ai_run(uuid, text, uuid)', 'execute');
  assert not has_function_privilege('authenticated', 'public.sync_ai_feature_costs()', 'execute');

  -- A non-admin cannot change settings through RLS.
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.ai_feature_settings set enabled = false where feature = 'quiz';
  get diagnostics v_count = row_count;
  execute 'reset role';
  assert v_count = 0, 'a non-admin update should touch no rows';
  assert (select enabled from public.ai_feature_settings where feature = 'quiz'), 'quiz should still be enabled';

  -- An admin can switch a feature off, but cannot change its cost directly.
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.ai_feature_settings set enabled = false where feature = 'quiz';
  get diagnostics v_count = row_count;
  assert v_count = 1, 'an admin update of the switch should change one row';
  begin
    update public.ai_feature_settings set credit_cost = 9 where feature = 'quiz';
    v_failed := false;
  exception when insufficient_privilege then
    v_failed := true;
  end;
  execute 'reset role';
  assert v_failed, 'an admin should not be able to write credit_cost';
  assert not (select enabled from public.ai_feature_settings where feature = 'quiz'), 'quiz should now be off';
end;
$$;

rollback;
\echo ai_feature_settings.sql: ok
