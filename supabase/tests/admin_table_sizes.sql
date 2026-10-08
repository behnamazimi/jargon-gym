-- admin_table_sizes is for admins only and lists the growth tables. One
-- transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/admin_table_sizes.sql
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
  admin_id uuid := pg_temp.make_user('sizes-admin@example.test', true);
  member_id uuid := pg_temp.make_user('sizes-member@example.test');
  v_failed boolean := false;
begin
  perform pg_temp.act_as(admin_id);
  assert (select count(*) from public.admin_table_sizes()) = 8, 'an admin sees the eight growth tables';
  assert exists (select 1 from public.admin_table_sizes() where table_name = 'review_events' and total_bytes > 0),
    'review_events is listed with a size';

  perform pg_temp.act_as(member_id);
  begin
    perform * from public.admin_table_sizes();
  exception when others then
    v_failed := true;
  end;
  assert v_failed, 'a member is refused';
end;
$$;

rollback;
