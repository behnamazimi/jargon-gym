-- Behavior checks for review_state.last_review_grade. One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/review_last_grade.sql
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
  u uuid := pg_temp.make_user('last-grade@example.test');
  c uuid;
  t uuid;
  g smallint;
  failed boolean;
begin
  insert into public.collections (name, owner_id) values ('Last grade', u) returning id into c;
  insert into public.terms (collection_id, term, category, definition) values (c, 'lane', 'c', 'd') returning id into t;
  delete from public.user_active_collections where user_id = u;
  insert into public.user_active_collections (user_id, collection_id) values (u, c);

  -- A read, reveal or quiz answer never sets or changes the grade.
  perform public.record_review_event(u, t, 'read');
  select last_review_grade into g from public.review_state where user_id = u and term_id = t;
  assert g is null, 'a read set the grade';

  perform public.record_review_event(u, t, 'review_fail', 0.4, 7, null, false, 1::smallint);
  select last_review_grade into g from public.review_state where user_id = u and term_id = t;
  assert g = 1, 'Again did not store 1';

  perform public.record_review_event(u, t, 'reveal');
  perform public.record_review_event(u, t, 'quiz_pass', null, null, 0.9, false, 4::smallint, 'multiple_choice');
  select last_review_grade into g from public.review_state where user_id = u and term_id = t;
  assert g = 1, 'a reveal or quiz answer changed the grade';

  -- Hard is logged as review_fail and still stores 2; the next grade replaces it.
  perform public.record_review_event(u, t, 'review_fail', 1.2, 7, null, false, 2::smallint);
  select last_review_grade into g from public.review_state where user_id = u and term_id = t;
  assert g = 2, 'Hard did not store 2';

  perform public.record_review_event(u, t, 'review_pass', 3, 6, null, false, 4::smallint);
  select last_review_grade into g from public.review_state where user_id = u and term_id = t;
  assert g = 4, 'Easy did not replace the grade';

  -- A grade is required on a Review event, and only 1 to 4 is storable.
  failed := false;
  begin perform public.record_review_event(u, t, 'review_pass', 3, 6, null, false, null); exception when others then failed := true; end;
  assert failed, 'a review event without a grade was accepted';
  failed := false;
  begin update public.review_state set last_review_grade = 7 where user_id = u and term_id = t; exception when check_violation then failed := true; end;
  assert failed, 'a grade of 7 was stored';

  -- The candidate rows carry it.
  assert (select (j -> 0 ->> 'last_review_grade')::int from (select public.get_trace_candidates_json(u, array[c])::jsonb as j) x) = 4,
    'get_trace_candidates_json did not return the grade';

  -- The grade is not readable by anon.
  assert not has_function_privilege('anon', 'public.get_trace_candidates(uuid,uuid[])', 'execute'), 'anon can read candidates';
end;
$$;

rollback;
