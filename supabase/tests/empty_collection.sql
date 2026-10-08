-- Behavior checks for creating an empty collection (phase 0 of the import redesign). One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/empty_collection.sql
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
  member_id uuid := pg_temp.make_user('empty-collection-user@example.test');
  other_id uuid := pg_temp.make_user('empty-collection-other@example.test');
  d1 uuid;
  v_failed boolean;
begin
  perform pg_temp.act_as(member_id);

  -- A user can create an empty private collection in Dutch.
  insert into public.collections (name, owner_id, visibility, language)
  values ('Dutch at work', member_id, 'private', 'nl') returning id into d1;
  assert (select language = 'nl' and visibility = 'private' and owner_id = member_id from public.collections where id = d1), 'empty collection shape';
  assert not exists (select 1 from public.terms where collection_id = d1), 'a new collection has no terms';

  -- ...and mark it active for review.
  insert into public.user_active_collections (user_id, collection_id) values (member_id, d1);
  assert exists (select 1 from public.user_active_collections where user_id = member_id and collection_id = d1), 'active row';

  -- The same name in a different case is refused by the unique index.
  v_failed := false;
  begin
    insert into public.collections (name, owner_id) values ('DUTCH AT WORK', member_id);
  exception when unique_violation then v_failed := true;
  end;
  assert v_failed, 'a case variant of an owned name was allowed';

  -- Someone else can use the same name for their own collection.
  perform pg_temp.act_as(other_id);
  insert into public.collections (name, owner_id) values ('Dutch at work', other_id);

  -- Nobody can create a collection owned by another user.
  v_failed := false;
  begin
    insert into public.collections (name, owner_id) values ('Stolen', member_id);
  exception when insufficient_privilege then v_failed := true;
  end;
  assert v_failed, 'a user created a collection for someone else';

  -- A wildcard in a name only matches itself when escaped.
  assert not ('axb' ilike 'a\_b'), 'escaped underscore acted as a wildcard';
  assert ('a_b' ilike 'a\_b'), 'escaped underscore did not match itself';
  assert not ('100 apples' ilike '100\%'), 'escaped percent acted as a wildcard';

  execute 'reset role';
end;
$$;

rollback;
