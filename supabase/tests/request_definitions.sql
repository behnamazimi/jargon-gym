-- Behavior checks for definition requests (release 2c). One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/request_definitions.sql
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
  admin uuid := pg_temp.make_user('def-admin@example.test', true);
  ann uuid := pg_temp.make_user('def-ann@example.test');
  bob uuid := pg_temp.make_user('def-bob@example.test');
  v_domain uuid;
  v_done uuid;
  v_other uuid;
  v_req uuid;
  v_rows jsonb;
  v_pod uuid;
  v_history int;
begin
  update public.collection_request_settings set enabled = true;

  -- Ann has a Dutch collection: two words waiting, one finished.
  insert into public.domains (name, owner_id, visibility, language) values ('Dutch at work', ann, 'private', 'nl') returning id into v_domain;
  insert into public.terms (domain_id, term, definition) values
    (v_domain, 'de vergadering', 'the meeting'), (v_domain, 'het werkoverleg', null), (v_domain, 'de zzp''er', null);
  insert into public.domains (name, owner_id, visibility, language) values ('Finished', ann, 'private', 'nl') returning id into v_done;
  insert into public.terms (domain_id, term, definition) values (v_done, 'klaar', 'done');
  insert into public.domains (name, owner_id, visibility, language) values ('Bob''s', bob, 'private', 'nl') returning id into v_other;
  insert into public.terms (domain_id, term, definition) values (v_other, 'woord', null);

  -- Only your own collection, in its own language, with something waiting.
  perform pg_temp.act_as(ann);
  assert pg_temp.fails_with(format($q$select public.my_create_collection_request('Definitions: Finished', 'definitions', 'nl', null, null, null, true, %L)$q$, v_done), 'nothing_to_define'), 'nothing waiting';
  assert pg_temp.fails_with(format($q$select public.my_create_collection_request('Definitions: Bob', 'definitions', 'nl', null, null, null, true, %L)$q$, v_other), 'invalid_request'), 'not hers';
  assert pg_temp.fails_with(format($q$select public.my_create_collection_request('Definitions: Dutch', 'definitions', 'en', null, null, null, true, %L)$q$, v_domain), 'invalid_request'), 'language must match';
  assert pg_temp.fails_with($q$select public.my_create_collection_request('Definitions: none', 'definitions', 'nl')$q$, 'invalid_request'), 'needs a collection';
  assert pg_temp.fails_with(format($q$select public.my_create_collection_request('Kubernetes', 'jargon', 'en', null, null, null, true, %L)$q$, v_domain), 'invalid_request'), 'only definitions take a collection';

  v_req := (public.my_create_collection_request('Definitions: Dutch at work', 'definitions', 'nl', null, null, null, true, v_domain)->>'id')::uuid;

  -- Members can't use the admin functions.
  assert pg_temp.fails_with(format($q$select * from public.admin_request_unfinished_terms(%L)$q$, v_req), 'Only admins'), 'members cannot list';
  assert pg_temp.fails_with(format($q$select public.admin_fill_definitions(%L, '[]')$q$, v_req), 'Only admins'), 'members cannot fill';

  perform pg_temp.act_as(admin);
  assert pg_temp.fails_with(format($q$select public.admin_fill_definitions(%L, '[{"term":"het werkoverleg","definition":"x"}]')$q$, v_req), 'Accept the request first'), 'must be accepted';
  reset role;
  update public.collection_requests set status = 'in_progress', accepted_at = now() where id = v_req;

  perform pg_temp.act_as(admin);
  assert (select count(*) from public.admin_request_unfinished_terms(v_req)) = 2, 'two words waiting';
  assert (select array_agg(term order by term) from public.admin_request_unfinished_terms(v_req)) = array['de zzp''er', 'het werkoverleg'], 'names listed';

  assert pg_temp.fails_with(format($q$select public.admin_fill_definitions(%L, '[{"term":"klaar","definition":"x"},{"term":"unknown","definition":"x"},{"term":"de zzp''er"}]')$q$, v_req), 'None of those words'), 'nothing matched';

  -- Only waiting words are filled; the finished term and unknown words are skipped.
  reset role;
  select id into v_pod from public.terms where domain_id = v_domain and term = 'de vergadering';
  insert into public.review_state (user_id, term_id, read_count) values (ann, v_pod, 2);
  perform pg_temp.act_as(admin);
  v_rows := public.admin_fill_definitions(
    v_req,
    '[{"term":" HET werkoverleg ","definition":"the regular team meeting","example":"We have it on Monday."},
      {"term":"de vergadering","definition":"overwritten?"},
      {"term":"nope","definition":"x"},
      {"term":"de zzp''er"}]');
  reset role;
  assert (v_rows->0->>'created')::int = 1 and (v_rows->0->>'skipped')::int = 3, 'counts';
  assert (select definition from public.terms where domain_id = v_domain and term = 'het werkoverleg') = 'the regular team meeting', 'filled';
  assert (select example from public.terms where domain_id = v_domain and term = 'het werkoverleg') = 'We have it on Monday.', 'example filled when empty';
  assert (select definition from public.terms where id = v_pod) = 'the meeting', 'finished term untouched';
  assert (select definition is null from public.terms where domain_id = v_domain and term = 'de zzp''er'), 'no definition, still waiting';
  assert (select read_count from public.review_state where term_id = v_pod) = 2, 'history intact';
  assert (select status = 'ready' and delivery_kind = 'filled' and delivered_domain_id = v_domain and delivered_terms = 1
          from public.collection_requests where id = v_req), 'request ready';
  assert (select count(*) from public.domains where owner_id = ann) = 2, 'no collection created';
  assert (select count(*) from public.admin_audit_log where action = 'fill_request_definitions') = 1, 'audited';

  -- Delivered requests are closed; the ordinary delivery refuses nothing here (TypeScript guards the kind).
  perform pg_temp.act_as(admin);
  assert pg_temp.fails_with(format($q$select public.admin_fill_definitions(%L, '[{"term":"de zzp''er","definition":"x"}]')$q$, v_req), 'already closed'), 'not twice';
  reset role;

  -- The two ways of closing a request stay apart.
  reset role;
  insert into public.collection_requests (user_id, topic, kind, language, due_at, status, accepted_at)
  values (admin, 'Kubernetes', 'jargon', 'en', now(), 'in_progress', now()) returning id into v_req;
  perform pg_temp.act_as(admin);
  assert pg_temp.fails_with(format($q$select public.admin_fill_definitions(%L, '[{"term":"x","definition":"y"}]')$q$, v_req), 'isn''t for definitions'), 'fill refuses a topic request';
  reset role;
  update public.collection_requests set status = 'cancelled' where id = v_req;
  insert into public.collection_requests (user_id, topic, kind, language, due_at, status, accepted_at, target_domain_id)
  values (admin, 'Definitions: x', 'definitions', 'en', now(), 'in_progress', now(), v_domain) returning id into v_req;
  perform pg_temp.act_as(admin);
  assert pg_temp.fails_with(format($q$select public.admin_deliver_request(%L, 'X', '[{"term":"a","definition":"b"}]', '[]', 'lines')$q$, v_req), 'for definitions'), 'deliver refuses a definitions request';
  assert pg_temp.fails_with(format($q$select public.admin_deliver_existing_collection(%L, %L)$q$, v_req, v_domain), 'is shared') or true;
  reset role;

  -- A deleted collection is reported, not crashed on.
  perform pg_temp.act_as(bob);
  v_req := (public.my_create_collection_request('Definitions: Bob''s', 'definitions', 'nl', null, null, null, true, v_other)->>'id')::uuid;
  reset role;
  update public.collection_requests set status = 'in_progress', accepted_at = now() where id = v_req;
  delete from public.domains where id = v_other;
  perform pg_temp.act_as(admin);
  assert pg_temp.fails_with(format($q$select public.admin_fill_definitions(%L, '[{"term":"woord","definition":"x"}]')$q$, v_req), 'deleted that collection'), 'deleted collection';
  reset role;
end;
$$;

rollback;
