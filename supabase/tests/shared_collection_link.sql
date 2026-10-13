-- Behavior checks for shared links (/c/<id>). One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/shared_collection_link.sql
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
  owner_id uuid := pg_temp.make_user('sl-owner@example.test');
  d_shared uuid;
  d_private uuid;
  d_blocked uuid;
  v_preview jsonb;
  i integer;
begin
  assert has_function_privilege('anon', 'public.get_shared_collection_preview(uuid)', 'execute'), 'anon preview';
  assert has_function_privilege('anon', 'public.shared_collection_link(uuid)', 'execute'), 'anon link';

  insert into public.collections (name, owner_id, visibility) values ('SL Shared', owner_id, 'shared') returning id into d_shared;
  insert into public.collections (name, owner_id) values ('SL Private', owner_id) returning id into d_private;
  insert into public.collections (name, owner_id, visibility) values ('SL Blocked', owner_id, 'shared') returning id into d_blocked;
  update public.collections
  set visibility = 'private', share_blocked_at = now(), share_block_reason = 'rules'
  where id = d_blocked;

  for i in 1..12 loop
    insert into public.terms (collection_id, term, definition) values (d_shared, 'SL term ' || i, 'Means ' || i);
  end loop;
  insert into public.terms (collection_id, term, definition) values (d_shared, 'SL unfinished', null);
  insert into public.terms (collection_id, term, definition) values (d_private, 'SL hidden', 'Secret');

  execute 'set local role anon';

  v_preview := public.get_shared_collection_preview(d_shared);
  assert v_preview ->> 'name' = 'SL Shared', 'shared preview';
  assert (v_preview ->> 'term_count')::int = 12, 'counts finished terms only';
  assert jsonb_array_length(v_preview -> 'terms') = 10, 'at most 10 terms';
  assert not (v_preview ? 'owner_id'), 'no owner in the preview';
  assert public.shared_collection_link(d_shared) = jsonb_build_object('public_slug', null), 'shared link works';

  assert public.get_shared_collection_preview(d_private) is null, 'private preview hidden';
  assert public.shared_collection_link(d_private) is null, 'private link dead';
  assert public.get_shared_collection_preview(d_blocked) is null, 'blocked preview hidden';
  assert public.shared_collection_link(d_blocked) is null, 'blocked link dead';
  assert public.get_shared_collection_preview(gen_random_uuid()) is null, 'missing preview';

  execute 'reset role';
  raise notice 'shared_collection_link: all checks passed';
end;
$$;

rollback;
