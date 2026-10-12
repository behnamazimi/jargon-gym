-- Members can't publish collections; the waitlist form can't self-invite. One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/publish_flags_and_waitlist.sql
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
  admin_id uuid := pg_temp.make_user('pf-admin@example.test', true);
  member_id uuid := pg_temp.make_user('pf-member@example.test');
  c_id uuid;
  blocked boolean;
begin
  perform pg_temp.act_as(member_id);

  insert into public.collections (name, slug, owner_id) values ('pf mine', 'pf-mine', member_id)
  returning id into c_id;

  begin
    update public.collections set is_builtin = true, is_public = true where id = c_id;
    blocked := false;
  exception when others then
    blocked := sqlerrm = 'publish_flags_protected';
  end;
  assert blocked, 'member must not publish their collection by update';

  begin
    insert into public.collections (name, slug, owner_id, is_builtin, is_public)
    values ('pf pub', 'pf-pub', member_id, true, true);
    blocked := false;
  exception when others then
    blocked := sqlerrm = 'publish_flags_protected';
  end;
  assert blocked, 'member must not insert a public collection';

  update public.collections set description = 'ok' where id = c_id;

  begin
    insert into public.waitlist_requests (email, normalized_email, status, referral_code_id, invited_at)
    values ('pf@example.test', 'pf@example.test', 'invited', (select id from public.referral_codes limit 1), now());
    blocked := false;
  exception when others then
    blocked := true;
  end;
  assert blocked, 'waitlist form must not insert an invited row';

  insert into public.waitlist_requests (email, normalized_email) values ('pf2@example.test', 'pf2@example.test');

  execute 'reset role';
  perform pg_temp.act_as(admin_id);
  update public.collections set is_builtin = true, is_public = true where id = c_id;
end;
$$;

rollback;
