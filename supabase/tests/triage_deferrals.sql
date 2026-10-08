-- Terms set aside in Triage: add, remove, clear one collection, reset with the
-- collection's progress, and each person only sees their own. One transaction
-- that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/triage_deferrals.sql
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
  u1 uuid := pg_temp.make_user('defer1@example.test');
  u2 uuid := pg_temp.make_user('defer2@example.test');
  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  t1 uuid := gen_random_uuid();
  t2 uuid := gen_random_uuid();
  t3 uuid := gen_random_uuid();
  v_refused boolean := false;
begin
  insert into public.collections (id, name, owner_id) values (c1, 'One', u1), (c2, 'Two', u1);
  insert into public.terms (id, term, category, definition, collection_id) values
    (t1, 'A', 'c', 'd', c1), (t2, 'B', 'c', 'd', c1), (t3, 'C', 'c', 'd', c2);

  perform pg_temp.act_as(u1);
  perform public.my_add_deferred_terms(array[t1, t2, t3]);
  perform public.my_add_deferred_terms(array[t1]);
  assert (select count(*) from public.triage_deferrals) = 3, 'three terms set aside, once each';

  perform public.my_remove_deferred_term(t3);
  assert (select count(*) from public.triage_deferrals) = 2, 'one taken back';

  perform public.my_add_deferred_terms(array[t3]);
  perform public.my_clear_deferred_collection(c1);
  assert (select array_agg(term_id) from public.triage_deferrals) = array[t3], 'clearing one collection keeps the other';
  execute 'reset role';

  -- Another person sees none of it, and can't take it back.
  perform pg_temp.act_as(u2);
  assert (select count(*) from public.triage_deferrals) = 0, 'another person sees nothing';
  perform public.my_remove_deferred_term(t3);
  execute 'reset role';
  assert (select count(*) from public.triage_deferrals where user_id = u1) = 1, 'and can not remove it';

  -- Without a signed-in person the functions refuse.
  perform set_config('request.jwt.claims', '', true);
  begin
    perform public.my_add_deferred_terms(array[t1]);
  exception when others then
    v_refused := sqlerrm = 'Not authenticated';
  end;
  assert v_refused, 'adding without a person is refused';
end;
$$;

do $$
declare
  u1 uuid := pg_temp.make_user('defer3@example.test');
  c1 uuid := gen_random_uuid();
  t1 uuid := gen_random_uuid();
begin
  insert into public.collections (id, name, owner_id) values (c1, 'Reset', u1);
  insert into public.terms (id, term, category, definition, collection_id) values (t1, 'A', 'c', 'd', c1);
  insert into public.triage_deferrals (user_id, term_id) values (u1, t1);

  perform public.reset_collection_progress(u1, c1);
  assert not exists (select 1 from public.triage_deferrals where user_id = u1), 'a reset drops the deferred terms';

  assert to_regclass('public.triage_not_yet') is null, 'the old table name is gone';
  assert not exists (select 1 from pg_proc where proname in ('my_add_not_yet_terms', 'my_remove_not_yet_term', 'my_clear_not_yet_collection')),
    'the old function names are gone';
end;
$$;

rollback;
