-- Behavior checks for narration access on the feature tables: access rules,
-- per-feature allowlists, no credits, grants and the usage log. One
-- transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/ai_narration_features.sql
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
  u1 uuid := pg_temp.make_user('n1@example.test');
  u2 uuid := pg_temp.make_user('n2@example.test');
  admin_id uuid := pg_temp.make_user('nadmin@example.test', true);
  v_ledger_before bigint;
  v_failed boolean;
begin
  select count(*) into v_ledger_before from public.ai_credit_ledger;

  update public.ai_feature_settings set enabled = true, access_mode = 'allowlist'
  where feature in ('narration_term', 'narration_story');
  assert not public.has_feature_access(u1, 'narration_term'), 'not on the list yet';
  insert into public.ai_feature_allowlist (feature, user_id) values ('narration_term', u1);
  assert public.has_feature_access(u1, 'narration_term'), 'allowlisted user has access';
  delete from public.ai_feature_allowlist where user_id = u1;
  assert not public.has_feature_access(u1, 'narration_term'), 'removed user loses access';

  -- Access rules, called with no JWT, the way the server role does.
  assert not public.has_feature_access(u2, 'narration_term'), 'strangers have no access';
  assert not public.has_feature_access(admin_id, 'narration_term'), 'admins get no automatic narration access';
  assert not public.has_feature_access(null, 'narration_term'), 'no user, no access';
  assert not public.has_feature_access(u1, 'no_such_feature'), 'unknown feature has no access';

  update public.ai_feature_settings set access_mode = 'admin' where feature = 'narration_term';
  assert public.has_feature_access(admin_id, 'narration_term'), 'admin mode lets admins in';
  assert not public.has_feature_access(u2, 'narration_term'), 'admin mode keeps everyone else out';
  update public.ai_feature_settings set access_mode = 'everyone' where feature = 'narration_term';
  assert public.has_feature_access(u2, 'narration_term'), 'everyone mode lets anyone in';
  update public.ai_feature_settings set enabled = false where feature = 'narration_term';
  assert not public.has_feature_access(u2, 'narration_term'), 'a disabled feature blocks everyone';
  assert not public.has_feature_access(admin_id, 'narration_term'), 'admins too';
  update public.ai_feature_settings set access_mode = 'allowlist', enabled = true where feature = 'narration_term';

  -- Allowlist rows are per feature: one for the term does not open stories.
  insert into public.ai_feature_allowlist (feature, user_id) values ('narration_term', u2);
  assert public.has_feature_access(u2, 'narration_term'), 'listed for terms';
  assert not public.has_feature_access(u2, 'narration_story'), 'but not for stories';

  -- Narration never reaches the credit ledger.
  assert (select count(*) from public.ai_credit_ledger) = v_ledger_before, 'the ledger must not change';
  begin
    perform public.reserve_ai_credits(u1, 'narration_story', 1);
    v_failed := false;
  exception when raise_exception then
    v_failed := true;
  end;
  assert v_failed, 'narration cannot be reserved in credits';

  -- Grants.
  assert has_function_privilege('service_role', 'public.has_feature_access(uuid, text)', 'execute');
  assert not has_function_privilege('authenticated', 'public.has_feature_access(uuid, text)', 'execute');
  assert not has_function_privilege('anon', 'public.has_feature_access(uuid, text)', 'execute');
  assert has_table_privilege('service_role', 'public.ai_usage_events', 'insert');
  assert has_table_privilege('service_role', 'public.ai_usage_events', 'select');
  assert not has_table_privilege('service_role', 'public.ai_usage_events', 'update');
  assert not has_table_privilege('service_role', 'public.ai_usage_events', 'delete');
  assert not has_table_privilege('authenticated', 'public.ai_usage_events', 'insert');

  -- Usage events: only allowed outcomes and known features.
  insert into public.ai_usage_events (user_id, feature, units, outcome) values (u1, 'narration_term', 120, 'ok');
  begin
    insert into public.ai_usage_events (user_id, feature, units, outcome) values (u1, 'narration_term', 1, 'weird');
    v_failed := false;
  exception when check_violation then
    v_failed := true;
  end;
  assert v_failed, 'usage outcome is limited to ok or failed';
  begin
    insert into public.ai_usage_events (user_id, feature, units, outcome) values (u1, 'not_a_feature', 1, 'ok');
    v_failed := false;
  exception when foreign_key_violation then
    v_failed := true;
  end;
  assert v_failed, 'usage rows need a registered feature';
end;
$$;

rollback;
\echo ai_narration_features.sql: ok
