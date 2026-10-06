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
  v_rows json;
  v_failed boolean;
begin
  insert into public.domains (name, owner_id) values ('Queue Mine', member_id) returning id into d_member;
  insert into public.domains (name, owner_id) values ('Queue Theirs', other_id) returning id into d_other;
  insert into public.terms (domain_id, term, category, definition) values (d_member, 'finished', 'c', 'has a definition');
  insert into public.terms (domain_id, term) values (d_member, 'draft');
  insert into public.terms (domain_id, term, category, definition) values (d_other, 'elsewhere', 'c', 'x');

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
  assert json_array_length(v_rows) = 2, 'expected the member''s two terms';
  assert (select bool_and((r->>'finished')::boolean) filter (where r->>'term' = 'finished') from json_array_elements(v_rows) r), 'finished term not flagged finished';
  assert (select bool_and(not (r->>'finished')::boolean) filter (where r->>'term' = 'draft') from json_array_elements(v_rows) r), 'draft term flagged finished';
  assert not exists (select 1 from json_array_elements(v_rows) r where r->>'term' = 'elsewhere'), 'another member''s term leaked';
  execute 'reset role';
end;
$$;

rollback;
