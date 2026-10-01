-- Behavior checks for the import commit (phase 1 of the import redesign). One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/unfinished_terms.sql
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
  me uuid := pg_temp.make_user('import-me@example.test');
  other uuid := pg_temp.make_user('import-other@example.test');
  imp1 uuid := gen_random_uuid();
  imp2 uuid := gen_random_uuid();
  imp3 uuid := gen_random_uuid();
  r jsonb;
  d1 uuid;
  t_sla uuid;
  v_failed boolean;
  v_msg text;
begin
  perform pg_temp.act_as(me);

  -- A new collection with a mix of finished and unfinished terms and a link.
  r := public.my_import_terms(
    imp1,
    '{"name": "Dutch at work", "language": "nl"}',
    '[{"term":"SLA","definition":"Promised service level","category":"Legal"},
      {"term":"Churn"},
      {"term":"sla","definition":"repeat, ignored"},
      {"term":"Runway","definition":"Months of cash"}]',
    '[{"source":"SLA","target":"Runway","relationship_type":"related","description":"x"},
      {"source":"SLA","target":"Missing","relationship_type":"related"}]',
    'skip', 'chooser', 'paste', 'lines');
  assert (r->>'created')::int = 3 and (r->>'unfinished')::int = 1, 'created/unfinished counts';
  assert (r->>'relationships_created')::int = 1 and (r->>'relationships_dropped')::int = 1, 'link counts';
  d1 := (r->>'domain_id')::uuid;
  assert (select language = 'nl' and visibility = 'private' from public.domains where id = d1), 'domain shape';
  assert exists (select 1 from public.user_active_domains where user_id = me and domain_id = d1), 'active';
  assert (select count(*) from public.terms where domain_id = d1) = 3, 'term rows';
  assert (select definition is null from public.terms where domain_id = d1 and term = 'Churn'), 'churn unfinished';

  -- The same import id again returns the stored result and adds nothing.
  r := public.my_import_terms(imp1, '{"name": "Other name"}', '[{"term":"New"}]', '[]', 'skip');
  assert (r->>'already_applied')::boolean and (r->>'domain_name') = 'Dutch at work', 'idempotent';
  assert (select count(*) from public.terms where domain_id = d1) = 3, 'a retry added terms';

  -- Skip leaves existing terms alone; Update changes them in place and never blanks a value.
  select id into t_sla from public.terms where domain_id = d1 and term = 'SLA';
  r := public.my_import_terms(
    imp2, jsonb_build_object('domain_id', d1),
    '[{"term":"  sla ","definition":"Changed"},{"term":"Brand new","definition":"B"}]', '[]', 'skip');
  assert (r->>'skipped')::int = 1 and (r->>'created')::int = 1, 'skip counts';
  assert (select definition = 'Promised service level' from public.terms where id = t_sla), 'skip changed a term';

  r := public.my_import_terms(
    imp3, jsonb_build_object('domain_id', d1),
    '[{"term":"SLA","definition":"","category":"","example":"An example"},{"term":"Churn","definition":"Customers leaving"}]',
    '[]', 'update');
  assert (r->>'updated')::int = 2, 'update counts';
  assert (select definition = 'Promised service level' and category = 'Legal' and example = 'An example'
          from public.terms where id = t_sla), 'update blanked or missed a value';
  assert (select definition = 'Customers leaving' from public.terms where domain_id = d1 and term = 'Churn'), 'unfinished term not finished';

  -- A failing batch leaves nothing behind, not even its batch row.
  v_failed := false;
  begin
    perform public.my_import_terms(
      gen_random_uuid(), '{"name": "Half done"}',
      '[{"term":"Fine","definition":"ok"},{"term":"   "}]', '[]', 'skip');
  exception when others then v_failed := true; v_msg := sqlerrm;
  end;
  assert v_failed and v_msg = 'invalid_term', 'bad term should fail';
  assert not exists (select 1 from public.domains where name = 'Half done'), 'a failed import left a collection';

  -- Names are never merged silently.
  v_failed := false;
  begin
    perform public.my_import_terms(gen_random_uuid(), '{"name": "dutch AT work"}', '[{"term":"X"}]', '[]', 'skip');
  exception when others then v_failed := true; v_msg := sqlerrm;
  end;
  assert v_failed and v_msg = 'collection_name_taken', 'name collision';

  -- Limits.
  v_failed := false;
  begin
    perform public.my_import_terms(gen_random_uuid(), '{"name": "Big"}',
      (select jsonb_agg(jsonb_build_object('term', 't' || g)) from generate_series(1, 501) g), '[]', 'skip');
  exception when others then v_failed := true; v_msg := sqlerrm;
  end;
  assert v_failed and v_msg = 'import_too_large', 'cap';
  v_failed := false;
  begin
    perform public.my_import_terms(gen_random_uuid(), '{"name": "Empty"}', '[]', '[]', 'skip');
  exception when others then v_failed := true; v_msg := sqlerrm;
  end;
  assert v_failed and v_msg = 'empty_import', 'empty';

  -- Someone else's collection and someone else's import id are refused.
  perform pg_temp.act_as(other);
  v_failed := false;
  begin
    perform public.my_import_terms(gen_random_uuid(), jsonb_build_object('domain_id', d1), '[{"term":"Sneaky"}]', '[]', 'skip');
  exception when others then v_failed := true; v_msg := sqlerrm;
  end;
  assert v_failed and v_msg = 'destination_not_found', 'imported into another user''s collection';
  v_failed := false;
  begin
    perform public.my_import_terms(imp1, '{"name": "Mine"}', '[{"term":"X"}]', '[]', 'skip');
  exception when others then v_failed := true; v_msg := sqlerrm;
  end;
  assert v_failed and v_msg = 'import_id_conflict', 'reused another user''s import id';

  -- Batches are private to their owner.
  assert (select count(*) from public.import_batches) = 0, 'a batch leaked';
  execute 'reset role';
end;
$$;

rollback;
