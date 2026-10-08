-- Behavior checks for collection requests (phase 2 of the import redesign). One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/collection_requests.sql
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

create function pg_temp.back_to_owner()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
end;
$$;

-- Expects the statement to fail with this message (or sqlstate when it starts with a digit).
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
  admin uuid := pg_temp.make_user('req-admin@example.test', true);
  ann uuid := pg_temp.make_user('req-ann@example.test');
  bob uuid := pg_temp.make_user('req-bob@example.test');
  cat uuid := pg_temp.make_user('req-cat@example.test');
  r jsonb;
  r1 uuid;
  r2 uuid;
  r3 uuid;
  v_rows jsonb;
  v_count integer;
  v_collection uuid;
  v_before timestamptz;
begin
  -- Switched off by default.
  perform pg_temp.act_as(ann);
  assert pg_temp.fails_with($q$select public.my_create_collection_request('Kubernetes', 'jargon', 'en')$q$, 'requests_closed'), 'closed by default';
  perform pg_temp.back_to_owner();
  update public.collection_request_settings set enabled = true;

  -- Settings: members read, only admins change.
  perform pg_temp.act_as(ann);
  assert (select enabled from public.collection_request_settings), 'members read settings';
  update public.collection_request_settings set paused = true;
  perform pg_temp.back_to_owner();
  assert not (select paused from public.collection_request_settings), 'member update changed nothing';
  perform pg_temp.act_as(admin);
  update public.collection_request_settings set estimate_days = 3;
  perform pg_temp.back_to_owner();
  assert (select estimate_days from public.collection_request_settings) = 3, 'admin changes settings';
  update public.collection_request_settings set estimate_days = 2;

  -- Create, validation, one open at a time.
  perform pg_temp.act_as(ann);
  assert pg_temp.fails_with($q$select public.my_create_collection_request('ab', 'jargon', 'en')$q$, 'invalid_request'), 'short topic';
  assert pg_temp.fails_with($q$select public.my_create_collection_request('Kubernetes', 'jargon', 'en', 'a1_a2')$q$, 'invalid_request'), 'level must match kind';
  r := public.my_create_collection_request('  Kubernetes for PMs  ', 'jargon', 'en', 'new', 50, E'pod\nhelm');
  r1 := (r->>'id')::uuid;
  assert r->>'topic' = 'Kubernetes for PMs', 'topic trimmed';
  assert (r->>'due_at')::timestamptz between now() + interval '47 hours' and now() + interval '49 hours', 'two day estimate';
  assert pg_temp.fails_with($q$select public.my_create_collection_request('Another topic', 'jargon', 'en')$q$, 'request_open_exists'), 'one open';

  -- No direct writes by members.
  assert pg_temp.fails_with($q$insert into public.collection_requests (user_id, topic, kind, language, due_at) values (auth.uid(), 'Sneaky', 'jargon', 'en', now())$q$, '42501'), 'no direct insert';
  update public.collection_requests set status = 'ready', due_at = now() where id = r1;
  assert (select status = 'requested' from public.collection_requests where id = r1), 'no direct update';
  assert pg_temp.fails_with($q$delete from public.collection_requests$q$, '42501'), 'no direct delete';

  -- Others can't see it; the owner and admins can.
  perform pg_temp.act_as(bob);
  assert (select count(*) from public.collection_requests) = 0, 'bob sees nothing';
  assert (select count(*) from public.my_list_collection_requests()) = 0, 'bob lists nothing';
  perform pg_temp.act_as(admin);
  assert (select count(*) from public.collection_requests) = 1, 'admin sees all';
  perform pg_temp.act_as(ann);
  assert (select count(*) from public.my_list_collection_requests()) = 1, 'ann lists hers';

  -- Cancelling before work started doesn't count toward the quota; the slot is free again.
  perform public.my_cancel_collection_request(r1);
  assert (select (public.my_collection_request_quota()->>'used')::int) = 0, 'cancelled before accept does not count';
  assert (select count(*) from public.my_list_collection_requests()) = 0, 'cancelled is hidden';
  assert pg_temp.fails_with(format($q$select public.my_cancel_collection_request(%L)$q$, r1), 'request_not_cancellable'), 'cannot cancel twice';

  -- Work started, then cancelled: counts. Three of those fill the quota; declined ones don't.
  for i in 1..3 loop
    perform pg_temp.act_as(ann);
    r := public.my_create_collection_request('Topic number ' || i, 'jargon', 'en');
    perform pg_temp.act_as(admin);
    update public.collection_requests set status = 'in_progress', accepted_at = now() where id = (r->>'id')::uuid;
    perform pg_temp.act_as(ann);
    perform public.my_cancel_collection_request((r->>'id')::uuid);
  end loop;
  assert (select (public.my_collection_request_quota()->>'used')::int) = 3, 'three counted';
  assert pg_temp.fails_with($q$select public.my_create_collection_request('Fourth topic', 'jargon', 'en')$q$, 'request_quota_reached'), 'quota reached';
  assert (select public.my_collection_request_quota()->>'next_available_at') is not null, 'next date given';
  perform pg_temp.back_to_owner();
  update public.collection_requests set status = 'declined', decline_reason = 'too_broad'
  where user_id = ann and topic = 'Topic number 1';
  perform pg_temp.act_as(ann);
  assert (select (public.my_collection_request_quota()->>'used')::int) = 2, 'declined does not count';
  perform pg_temp.back_to_owner();
  update public.collection_requests set created_at = now() - interval '31 days' where user_id = ann;
  perform pg_temp.act_as(ann);
  assert (select (public.my_collection_request_quota()->>'used')::int) = 0, 'old requests age out';

  -- Reply gives back the waiting time and returns to the queue.
  r := public.my_create_collection_request('Reply topic', 'vocabulary', 'nl', 'a1_a2');
  r2 := (r->>'id')::uuid;
  perform pg_temp.act_as(admin);
  update public.collection_requests set status = 'in_progress', accepted_at = now() where id = r2;
  update public.collection_requests
  set status = 'needs_input', question = 'Which level?', needs_input_since = now() - interval '2 days'
  where id = r2;
  perform pg_temp.act_as(ann);
  select due_at into v_before from public.collection_requests where id = r2;
  assert pg_temp.fails_with(format($q$select public.my_reply_collection_request(%L, '   ')$q$, r2), 'invalid_request'), 'empty reply';
  perform public.my_reply_collection_request(r2, 'A2 please');
  assert (select status = 'in_progress' and replied_at is not null and needs_input_since is null
          from public.collection_requests where id = r2), 'back to work after reply';
  assert (select due_at from public.collection_requests where id = r2) between v_before + interval '47 hours' and v_before + interval '49 hours', 'clock resumed';
  assert pg_temp.fails_with(format($q$select public.my_reply_collection_request(%L, 'again')$q$, r2), 'request_not_waiting'), 'only while waiting';
  perform pg_temp.act_as(bob);
  assert pg_temp.fails_with(format($q$select public.my_reply_collection_request(%L, 'hi')$q$, r2), 'request_not_found'), 'not someone else''s';
  perform pg_temp.back_to_owner();
  update public.collection_requests set status = 'cancelled' where id = r2;

  -- Merge: bob and cat follow ann's request. They see its progress and nothing else.
  perform pg_temp.act_as(ann);
  r := public.my_create_collection_request('Kubernetes for PMs', 'jargon', 'en');
  r1 := (r->>'id')::uuid;
  perform pg_temp.act_as(bob);
  r2 := (public.my_create_collection_request('K8s for managers', 'jargon', 'en')->>'id')::uuid;
  perform pg_temp.act_as(cat);
  r3 := (public.my_create_collection_request('Kubernetes PM', 'jargon', 'en')->>'id')::uuid;
  perform pg_temp.act_as(admin);
  update public.collection_requests set status = 'in_progress', accepted_at = now() where id = r1;
  update public.collection_requests set status = 'merged', merged_into = r1 where id in (r2, r3);
  perform pg_temp.act_as(bob);
  assert (select display_status from public.my_list_collection_requests()) = 'in_progress', 'merged shows primary progress';

  -- Delivering to someone who cancelled is refused; nothing is written.
  perform pg_temp.act_as(admin);
  assert pg_temp.fails_with(format($q$select public.admin_deliver_request(%L, 'Kubernetes', '[{"term":"Pod"}]', '[]', 'lines')$q$, r1), 'Every term needs a definition'), 'definitions required';
  assert pg_temp.fails_with(format($q$select public.admin_deliver_request(%L, 'Kubernetes', '[]', '[]', 'lines')$q$, r1), 'no terms to deliver'), 'terms required';
  assert (select count(*) from public.collections where owner_id in (ann, bob, cat)) = 0, 'nothing written on refusal';

  perform pg_temp.act_as(ann);
  assert pg_temp.fails_with(format($q$select public.admin_deliver_request(%L, 'Kubernetes', '[{"term":"Pod","definition":"x"}]', '[]', 'lines')$q$, r1), 'Only admins'), 'members cannot deliver';
  perform pg_temp.back_to_owner();

  -- Bob already has a collection of that name: delivery suffixes it.
  insert into public.collections (name, owner_id, visibility, language) values ('Kubernetes', bob, 'private', 'en');

  perform pg_temp.act_as(admin);
  v_rows := public.admin_deliver_request(
    r1, 'Kubernetes',
    '[{"term":"Pod","definition":"Smallest unit"},{"term":"Helm","definition":"Package manager"}]',
    '[{"source":"Pod","target":"Helm","relationship_type":"related"}]', 'lines');
  assert jsonb_array_length(v_rows) = 3, 'one copy each';
  perform pg_temp.back_to_owner();
  assert (select count(*) from public.collection_requests where status = 'ready' and id in (r1, r2, r3)) = 3, 'all ready';
  assert (select count(distinct delivered_collection_id) from public.collection_requests where id in (r1, r2, r3)) = 3, 'separate copies';
  assert (select count(*) from public.collections d join public.collection_requests q on q.delivered_collection_id = d.id
          where d.visibility = 'private' and d.owner_id = q.user_id) = 3, 'private and owned by each requester';
  assert exists (select 1 from public.collections where owner_id = bob and name = 'Kubernetes (2)'), 'name suffixed';
  assert (select count(*) from public.user_active_collections where user_id in (ann, bob, cat)) = 3, 'active';
  assert (select count(*) from public.terms t join public.collection_requests q on q.delivered_collection_id = t.collection_id) = 6, 'terms copied';
  assert (select count(*) from public.admin_audit_log where action = 'deliver_collection_request' and target_id = r1::text) = 1, 'audited';
  assert (select details::text not like '%Kubernetes%' from public.admin_audit_log where action = 'deliver_collection_request' and target_id = r1::text), 'audit has no topic';
  perform pg_temp.act_as(admin);
  assert pg_temp.fails_with(format($q$select public.admin_deliver_request(%L, 'Again', '[{"term":"Pod","definition":"x"}]', '[]', 'lines')$q$, r1), 'already closed'), 'not twice';
  perform pg_temp.back_to_owner();
  assert (select count(*) from public.collections d join public.collection_requests q on q.delivered_collection_id = d.id
          where q.id in (r1, r2, r3) and d.kind = 'terms') = 3, 'jargon requests deliver terms collections';

  -- A vocabulary request delivers a vocabulary collection.
  insert into public.collection_requests (user_id, topic, kind, language, level, status, due_at, accepted_at)
  values (ann, 'Dutch verbs', 'vocabulary', 'nl', 'a1_a2', 'in_progress', now() + interval '3 days', now())
  returning id into r2;
  perform pg_temp.act_as(admin);
  perform public.admin_deliver_request(r2, 'Dutch verbs', '[{"term":"lopen","definition":"to walk"}]', '[]', 'lines');
  perform pg_temp.back_to_owner();
  assert (select d.kind from public.collections d join public.collection_requests q on q.delivered_collection_id = d.id
          where q.id = r2) = 'vocabulary', 'vocabulary request delivers a vocabulary collection';
  assert (select d.language from public.collections d join public.collection_requests q on q.delivered_collection_id = d.id
          where q.id = r2) = 'nl', 'language still copied';

  -- Cancelled and suspended requesters block delivery.
  update public.collection_requests set status = 'cancelled' where user_id = ann and status = 'ready';
  update public.collection_requests set status = 'in_progress', accepted_at = now() where user_id = cat;
  update public.collection_requests set status = 'requested' where false;
  perform pg_temp.act_as(cat);
  assert (select status from public.collection_requests where user_id = cat) = 'in_progress', 'cat in progress';
  perform pg_temp.back_to_owner();
  update public.users set suspended_at = now() where id = cat;
  perform pg_temp.act_as(admin);
  assert pg_temp.fails_with(format($q$select public.admin_deliver_request(%L, 'X', '[{"term":"Pod","definition":"x"}]', '[]', 'lines')$q$, r3), 'account is suspended'), 'suspended refused';
  perform pg_temp.back_to_owner();
  update public.users set suspended_at = null where id = cat;
  update public.collection_requests set status = 'cancelled' where id = r3;
  perform pg_temp.act_as(admin);
  assert pg_temp.fails_with(format($q$select public.admin_deliver_request(%L, 'X', '[{"term":"Pod","definition":"x"}]', '[]', 'lines')$q$, r3), 'They cancelled this request'), 'cancelled refused';
  perform pg_temp.back_to_owner();

  -- Cancelling or deleting a primary promotes the oldest merged request.
  delete from public.collection_requests where user_id in (ann, bob, cat);
  perform pg_temp.act_as(ann);
  r1 := (public.my_create_collection_request('Promote me', 'jargon', 'en')->>'id')::uuid;
  perform pg_temp.act_as(bob);
  r2 := (public.my_create_collection_request('Promote me too', 'jargon', 'en')->>'id')::uuid;
  perform pg_temp.act_as(cat);
  r3 := (public.my_create_collection_request('Promote me three', 'jargon', 'en')->>'id')::uuid;
  perform pg_temp.back_to_owner();
  update public.collection_requests set status = 'in_progress', accepted_at = now() where id = r1;
  update public.collection_requests set created_at = now() - interval '1 hour' where id = r2;
  update public.collection_requests set status = 'merged', merged_into = r1 where id in (r2, r3);
  perform pg_temp.act_as(ann);
  perform public.my_cancel_collection_request(r1);
  perform pg_temp.back_to_owner();
  assert (select status = 'in_progress' and merged_into is null from public.collection_requests where id = r2), 'oldest child promoted';
  assert (select status = 'merged' and merged_into = r2 from public.collection_requests where id = r3), 'other child follows';
  delete from auth.users where id = bob;
  assert (select status = 'in_progress' and merged_into is null from public.collection_requests where id = r3), 'account deletion promotes too';

  -- A request answered by a shared collection.
  update public.collection_requests set status = 'in_progress', accepted_at = now() where id = r3;
  insert into public.collections (name, owner_id, visibility, language)
  values ('Shared k8s', ann, 'shared', 'en') returning id into v_collection;
  insert into public.terms (collection_id, term, definition) values (v_collection, 'Pod', 'Smallest unit'), (v_collection, 'Draft', null);
  insert into public.collections (name, owner_id, visibility, language) values ('Private one', ann, 'private', 'en');
  perform pg_temp.act_as(admin);
  assert pg_temp.fails_with(format($q$select public.admin_deliver_existing_collection(%L, (select id from public.collections where name = 'Private one'))$q$, r3), 'isn''t shared'), 'private refused';
  v_rows := public.admin_deliver_existing_collection(r3, v_collection);
  perform pg_temp.back_to_owner();
  assert (v_rows->0->>'created')::int = 1, 'counts finished terms only';
  assert exists (select 1 from public.user_collections where user_id = cat and collection_id = v_collection), 'added to library';
  assert exists (select 1 from public.user_active_collections where user_id = cat and collection_id = v_collection), 'active';
  assert (select delivery_kind from public.collection_requests where id = r3) = 'added_shared', 'delivery kind';

  -- Dismiss only closed requests.
  perform pg_temp.act_as(cat);
  assert pg_temp.fails_with(format($q$select public.my_cancel_collection_request(%L)$q$, r3), 'request_not_cancellable'), 'ready cannot be cancelled';
  perform public.my_dismiss_collection_request(r3);
  assert (select count(*) from public.my_list_collection_requests()) = 0, 'dismissed hidden';
  perform pg_temp.back_to_owner();

  select count(*) into v_count from public.collection_requests;
  assert v_count > 0;
end;
$$;

rollback;
