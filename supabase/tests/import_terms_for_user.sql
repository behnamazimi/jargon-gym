-- Behavior checks for the internal import function used when delivering requested collections. One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/import_terms_for_user.sql
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

do $$
declare
  me uuid := pg_temp.make_user('for-user-owner@example.test');
  r jsonb;
  v_failed boolean;
begin
  -- Not callable by any client role.
  assert not has_function_privilege('authenticated', 'public._import_terms_for(uuid, uuid, jsonb, jsonb, jsonb, text, text, text, text, text)', 'execute'), 'authenticated can call it';
  assert not has_function_privilege('anon', 'public._import_terms_for(uuid, uuid, jsonb, jsonb, jsonb, text, text, text, text, text)', 'execute'), 'anon can call it';
  assert not has_function_privilege('service_role', 'public._import_terms_for(uuid, uuid, jsonb, jsonb, jsonb, text, text, text, text, text)', 'execute'), 'service_role can call it';

  -- It writes for the user it is given, not for the caller.
  r := public._import_terms_for(
    me, gen_random_uuid(),
    '{"name": "Kubernetes", "language": "en"}',
    '[{"term":"Pod","definition":"Smallest deployable unit"}]', '[]',
    'skip', 'request', 'paste', 'lines', 'suffix');
  assert (select d.owner_id = me and d.visibility = 'private'
          from public.domains d where d.id = (r->>'domain_id')::uuid), 'owned privately by the given user';
  assert exists (select 1 from public.user_active_domains where user_id = me and domain_id = (r->>'domain_id')::uuid), 'active for the given user';
  assert (select entry from public.import_batches where user_id = me) = 'request', 'batch entry';

  -- A taken name gets a suffix.
  r := public._import_terms_for(me, gen_random_uuid(), '{"name": "Kubernetes", "language": "en"}',
    '[{"term":"Pod","definition":"x"}]', '[]', 'skip', 'request', 'paste', 'lines', 'suffix');
  assert r->>'domain_name' = 'Kubernetes (2)', 'second name';
  r := public._import_terms_for(me, gen_random_uuid(), '{"name": "kubernetes", "language": "en"}',
    '[{"term":"Pod","definition":"x"}]', '[]', 'skip', 'request', 'paste', 'lines', 'suffix');
  assert r->>'domain_name' = 'kubernetes (3)', 'third name, case-insensitive';

  -- The default still fails on a taken name, and nothing is left behind.
  begin
    perform public._import_terms_for(me, gen_random_uuid(), '{"name": "Kubernetes", "language": "en"}',
      '[{"term":"Pod","definition":"x"}]', '[]', 'skip', 'request', 'paste', 'lines');
    v_failed := false;
  exception when others then
    v_failed := sqlerrm = 'collection_name_taken';
  end;
  assert v_failed, 'default fails on a taken name';
  assert (select count(*) from public.domains d where d.owner_id = me and lower(name) like 'kubernetes%') = 3, 'no extra domain';
end;
$$;

rollback;
