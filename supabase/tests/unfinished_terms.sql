-- Behavior checks for unfinished terms (phase 1 of the import redesign). One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/unfinished_terms.sql
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
  owner_id uuid := pg_temp.make_user('unfinished-owner@example.test');
  viewer_id uuid := pg_temp.make_user('unfinished-viewer@example.test');
  d1 uuid;
  t_done uuid;
  t_open uuid;
  t_later uuid;
  v_failed boolean;
  v_count int;
begin
  -- Setup as the table owner: a shared collection with one finished and one unfinished term.
  insert into public.collections (name, owner_id, visibility, is_builtin, is_public, slug)
  values ('Shared set', owner_id, 'shared', true, true, 'shared-set') returning id into d1;
  insert into public.terms (collection_id, term, definition) values (d1, 'Done', 'A finished term') returning id into t_done;
  insert into public.terms (collection_id, term) values (d1, 'Open') returning id into t_open;
  insert into public.terms (collection_id, term) values (d1, 'Later') returning id into t_later;
  insert into public.term_relationships (source_term_id, target_term_id, relationship_type, description)
  values (t_done, t_open, 'related', '');
  insert into public.user_collections (user_id, collection_id) values (viewer_id, d1);
  insert into public.user_active_collections (user_id, collection_id) values (viewer_id, d1), (owner_id, d1);

  -- Blank values are refused: "none" is null.
  v_failed := false;
  begin
    insert into public.terms (collection_id, term, definition) values (d1, 'Blank', '   ');
  exception when check_violation then v_failed := true;
  end;
  assert v_failed, 'a blank definition was allowed';

  -- A definition can be set, but never cleared.
  update public.terms set definition = 'Now finished' where id = t_later;
  v_failed := false;
  begin
    update public.terms set definition = null where id = t_later;
  exception when check_violation then v_failed := true;
  end;
  assert v_failed, 'a definition was cleared';

  -- The owner sees unfinished terms; a viewer of the shared collection does not.
  perform pg_temp.act_as(owner_id);
  assert (select count(*) from public.terms where collection_id = d1) = 3, 'owner should see all terms';
  assert (select unfinished_count from public.my_unfinished_term_counts(array[d1])) = 1, 'owner unfinished count';

  perform pg_temp.act_as(viewer_id);
  assert (select count(*) from public.terms where collection_id = d1) = 2, 'viewer saw an unfinished term';
  assert not exists (select 1 from public.terms where id = t_open), 'viewer read an unfinished term by id';
  assert not exists (select 1 from public.my_unfinished_term_counts(array[d1])), 'viewer got an unfinished count';

  -- Counts and study pools leave unfinished terms out.
  assert (select count(*) from public.my_progress_state_by_collection(array[d1])) = 2, 'progress counted an unfinished term';
  assert json_array_length(public.my_get_trace_candidates_json(array[d1])) = 2, 'candidates included an unfinished term';

  -- Relationships never leak an unfinished term's name.
  assert not exists (
    select 1 from public.my_term_relationships_by_collection(d1)
    where source_term_name = 'Open' or target_term_name = 'Open'
  ), 'a relationship exposed an unfinished term';
  perform pg_temp.act_as(owner_id);
  assert exists (
    select 1 from public.my_term_relationships_by_collection(d1) where target_term_name = 'Open'
  ), 'the owner lost their own relationship';
  execute 'reset role';

  -- Term cards skip unfinished terms and their links.
  assert (select count(*) from public.get_term_cards(viewer_id, array[t_done, t_open])) = 1, 'a card for an unfinished term';
  assert (select jsonb_array_length(relationships) from public.get_term_card(viewer_id, t_done)) = 0, 'card linked an unfinished term';

  -- The public site hides them too.
  execute 'set local role anon';
  assert (select count(*) from public.terms where collection_id = d1) = 2, 'anon saw an unfinished term';
  execute 'reset role';
end;
$$;

rollback;
