-- Behavior checks for admin_queue_debug_terms. One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/admin_queue_debug.sql
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
  admin_id uuid := pg_temp.make_user('queue-admin@example.test', true);
  member_id uuid := pg_temp.make_user('queue-member@example.test');
  other_id uuid := pg_temp.make_user('queue-other@example.test');
  d_member uuid;
  d_other uuid;
  d_off uuid;
  d_added uuid;
  t_known uuid;
  v_rows json;
  v_failed boolean;
begin
  insert into public.collections (name, owner_id) values ('Queue Mine', member_id) returning id into d_member;
  insert into public.collections (name, owner_id) values ('Queue Theirs', other_id) returning id into d_other;
  insert into public.terms (collection_id, term, category, definition) values (d_member, 'finished', 'c', 'has a definition');
  insert into public.terms (collection_id, term) values (d_member, 'draft');
  insert into public.terms (collection_id, term, category, definition) values (d_other, 'elsewhere', 'c', 'x');

  -- An owned collection that is switched off, and a collection added from someone else.
  insert into public.collections (name, owner_id) values ('Queue Off', member_id) returning id into d_off;
  insert into public.collections (name, owner_id) values ('Queue Added', other_id) returning id into d_added;
  insert into public.terms (collection_id, term, category, definition) values (d_off, 'dormant', 'c', 'd');
  insert into public.terms (collection_id, term, category, definition) values (d_added, 'borrowed', 'c', 'b') returning id into t_known;
  insert into public.user_collections (user_id, collection_id) values (member_id, d_added);
  delete from public.user_active_collections where user_id = member_id;
  insert into public.user_active_collections (user_id, collection_id) values (member_id, d_member), (member_id, d_added);
  insert into public.review_state (user_id, term_id, marked_known_at) values (member_id, t_known, now());

  assert not has_function_privilege('anon', 'public.admin_queue_debug_terms(uuid)', 'execute'), 'anon could read a queue';

  -- A member is refused, even for their own id.
  perform pg_temp.act_as(member_id);
  v_failed := false;
  begin perform public.admin_queue_debug_terms(member_id); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'member could read a queue';
  execute 'reset role';

  -- An admin gets the member's terms, finished and unfinished, and nobody else's.
  perform pg_temp.act_as(admin_id);
  v_rows := public.admin_queue_debug_terms(member_id);
  assert json_array_length(v_rows) = 4, 'expected the member''s four terms';
  assert (select (r->>'active')::boolean from json_array_elements(v_rows) r where r->>'term' = 'finished'), 'active owned collection flagged off';
  assert not (select (r->>'active')::boolean from json_array_elements(v_rows) r where r->>'term' = 'dormant'), 'switched-off collection flagged active';
  assert (select (r->>'active')::boolean from json_array_elements(v_rows) r where r->>'term' = 'borrowed'), 'added collection flagged off';
  assert (select r->>'marked_known_at' from json_array_elements(v_rows) r where r->>'term' = 'borrowed') is not null, 'marked-known time missing';
  assert (select bool_and((r->>'finished')::boolean) filter (where r->>'term' = 'finished') from json_array_elements(v_rows) r), 'finished term not flagged finished';
  assert (select bool_and(not (r->>'finished')::boolean) filter (where r->>'term' = 'draft') from json_array_elements(v_rows) r), 'draft term flagged finished';
  assert not exists (select 1 from json_array_elements(v_rows) r where r->>'term' = 'elsewhere'), 'another member''s term leaked';
  execute 'reset role';

  -- Signed out: refused too.
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role authenticated';
  v_failed := false;
  begin perform public.admin_queue_debug_terms(member_id); exception when others then v_failed := sqlerrm like 'Only admins%'; end;
  assert v_failed, 'a caller with no user could read a queue';
  execute 'reset role';
end;
$$;

rollback;
