-- Behavior checks for the twelve supported collection languages. One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/more_languages.sql
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
  me uuid := pg_temp.make_user('lang-me@example.test');
  v_code text;
  r jsonb;
begin
  -- The helper knows all twelve codes and nothing else.
  foreach v_code in array array['en','nl','es','fr','de','it','pt','ru','tr','ja','ko','zh'] loop
    assert public.is_supported_language(v_code), v_code || ' is supported';
  end loop;
  assert not public.is_supported_language('xx'), 'unknown code';
  assert not public.is_supported_language(''), 'empty code';

  -- An import in a new language creates a collection with that language.
  r := public._import_terms_for(
    me, gen_random_uuid(),
    '{"name": "Spanish basics", "language": "es"}',
    '[{"term":"sobremesa","definition":"time at the table after a meal"}]', '[]',
    'skip', 'request', 'paste', 'lines', 'suffix');
  assert (select d.language from public.collections d where d.id = (r->>'collection_id')::uuid) = 'es', 'imported as es';

  -- An unknown language is still refused.
  assert pg_temp.fails_with(
    $q$select public._import_terms_for(
      '$q$ || me || $q$', gen_random_uuid(), '{"name": "Klingon", "language": "xx"}',
      '[{"term":"a","definition":"b"}]', '[]', 'skip', 'request', 'paste', 'lines', 'suffix')$q$,
    'invalid'), 'unknown language refused';

  -- Requests accept a new language and refuse an unknown one.
  update public.collection_request_settings set enabled = true;
  perform pg_temp.act_as(me);
  assert pg_temp.fails_with($q$select public.my_create_collection_request('Cooking verbs', 'vocabulary', 'xx')$q$, 'invalid_request'), 'request in xx refused';
  r := public.my_create_collection_request('Cooking verbs', 'vocabulary', 'ja', 'a1_a2');
  assert (select language from public.collection_requests where id = (r->>'id')::uuid) = 'ja', 'request stored as ja';
  execute 'reset role';
end;
$$;

rollback;
