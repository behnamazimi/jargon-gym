-- "Request definitions for these words": a request that fills definitions into
-- the requester's own collection, matching their unfinished terms by name. It
-- never creates a collection.
--
-- Rollback (as a new migration): drop admin_request_unfinished_terms and
-- admin_fill_definitions, restore my_create_collection_request from
-- 20261002110000_collection_requests.sql, and keep the column and the relaxed
-- checks (requests already created stay readable).

alter table public.collection_requests
  drop constraint collection_requests_kind_check,
  add constraint collection_requests_kind_check
    check (kind in ('jargon', 'vocabulary', 'definitions')),
  drop constraint collection_requests_delivery_kind_check,
  add constraint collection_requests_delivery_kind_check
    check (delivery_kind in ('prepared', 'added_shared', 'filled')),
  add column target_domain_id uuid references public.domains (id) on delete set null;

-- The same function with the collection to fill. The old signature goes, so the
-- name stays unambiguous.
drop function public.my_create_collection_request(text, text, text, text, integer, text, boolean);

create function public.my_create_collection_request(
  p_topic text,
  p_kind text,
  p_language text,
  p_level text default null,
  p_size integer default null,
  p_known_terms text default null,
  p_notify_email boolean default true,
  p_target_domain_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_settings public.collection_request_settings;
  v_topic text := btrim(coalesce(p_topic, ''));
  v_used integer;
  v_domain public.domains;
  v_row public.collection_requests;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  perform 1 from public.users where id = v_user for update;

  select * into v_settings from public.collection_request_settings where id;
  if not v_settings.enabled then
    raise exception 'requests_closed';
  end if;

  if char_length(v_topic) < 3 or char_length(v_topic) > 120
     or p_kind not in ('jargon', 'vocabulary', 'definitions')
     or p_language not in ('en', 'nl')
     or (p_kind = 'definitions') <> (p_target_domain_id is not null)
     or (p_kind = 'definitions' and (p_level is not null or p_size is not null))
     or (p_level is not null and not (
       (p_kind = 'jargon' and p_level in ('new', 'basics', 'brushing_up'))
       or (p_kind = 'vocabulary' and p_level in ('a1_a2', 'b1_plus'))
     )) then
    raise exception 'invalid_request';
  end if;

  if p_kind = 'definitions' then
    select * into v_domain from public.domains
    where id = p_target_domain_id and owner_id = v_user;
    if not found or v_domain.language <> p_language then
      raise exception 'invalid_request';
    end if;
    if not exists (
      select 1 from public.terms where domain_id = p_target_domain_id and definition is null
    ) then
      raise exception 'nothing_to_define';
    end if;
  end if;

  if exists (
    select 1 from public.collection_requests
    where user_id = v_user and status in ('requested', 'in_progress', 'needs_input', 'merged')
  ) then
    raise exception 'request_open_exists';
  end if;

  select count(*) into v_used from public._counted_requests(v_user);
  if v_used >= 3 then
    raise exception 'request_quota_reached';
  end if;

  insert into public.collection_requests (
    user_id, topic, kind, language, level, size, known_terms, notify_email, due_at, target_domain_id
  )
  values (
    v_user, v_topic, p_kind, p_language, p_level, p_size,
    nullif(btrim(coalesce(p_known_terms, '')), ''),
    coalesce(p_notify_email, true),
    now() + make_interval(days => case when v_settings.paused
      then v_settings.paused_estimate_days else v_settings.estimate_days end),
    p_target_domain_id
  )
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'due_at', v_row.due_at, 'topic', v_row.topic);
end;
$$;

revoke all on function public.my_create_collection_request(text, text, text, text, integer, text, boolean, uuid)
  from public, anon;
grant execute on function public.my_create_collection_request(text, text, text, text, integer, text, boolean, uuid)
  to authenticated;

-- The admin can't read the requester's private terms, so this is how they see
-- which words are waiting.
create function public.admin_request_unfinished_terms(p_request_id uuid)
returns table (term text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can read this';
  end if;

  return query
  select t.term
  from public.collection_requests r
  join public.terms t on t.domain_id = r.target_domain_id and t.definition is null
  where r.id = p_request_id and r.kind = 'definitions'
  order by lower(t.term);
end;
$$;

-- Fills definitions in place by term id, so nothing is lost, and only into terms
-- that are still waiting. Everything else in the list is skipped and counted.
create function public.admin_fill_definitions(p_request_id uuid, p_terms jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.collection_requests;
  v_domain public.domains;
  v_item jsonb;
  v_definition text;
  v_found uuid;
  v_filled integer := 0;
  v_skipped integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can fill definitions';
  end if;

  select * into v_request from public.collection_requests where id = p_request_id for update;
  if not found then
    raise exception 'That request no longer exists.' using errcode = 'AD001';
  end if;
  if v_request.kind <> 'definitions' then
    raise exception 'This request isn''t for definitions.' using errcode = 'AD001';
  end if;
  if v_request.status = 'cancelled' then
    raise exception 'They cancelled this request.' using errcode = 'AD001';
  end if;
  if v_request.status in ('ready', 'declined') then
    raise exception 'This request is already closed.' using errcode = 'AD001';
  end if;
  if v_request.status <> 'in_progress' then
    raise exception 'Accept the request first.' using errcode = 'AD001';
  end if;
  if exists (select 1 from public.users where id = v_request.user_id and suspended_at is not null) then
    raise exception 'A requester''s account is suspended.' using errcode = 'AD001';
  end if;

  select * into v_domain from public.domains where id = v_request.target_domain_id;
  if not found then
    raise exception 'They deleted that collection.' using errcode = 'AD001';
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_terms, '[]'::jsonb)) loop
    v_definition := nullif(btrim(coalesce(v_item->>'definition', '')), '');
    v_found := null;

    if v_definition is not null then
      select t.id into v_found
      from public.terms t
      where t.domain_id = v_domain.id
        and t.definition is null
        and lower(btrim(t.term)) = lower(btrim(coalesce(v_item->>'term', '')))
      limit 1;
    end if;

    if v_found is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    update public.terms t set
      definition = v_definition,
      category = coalesce(t.category, nullif(btrim(coalesce(v_item->>'category', '')), '')),
      example = coalesce(t.example, nullif(btrim(coalesce(v_item->>'example', '')), '')),
      mental_model = coalesce(t.mental_model, nullif(btrim(coalesce(v_item->>'mental_model', '')), '')),
      discussion = coalesce(t.discussion, nullif(btrim(coalesce(v_item->>'discussion', '')), '')),
      anti_example = coalesce(t.anti_example, nullif(btrim(coalesce(v_item->>'anti_example', '')), '')),
      controversy = coalesce(t.controversy, nullif(btrim(coalesce(v_item->>'controversy', '')), '')),
      note = coalesce(t.note, nullif(btrim(coalesce(v_item->>'note', '')), ''))
    where t.id = v_found;
    v_filled := v_filled + 1;
  end loop;

  if v_filled = 0 then
    raise exception 'None of those words are waiting for a definition.' using errcode = 'AD001';
  end if;

  update public.collection_requests
  set status = 'ready',
      delivery_kind = 'filled',
      delivered_domain_id = v_domain.id,
      delivered_terms = v_filled,
      ready_at = now(),
      needs_input_since = null
  where id = p_request_id;

  perform public._admin_audit_insert(
    'fill_request_definitions', 'collection_request', p_request_id::text,
    jsonb_build_object('filled', v_filled, 'skipped', v_skipped)
  );

  return jsonb_build_array(jsonb_build_object(
    'request_id', p_request_id,
    'user_id', v_request.user_id,
    'domain_id', v_domain.id,
    'domain_name', v_domain.name,
    'created', v_filled,
    'skipped', v_skipped
  ));
end;
$$;

revoke all on function public.admin_request_unfinished_terms(uuid) from public, anon;
revoke all on function public.admin_fill_definitions(uuid, jsonb) from public, anon;
grant execute on function public.admin_request_unfinished_terms(uuid) to authenticated;
grant execute on function public.admin_fill_definitions(uuid, jsonb) to authenticated;

-- Keeps the two ways of closing a request apart without repeating the delivery
-- function: definitions are only filled, collections are only delivered.
create function public._collection_requests_delivery_matches_kind()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.delivery_kind is not distinct from old.delivery_kind then
    return new;
  end if;

  if new.kind = 'definitions' and new.delivery_kind in ('prepared', 'added_shared') then
    raise exception 'This request is for definitions. Fill them in instead.' using errcode = 'AD001';
  end if;
  if new.kind <> 'definitions' and new.delivery_kind = 'filled' then
    raise exception 'Only a request for definitions can be filled in.' using errcode = 'AD001';
  end if;
  return new;
end;
$$;

revoke all on function public._collection_requests_delivery_matches_kind()
  from public, anon, authenticated, service_role;

create trigger collection_requests_delivery_matches_kind
  before update of delivery_kind on public.collection_requests
  for each row
  execute function public._collection_requests_delivery_matches_kind();
