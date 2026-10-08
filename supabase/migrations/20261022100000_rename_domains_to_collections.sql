-- Renames domains to collections everywhere in the database.
-- Tables, columns, indexes, constraints, policies, triggers, the visibility type
-- and every function that mentions domain are renamed; data is kept.

set check_function_bodies = off;

-- Drop what depends on functions that are about to be replaced
drop policy "Users read visible terms" on public.terms;
drop policy "Owners delete terms" on public.terms;
drop policy "Owners update terms" on public.terms;
drop policy "Owners insert terms" on public.terms;
drop policy "Owners delete relationships" on public.term_relationships;
drop policy "Owners update relationships" on public.term_relationships;
drop policy "Owners insert relationships" on public.term_relationships;
drop policy "Users set active domains" on public.user_active_domains;
drop trigger domains_unshare_cleanup on public.domains;
drop trigger domains_guard_protected on public.domains;
drop function public._domains_guard_protected();
drop function public.admin_deliver_existing_collection(uuid,uuid);
drop function public.admin_dismiss_collection_reports(uuid);
drop function public.admin_lift_share_lock(uuid,text);
drop function public.admin_list_collection_reports(uuid);
drop function public.admin_list_collections();
drop function public.admin_publish_collection(uuid,text,jsonb);
drop function public.admin_stop_sharing_collection(uuid,text,text);
drop function public.can_read_domain(uuid);
drop function public.get_term_card(uuid,uuid);
drop function public.get_term_cards(uuid,uuid[]);
drop function public.get_trace_candidates(uuid,uuid[]);
drop function public.get_trace_candidates_json(uuid,uuid[]);
drop function public.handle_domain_unshare();
drop function public.is_domain_in_collection(uuid);
drop function public.my_clear_not_yet_domain(uuid);
drop function public.my_create_collection_request(text,text,text,text,integer,text,boolean,uuid);
drop function public.my_get_trace_candidates(uuid[]);
drop function public.my_get_trace_candidates_json(uuid[]);
drop function public.my_list_collection_requests();
drop function public.my_progress_state_by_domain(uuid[]);
drop function public.my_report_collection(uuid,text,text);
drop function public.my_reset_domain_progress(uuid);
drop function public.my_review_domain_ids();
drop function public.my_set_collection_love(uuid,boolean);
drop function public.my_study_collection_term_counts();
drop function public.my_term_relationships_by_domain(uuid);
drop function public.my_unfinished_term_counts(uuid[]);
drop function public.owns_domain(uuid);
drop function public.progress_state_by_domain(uuid,uuid[]);
drop function public.reset_domain_progress(uuid,uuid);
drop function public.review_domain_ids(uuid);

alter type public.domain_visibility rename to collection_visibility;

alter table public.collection_loves rename column domain_id to collection_id;
alter table public.collection_narration_settings rename column domain_id to collection_id;
alter table public.collection_reports rename column domain_id to collection_id;
alter table public.collection_requests rename column delivered_domain_id to delivered_collection_id;
alter table public.collection_requests rename column target_domain_id to target_collection_id;
alter table public.import_batches rename column domain_id to collection_id;
alter table public.narration_sync_jobs rename column domain_id to collection_id;
alter table public.stories rename column domain_id to collection_id;
alter table public.story_collection_prefs rename column domain_id to collection_id;
alter table public.terms rename column domain_id to collection_id;
alter table public.user_active_domains rename column domain_id to collection_id;
alter table public.user_collection_domains rename column domain_id to collection_id;
alter table public.user_settings rename column story_last_domain_id to story_last_collection_id;

alter table public.domains rename to collections;
alter table public.user_collection_domains rename to user_collections;
alter table public.user_active_domains rename to user_active_collections;

alter table public.collection_loves rename constraint collection_loves_domain_id_fkey to collection_loves_collection_id_fkey;
alter table public.collection_narration_settings rename constraint collection_narration_settings_domain_id_fkey to collection_narration_settings_collection_id_fkey;
alter table public.collection_reports rename constraint collection_reports_domain_id_fkey to collection_reports_collection_id_fkey;
alter table public.collection_requests rename constraint collection_requests_delivered_domain_id_fkey to collection_requests_delivered_collection_id_fkey;
alter table public.collection_requests rename constraint collection_requests_target_domain_id_fkey to collection_requests_target_collection_id_fkey;
alter table public.collections rename constraint domains_kind_check to collections_kind_check;
alter table public.collections rename constraint domains_owner_id_fkey to collections_owner_id_fkey;
alter table public.collections rename constraint domains_pkey to collections_pkey;
alter table public.collections rename constraint domains_public_requires_builtin to collections_public_requires_builtin;
alter table public.collections rename constraint domains_share_block_pair_check to collections_share_block_pair_check;
alter table public.collections rename constraint domains_share_block_reason_check to collections_share_block_reason_check;
alter table public.import_batches rename constraint import_batches_domain_id_fkey to import_batches_collection_id_fkey;
alter table public.narration_sync_jobs rename constraint narration_sync_jobs_domain_id_fkey to narration_sync_jobs_collection_id_fkey;
alter table public.stories rename constraint stories_domain_id_fkey to stories_collection_id_fkey;
alter table public.story_collection_prefs rename constraint story_collection_prefs_domain_id_fkey to story_collection_prefs_collection_id_fkey;
alter table public.terms rename constraint terms_domain_id_fkey to terms_collection_id_fkey;
alter table public.user_active_collections rename constraint user_active_domains_domain_id_fkey to user_active_collections_collection_id_fkey;
alter table public.user_active_collections rename constraint user_active_domains_pkey to user_active_collections_pkey;
alter table public.user_active_collections rename constraint user_active_domains_user_id_fkey to user_active_collections_user_id_fkey;
alter table public.user_collections rename constraint user_collection_domains_domain_id_fkey to user_collections_collection_id_fkey;
alter table public.user_collections rename constraint user_collection_domains_pkey to user_collections_pkey;
alter table public.user_collections rename constraint user_collection_domains_user_id_fkey to user_collections_user_id_fkey;
alter table public.user_settings rename constraint user_settings_story_last_domain_id_fkey to user_settings_story_last_collection_id_fkey;
alter index public.collection_loves_domain_id_idx rename to collection_loves_collection_id_idx;
alter index public.collection_reports_status_domain_idx rename to collection_reports_status_collection_idx;
alter index public.domains_owner_name_idx rename to collections_owner_name_idx;
alter index public.domains_shared_name_idx rename to collections_shared_name_idx;
alter index public.domains_slug_idx rename to collections_slug_idx;
alter index public.story_collection_prefs_domain_id_idx rename to story_collection_prefs_collection_id_idx;
alter index public.terms_domain_id_idx rename to terms_collection_id_idx;
alter index public.terms_domain_slug_idx rename to terms_collection_slug_idx;
alter index public.terms_domain_term_idx rename to terms_collection_term_idx;
alter index public.user_active_domains_domain_id_idx rename to user_active_collections_collection_id_idx;
alter index public.user_collection_domains_domain_id_idx rename to user_collections_collection_id_idx;

alter policy "Owners delete domains" on public.collections rename to "Owners delete collections";
alter policy "Admins update any domain" on public.collections rename to "Admins update any collection";
alter policy "Anyone can read public domains" on public.collections rename to "Anyone can read public collections";
alter policy "Owners update domains" on public.collections rename to "Owners update collections";
alter policy "Owners manage domains" on public.collections rename to "Owners manage collections";
alter policy "Users read own or shared domains" on public.collections rename to "Users read own or shared collections";
alter policy "Users add shared domains to collection" on public.user_collections rename to "Users add shared collections";
alter policy "Owners read subscribers to their domains" on public.user_collections rename to "Owners read subscribers to their collections";
alter policy "Users unset active domains" on public.user_active_collections rename to "Users unset active collections";
alter policy "Users read own active domains" on public.user_active_collections rename to "Users read own active collections";
alter trigger domains_set_updated_at on public.collections rename to collections_set_updated_at;

-- Functions (bodies are text, so each one is rewritten)
CREATE OR REPLACE FUNCTION public._admin_people_using_collections(p_owner uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(distinct other.user_id)::integer
  from (
    select ucd.user_id from public.user_collections ucd
      join public.collections d on d.id = ucd.collection_id where d.owner_id = p_owner
    union all
    select uad.user_id from public.user_active_collections uad
      join public.collections d on d.id = uad.collection_id where d.owner_id = p_owner
    union all
    select scp.user_id from public.story_collection_prefs scp
      join public.collections d on d.id = scp.collection_id where d.owner_id = p_owner
    union all
    select rs.user_id from public.review_state rs
      join public.terms t on t.id = rs.term_id
      join public.collections d on d.id = t.collection_id where d.owner_id = p_owner
    union all
    select re.user_id from public.review_events re
      join public.terms t on t.id = re.term_id
      join public.collections d on d.id = t.collection_id where d.owner_id = p_owner
  ) other
  where other.user_id <> p_owner;
$function$;

CREATE OR REPLACE FUNCTION public._collection_loves_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'INSERT' then
    update public.collections set love_count = love_count + 1 where id = new.collection_id;
    return new;
  end if;
  update public.collections set love_count = greatest(love_count - 1, 0) where id = old.collection_id;
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION public._collections_guard_protected()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.share_blocked_at is distinct from old.share_blocked_at
       or new.share_block_reason is distinct from old.share_block_reason then
      raise exception 'share_lock_protected';
    end if;
    if new.love_count is distinct from old.love_count and pg_trigger_depth() <= 1 then
      raise exception 'love_count_protected';
    end if;
  end if;

  if new.visibility = 'shared' and old.visibility <> 'shared' and new.share_blocked_at is not null then
    raise exception 'share_blocked';
  end if;

  return new;
end;
$function$;
revoke all on function public._collections_guard_protected() from public, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public._import_terms_for(p_user uuid, p_import_id uuid, p_destination jsonb, p_terms jsonb, p_relationships jsonb, p_policy text, p_entry text DEFAULT NULL::text, p_source text DEFAULT NULL::text, p_format text DEFAULT NULL::text, p_name_collision text DEFAULT 'fail'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := p_user;
  v_count int;
  v_batch_user uuid;
  v_batch_result jsonb;
  v_collection_id uuid;
  v_collection_name text;
  v_name text;
  v_language text;
  v_created int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_unfinished int := 0;
  v_rel_created int := 0;
  v_rel_updated int := 0;
  v_rel_dropped int := 0;
  v_ids jsonb := '{}'::jsonb;
  v_seen text[] := '{}';
  v_item jsonb;
  v_key text;
  v_found uuid;
  v_policy text;
  v_definition text;
  v_src uuid;
  v_tgt uuid;
  v_is_new boolean;
  v_result jsonb;
  v_attempt int := 1;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_policy is null or p_policy not in ('skip', 'update') then
    raise exception 'invalid_policy';
  end if;

  v_count := coalesce(jsonb_array_length(p_terms), 0);
  if v_count = 0 then
    raise exception 'empty_import';
  end if;
  if v_count > 500 then
    raise exception 'import_too_large';
  end if;

  -- The primary key makes a concurrent second call wait here, then see the
  -- finished row.
  insert into public.import_batches (id, user_id, entry, source, format)
  values (p_import_id, v_user, p_entry, p_source, p_format)
  on conflict (id) do nothing;

  if not found then
    select user_id, result into v_batch_user, v_batch_result
    from public.import_batches where id = p_import_id;
    if v_batch_user is distinct from v_user then
      raise exception 'import_id_conflict';
    end if;
    return v_batch_result || jsonb_build_object('already_applied', true);
  end if;

  if p_destination ? 'collection_id' then
    select d.id, d.name into v_collection_id, v_collection_name
    from public.collections d
    where d.id = (p_destination->>'collection_id')::uuid and d.owner_id = v_user;
    if v_collection_id is null then
      raise exception 'destination_not_found';
    end if;
  else
    v_name := btrim(coalesce(p_destination->>'name', ''));
    v_language := coalesce(p_destination->>'language', 'en');
    if v_name = '' or char_length(v_name) > 100 or not public.is_supported_language(v_language) then
      raise exception 'invalid_destination';
    end if;
    loop
      begin
        insert into public.collections (name, owner_id, visibility, language)
        values (
          case when v_attempt = 1 then v_name else v_name || ' (' || v_attempt || ')' end,
          v_user, 'private', v_language
        )
        returning id, name into v_collection_id, v_collection_name;
        exit;
      exception when unique_violation then
        if p_name_collision <> 'suffix' or v_attempt >= 20 then
          raise exception 'collection_name_taken';
        end if;
        v_attempt := v_attempt + 1;
      end;
    end loop;
  end if;

  for v_item in select value from jsonb_array_elements(p_terms) loop
    v_key := lower(btrim(coalesce(v_item->>'term', '')));
    if v_key = '' or char_length(v_key) > 200 then
      raise exception 'invalid_term';
    end if;

    -- The first occurrence of a repeated name wins.
    if v_key = any(v_seen) then
      continue;
    end if;
    v_seen := v_seen || v_key;

    v_definition := nullif(btrim(coalesce(v_item->>'definition', '')), '');
    v_policy := coalesce(v_item->>'on_duplicate', p_policy);

    select t.id into v_found
    from public.terms t
    where t.collection_id = v_collection_id and lower(btrim(t.term)) = v_key
    limit 1;

    if v_found is not null then
      if v_policy = 'update' then
        update public.terms t set
          definition = coalesce(v_definition, t.definition),
          category = coalesce(nullif(btrim(coalesce(v_item->>'category', '')), ''), t.category),
          example = coalesce(nullif(btrim(coalesce(v_item->>'example', '')), ''), t.example),
          mental_model = coalesce(nullif(btrim(coalesce(v_item->>'mental_model', '')), ''), t.mental_model),
          discussion = coalesce(nullif(btrim(coalesce(v_item->>'discussion', '')), ''), t.discussion),
          anti_example = coalesce(nullif(btrim(coalesce(v_item->>'anti_example', '')), ''), t.anti_example),
          controversy = coalesce(nullif(btrim(coalesce(v_item->>'controversy', '')), ''), t.controversy),
          note = coalesce(nullif(btrim(coalesce(v_item->>'note', '')), ''), t.note)
        where t.id = v_found;
        v_updated := v_updated + 1;
        v_ids := v_ids || jsonb_build_object(v_key, v_found);
      else
        v_skipped := v_skipped + 1;
      end if;
    else
      insert into public.terms (
        collection_id, term, definition, category, example, mental_model,
        discussion, anti_example, controversy, note
      )
      values (
        v_collection_id,
        btrim(v_item->>'term'),
        v_definition,
        nullif(btrim(coalesce(v_item->>'category', '')), ''),
        nullif(btrim(coalesce(v_item->>'example', '')), ''),
        nullif(btrim(coalesce(v_item->>'mental_model', '')), ''),
        nullif(btrim(coalesce(v_item->>'discussion', '')), ''),
        nullif(btrim(coalesce(v_item->>'anti_example', '')), ''),
        nullif(btrim(coalesce(v_item->>'controversy', '')), ''),
        nullif(btrim(coalesce(v_item->>'note', '')), '')
      )
      returning id into v_found;
      v_created := v_created + 1;
      if v_definition is null then
        v_unfinished := v_unfinished + 1;
      end if;
      v_ids := v_ids || jsonb_build_object(v_key, v_found);
    end if;
    v_found := null;
  end loop;

  -- Links only between terms written in this batch; anything else is dropped.
  for v_item in select value from jsonb_array_elements(coalesce(p_relationships, '[]'::jsonb)) loop
    v_src := (v_ids->>lower(btrim(coalesce(v_item->>'source', ''))))::uuid;
    v_tgt := (v_ids->>lower(btrim(coalesce(v_item->>'target', ''))))::uuid;
    if v_src is null or v_tgt is null or v_src = v_tgt
       or btrim(coalesce(v_item->>'relationship_type', '')) = '' then
      v_rel_dropped := v_rel_dropped + 1;
      continue;
    end if;

    insert into public.term_relationships (
      source_term_id, target_term_id, relationship_type, description
    )
    values (
      v_src, v_tgt, btrim(v_item->>'relationship_type'),
      coalesce(v_item->>'description', '')
    )
    on conflict on constraint term_relationships_unique_pair
    do update set description = excluded.description
    returning (xmax = 0) into v_is_new;

    if v_is_new then
      v_rel_created := v_rel_created + 1;
    else
      v_rel_updated := v_rel_updated + 1;
    end if;
  end loop;

  insert into public.user_active_collections (user_id, collection_id)
  values (v_user, v_collection_id)
  on conflict (user_id, collection_id) do nothing;

  v_result := jsonb_build_object(
    'collection_id', v_collection_id,
    'collection_name', v_collection_name,
    'created', v_created,
    'updated', v_updated,
    'skipped', v_skipped,
    'unfinished', v_unfinished,
    'relationships_created', v_rel_created,
    'relationships_updated', v_rel_updated,
    'relationships_dropped', v_rel_dropped
  );

  update public.import_batches
  set result = v_result, collection_id = v_collection_id
  where id = p_import_id;

  return v_result || jsonb_build_object('already_applied', false);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid, p_confirm_email text, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_target public.users := public._admin_manage_target(p_user_id);
  v_reason text := public._admin_clean_reason(p_reason);
  v_using integer;
begin
  if lower(trim(coalesce(p_confirm_email, ''))) <> lower(v_target.email) then
    raise exception 'The email you typed doesn''t match.' using errcode = 'AD001';
  end if;

  perform 1 from public.collections where owner_id = p_user_id for update;
  perform 1 from public.terms t
    join public.collections d on d.id = t.collection_id
    where d.owner_id = p_user_id
    for update of t;

  v_using := public._admin_people_using_collections(p_user_id);
  if v_using > 0 then
    raise exception
      'Can''t delete: % other % use their collections. Make the collections private first.',
      v_using, case when v_using = 1 then 'person' else 'people' end
      using errcode = 'AD001';
  end if;

  perform public._admin_audit_insert(
    'delete_user', 'user', p_user_id::text, jsonb_build_object('reason', v_reason)
  );

  delete from auth.users where id = p_user_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_deliver_existing_collection(p_request_id uuid, p_collection_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request public.collection_requests;
  v_target public.collection_requests;
  v_collection public.collections;
  v_count integer;
  v_deliveries jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can deliver collections';
  end if;

  select * into v_request from public.collection_requests where id = p_request_id for update;
  if not found then
    raise exception 'That request no longer exists.' using errcode = 'AD001';
  end if;
  if v_request.status = 'cancelled' then
    raise exception 'They cancelled this request.' using errcode = 'AD001';
  end if;
  if v_request.status in ('ready', 'declined') then
    raise exception 'This request is already closed.' using errcode = 'AD001';
  end if;

  select * into v_collection from public.collections where id = p_collection_id;
  if not found or v_collection.visibility <> 'shared' then
    raise exception 'That collection isn''t shared.' using errcode = 'AD001';
  end if;
  select count(*)::integer into v_count
  from public.terms where collection_id = p_collection_id and definition is not null;

  for v_target in
    select * from public.collection_requests
    where id = p_request_id
       or (merged_into = p_request_id and status = 'merged')
    order by (id = p_request_id) desc, created_at, id
    for update
  loop
    if exists (select 1 from public.users where id = v_target.user_id and suspended_at is not null) then
      raise exception 'A requester''s account is suspended.' using errcode = 'AD001';
    end if;

    if v_collection.owner_id <> v_target.user_id then
      insert into public.user_collections (user_id, collection_id)
      values (v_target.user_id, p_collection_id)
      on conflict (user_id, collection_id) do nothing;
    end if;
    insert into public.user_active_collections (user_id, collection_id)
    values (v_target.user_id, p_collection_id)
    on conflict (user_id, collection_id) do nothing;

    update public.collection_requests
    set status = 'ready',
        delivery_kind = 'added_shared',
        delivered_collection_id = p_collection_id,
        delivered_terms = v_count,
        ready_at = now(),
        needs_input_since = null
    where id = v_target.id;

    v_deliveries := v_deliveries || jsonb_build_array(jsonb_build_object(
      'request_id', v_target.id,
      'user_id', v_target.user_id,
      'collection_id', p_collection_id,
      'collection_name', v_collection.name,
      'created', v_count
    ));
  end loop;

  perform public._admin_audit_insert(
    'deliver_existing_collection', 'collection_request', p_request_id::text,
    jsonb_build_object('deliveries', jsonb_array_length(v_deliveries), 'collection_id', p_collection_id)
  );

  return v_deliveries;
end;
$function$;
revoke all on function public.admin_deliver_existing_collection(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.admin_deliver_existing_collection(uuid,uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.admin_deliver_request(p_request_id uuid, p_name text, p_terms jsonb, p_relationships jsonb, p_format text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request public.collection_requests;
  v_target public.collection_requests;
  v_name text := btrim(coalesce(p_name, ''));
  v_result jsonb;
  v_deliveries jsonb := '[]'::jsonb;
  v_terms integer := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can deliver collections';
  end if;

  select * into v_request from public.collection_requests where id = p_request_id for update;
  if not found then
    raise exception 'That request no longer exists.' using errcode = 'AD001';
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

  if char_length(v_name) < 1 or char_length(v_name) > 100 then
    raise exception 'Give the collection a name of up to 100 characters.' using errcode = 'AD001';
  end if;
  if coalesce(jsonb_array_length(p_terms), 0) = 0 then
    raise exception 'There are no terms to deliver.' using errcode = 'AD001';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_terms) t
    where nullif(btrim(coalesce(t->>'definition', '')), '') is null
  ) then
    raise exception 'Every term needs a definition before delivery.' using errcode = 'AD001';
  end if;

  for v_target in
    select * from public.collection_requests
    where id = p_request_id
       or (merged_into = p_request_id and status = 'merged')
    order by (id = p_request_id) desc, created_at, id
    for update
  loop
    if exists (select 1 from public.users where id = v_target.user_id and suspended_at is not null) then
      raise exception 'A requester''s account is suspended.' using errcode = 'AD001';
    end if;

    v_result := public._import_terms_for(
      v_target.user_id,
      gen_random_uuid(),
      jsonb_build_object('name', v_name, 'language', v_request.language),
      p_terms,
      coalesce(p_relationships, '[]'::jsonb),
      'skip', 'request', 'paste', p_format, 'suffix'
    );

    update public.collections
    set kind = case v_request.kind when 'vocabulary' then 'vocabulary' else 'terms' end
    where id = (v_result->>'collection_id')::uuid;

    update public.collection_requests
    set status = 'ready',
        delivery_kind = 'prepared',
        delivered_collection_id = (v_result->>'collection_id')::uuid,
        delivered_terms = (v_result->>'created')::integer,
        ready_at = now(),
        needs_input_since = null
    where id = v_target.id;

    v_terms := (v_result->>'created')::integer;
    v_deliveries := v_deliveries || jsonb_build_array(jsonb_build_object(
      'request_id', v_target.id,
      'user_id', v_target.user_id,
      'collection_id', v_result->>'collection_id',
      'collection_name', v_result->>'collection_name',
      'created', (v_result->>'created')::integer
    ));
  end loop;

  perform public._admin_audit_insert(
    'deliver_collection_request', 'collection_request', p_request_id::text,
    jsonb_build_object('deliveries', jsonb_array_length(v_deliveries), 'terms', v_terms)
  );

  return v_deliveries;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_dismiss_collection_reports(p_collection_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can dismiss reports' using errcode = 'AD001';
  end if;

  perform 1 from public.collections where id = p_collection_id for update;
  if not found then
    raise exception 'That collection no longer exists.' using errcode = 'AD001';
  end if;

  update public.collection_reports
  set status = 'dismissed', resolved_at = now(), resolved_by = auth.uid()
  where collection_id = p_collection_id and status = 'open';
  get diagnostics v_count = row_count;

  if v_count > 0 then
    perform public._admin_audit_insert(
      'dismiss_collection_reports', 'collection', p_collection_id::text,
      jsonb_build_object('count', v_count)
    );
  end if;
  return v_count;
end;
$function$;
revoke all on function public.admin_dismiss_collection_reports(uuid) from public, anon, authenticated, service_role;
grant execute on function public.admin_dismiss_collection_reports(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.admin_fill_definitions(p_request_id uuid, p_terms jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_request public.collection_requests;
  v_collection public.collections;
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

  select * into v_collection from public.collections where id = v_request.target_collection_id;
  if not found then
    raise exception 'They deleted that collection.' using errcode = 'AD001';
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_terms, '[]'::jsonb)) loop
    v_definition := nullif(btrim(coalesce(v_item->>'definition', '')), '');
    v_found := null;

    if v_definition is not null then
      select t.id into v_found
      from public.terms t
      where t.collection_id = v_collection.id
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
      delivered_collection_id = v_collection.id,
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
    'collection_id', v_collection.id,
    'collection_name', v_collection.name,
    'created', v_filled,
    'skipped', v_skipped
  ));
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_lift_share_lock(p_collection_id uuid, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_collection public.collections;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can lift a sharing lock' using errcode = 'AD001';
  end if;
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'Give a note of up to 200 characters.' using errcode = 'AD001';
  end if;

  select * into v_collection from public.collections where id = p_collection_id for update;
  if not found then
    raise exception 'That collection no longer exists.' using errcode = 'AD001';
  end if;
  if v_collection.share_blocked_at is null then
    return;
  end if;

  update public.collections
  set share_blocked_at = null, share_block_reason = null
  where id = p_collection_id;

  perform public._admin_audit_insert(
    'lift_share_lock', 'collection', p_collection_id::text,
    jsonb_build_object('reason', v_collection.share_block_reason, 'note', v_note)
  );
end;
$function$;
revoke all on function public.admin_lift_share_lock(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.admin_lift_share_lock(uuid,text) to authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_collection_reports(p_collection_id uuid)
 RETURNS TABLE(id uuid, reason text, note text, reporter_email text, created_at timestamp with time zone, status text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can list reports' using errcode = 'AD001';
  end if;

  return query
  select r.id, r.reason, r.note, u.email, r.created_at, r.status
  from public.collection_reports r
  left join public.users u on u.id = r.reporter_id
  where r.collection_id = p_collection_id
  order by (r.status = 'open') desc, r.created_at desc;
end;
$function$;
revoke all on function public.admin_list_collection_reports(uuid) from public, anon, authenticated, service_role;
grant execute on function public.admin_list_collection_reports(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_collections()
 RETURNS TABLE(id uuid, name text, owner_id uuid, owner_email text, visibility collection_visibility, is_builtin boolean, is_public boolean, kind text, slug text, term_count bigint, love_count integer, open_report_count bigint, share_blocked_at timestamp with time zone, share_block_reason text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can list all collections';
  end if;

  return query
  select d.id, d.name, d.owner_id, u.email, d.visibility, d.is_builtin, d.is_public, d.kind, d.slug,
         (select count(*) from public.terms t where t.collection_id = d.id),
         d.love_count,
         (select count(*) from public.collection_reports r where r.collection_id = d.id and r.status = 'open'),
         d.share_blocked_at, d.share_block_reason,
         d.created_at, d.updated_at
  from public.collections d
  left join public.users u on u.id = d.owner_id
  order by d.name;
end;
$function$;
revoke all on function public.admin_list_collections() from public, anon, authenticated, service_role;
grant execute on function public.admin_list_collections() to authenticated;

CREATE OR REPLACE FUNCTION public.admin_person_detail(p_user_id uuid)
 RETURNS TABLE(suspended_at timestamp with time zone, referral_verified boolean, ban_mismatch boolean, current_streak integer, longest_streak integer, last_active_date date, owned_collections integer, people_using_collections integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can view accounts';
  end if;

  return query
  select
    u.suspended_at,
    u.referral_verified,
    (u.suspended_at is not null) <> coalesce(au.banned_until > now(), false),
    coalesce(s.current_streak, 0),
    coalesce(s.longest_streak, 0),
    s.last_active_date,
    (select count(*)::integer from public.collections d where d.owner_id = u.id),
    public._admin_people_using_collections(u.id)
  from public.users u
  join auth.users au on au.id = u.id
  left join public.user_settings s on s.user_id = u.id
  where u.id = p_user_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_publish_collection(p_collection_id uuid, p_collection_slug text, p_term_slugs jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_collection public.collections;
  v_slug text;
  v_pair record;
  v_missing integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can publish collections';
  end if;
  if p_term_slugs is null or jsonb_typeof(p_term_slugs) <> 'object' then
    raise exception 'Term slugs must be a JSON object';
  end if;
  if (select count(*) from jsonb_object_keys(p_term_slugs)) > 20000 then
    raise exception 'Too many term slugs';
  end if;

  select * into v_collection from public.collections where id = p_collection_id for update;
  if not found then
    raise exception 'Collection not found.';
  end if;
  if not v_collection.is_builtin then
    raise exception 'Only built-in collections can be made public.';
  end if;

  v_slug := coalesce(nullif(v_collection.slug, ''), p_collection_slug);
  if v_slug is null or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 200 then
    raise exception 'The collection slug is not valid.';
  end if;

  for v_pair in select e.key, e.value from jsonb_each_text(p_term_slugs) e loop
    if v_pair.key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Term ids must be uuids.';
    end if;
    if jsonb_typeof(p_term_slugs -> v_pair.key) <> 'string'
       or v_pair.value !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_pair.value) > 200 then
      raise exception 'A term slug is not valid.';
    end if;
  end loop;

  if (select count(distinct e.value) from jsonb_each_text(p_term_slugs) e)
     <> (select count(*) from jsonb_each_text(p_term_slugs)) then
    raise exception 'Two terms were given the same slug.';
  end if;

  if exists (
    select 1
    from jsonb_each_text(p_term_slugs) e
    where not exists (
      select 1 from public.terms t where t.id = e.key::uuid and t.collection_id = p_collection_id
    )
  ) then
    raise exception 'A slug was given for a term that is not in this collection.';
  end if;

  update public.collections
  set slug = v_slug
  where id = p_collection_id and (slug is null or slug = '');

  update public.terms t
  set slug = e.value
  from jsonb_each_text(p_term_slugs) e
  where t.id = e.key::uuid
    and t.collection_id = p_collection_id
    and (t.slug is null or t.slug = '');

  select count(*) into v_missing
  from public.terms t
  where t.collection_id = p_collection_id and (t.slug is null or t.slug = '');
  if v_missing > 0 then
    -- A serialization failure, so the app can tell "read again and retry" from real errors.
    raise exception 'Some terms have no slug yet. Try again.' using errcode = '40001';
  end if;

  update public.collections set is_public = true where id = p_collection_id;

  perform public._admin_audit_insert(
    'publish_collection', 'collection', p_collection_id::text,
    jsonb_build_object('slug', v_slug, 'terms_slugged', (select count(*) from jsonb_object_keys(p_term_slugs)))
  );

  return v_slug;
end;
$function$;
revoke all on function public.admin_publish_collection(uuid,text,jsonb) from public, anon, authenticated, service_role;
grant execute on function public.admin_publish_collection(uuid,text,jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.admin_queue_debug_terms(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_active uuid[];
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can read a member''s queue';
  end if;

  select coalesce(array_agg(rid.review_collection_id), '{}'::uuid[])
  into v_active
  from public.review_collection_ids(p_user_id) as rid(review_collection_id);

  return (
    select coalesce(json_agg(row_to_json(r) order by r.term_id), '[]'::json)
    from (
      select
        t.id as term_id,
        t.term as term,
        t.collection_id,
        d.name as collection_name,
        t.collection_id = any(v_active) as active,
        t.definition is not null as finished,
        t.created_at,
        coalesce(rs.read_count, 0)::int as read_count,
        rs.last_read_at,
        rs.recall_stability,
        rs.recall_difficulty,
        coalesce(rs.review_recall_count, 0)::int as review_recall_count,
        rs.last_review_recall_at,
        rs.quiz_knowledge_posterior,
        coalesce(rs.quiz_test_count, 0)::int as quiz_test_count,
        rs.last_quiz_tested_at,
        rs.ever_mastered_at,
        rs.ever_learning_at,
        rs.marked_known_at
      from public.terms t
      join public.collections d on d.id = t.collection_id
      left join public.review_state rs
        on rs.term_id = t.id
       and rs.user_id = p_user_id
      where t.collection_id in (
        select dd.id from public.collections dd where dd.owner_id = p_user_id
        union
        select ucd.collection_id from public.user_collections ucd where ucd.user_id = p_user_id
      )
    ) r
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_request_unfinished_terms(p_request_id uuid)
 RETURNS TABLE(term text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can read this';
  end if;

  return query
  select t.term
  from public.collection_requests r
  join public.terms t on t.collection_id = r.target_collection_id and t.definition is null
  where r.id = p_request_id and r.kind = 'definitions'
  order by lower(t.term);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_stop_sharing_collection(p_collection_id uuid, p_reason text, p_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_collection public.collections;
  v_note text;
  v_removed integer;
  v_closed integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can stop sharing a collection' using errcode = 'AD001';
  end if;
  if p_reason is null or p_reason not in ('rules', 'personal_info', 'not_appropriate') then
    raise exception 'Choose a reason.' using errcode = 'AD001';
  end if;
  v_note := public._admin_clean_reason(p_note);

  select * into v_collection from public.collections where id = p_collection_id for update;
  if not found then
    raise exception 'That collection no longer exists.' using errcode = 'AD001';
  end if;
  if v_collection.is_builtin then
    raise exception 'Built-in collections can''t be unshared.' using errcode = 'AD001';
  end if;
  if v_collection.owner_id = auth.uid() then
    raise exception 'You can''t stop sharing your own collection.' using errcode = 'AD001';
  end if;
  if v_collection.visibility <> 'shared' then
    raise exception 'This collection isn''t shared.' using errcode = 'AD001';
  end if;

  select count(*) into v_removed
  from public.user_collections
  where collection_id = p_collection_id and user_id <> v_collection.owner_id;

  update public.collections
  set share_blocked_at = now(),
      share_block_reason = p_reason,
      visibility = 'private'
  where id = p_collection_id;

  update public.collection_reports
  set status = 'actioned', resolved_at = now(), resolved_by = auth.uid()
  where collection_id = p_collection_id and status = 'open';
  get diagnostics v_closed = row_count;

  perform public._admin_audit_insert(
    'stop_sharing_collection', 'collection', p_collection_id::text,
    jsonb_build_object('reason', p_reason, 'note', v_note, 'reports_closed', v_closed, 'removed_from', v_removed)
  );
end;
$function$;
revoke all on function public.admin_stop_sharing_collection(uuid,text,text) from public, anon, authenticated, service_role;
grant execute on function public.admin_stop_sharing_collection(uuid,text,text) to authenticated;

CREATE OR REPLACE FUNCTION public.can_read_collection(p_collection_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.collections d
    where d.id = p_collection_id
      and (d.owner_id = auth.uid() or d.visibility = 'shared')
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_read_term(p_term_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.terms t
    where t.id = p_term_id
      and public.can_read_collection(t.collection_id)
  );
$function$;

CREATE OR REPLACE FUNCTION public.delete_own_account(p_confirm_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me public.users;
  v_using integer;
begin
  if auth.uid() is null then
    raise exception 'Log in to delete your account.' using errcode = 'AD001';
  end if;

  select * into v_me from public.users where id = auth.uid() for update;
  if not found then
    raise exception 'That account no longer exists.' using errcode = 'AD001';
  end if;
  if v_me.role <> 'member' then
    raise exception 'Admin accounts can''t be deleted here. Contact support.' using errcode = 'AD001';
  end if;
  if lower(trim(coalesce(p_confirm_email, ''))) <> lower(v_me.email) then
    raise exception 'The email you typed doesn''t match.' using errcode = 'AD001';
  end if;

  perform 1 from public.collections where owner_id = v_me.id for update;
  perform 1 from public.terms t
    join public.collections d on d.id = t.collection_id
    where d.owner_id = v_me.id
    for update of t;

  v_using := public._admin_people_using_collections(v_me.id);
  if v_using > 0 then
    raise exception
      'Can''t delete yet: % other % use your collections. Make your collections private first.',
      v_using, case when v_using = 1 then 'person' else 'people' end
      using errcode = 'AD001';
  end if;

  -- An access request keeps the email outside the account, so remove it too.
  delete from public.waitlist_requests where normalized_email = lower(trim(v_me.email));

  delete from auth.users where id = v_me.id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_term_card(p_user_id uuid, p_term_id uuid)
 RETURNS TABLE(id uuid, term text, category text, definition text, example text, mental_model text, discussion text, anti_example text, controversy text, note text, collection_id uuid, collection_name text, relationships jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    t.id,
    t.term,
    t.category,
    t.definition,
    t.example,
    t.mental_model,
    t.discussion,
    t.anti_example,
    t.controversy,
    t.note,
    t.collection_id,
    d.name as collection_name,
    coalesce(
      (
        select jsonb_agg(rel.rel order by rel.rel->>'related_term_name')
        from (
          select jsonb_build_object(
            'direction', 'outgoing',
            'relationship_type', tr.relationship_type,
            'related_term_name', tgt.term,
            'description', tr.description
          ) as rel
          from public.term_relationships tr
          join public.terms tgt on tgt.id = tr.target_term_id
          where tr.source_term_id = t.id
            and tgt.definition is not null

          union all

          select jsonb_build_object(
            'direction', 'incoming',
            'relationship_type', tr.relationship_type,
            'related_term_name', src.term,
            'description', tr.description
          )
          from public.term_relationships tr
          join public.terms src on src.id = tr.source_term_id
          where tr.target_term_id = t.id
            and src.definition is not null
        ) rel
      ),
      '[]'::jsonb
    ) as relationships
  from public.terms t
  join public.collections d on d.id = t.collection_id
  where t.id = p_term_id
    and t.definition is not null
    and t.collection_id in (select public.review_collection_ids(p_user_id))
  limit 1;
$function$;
revoke all on function public.get_term_card(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_term_card(uuid,uuid) to service_role;

CREATE OR REPLACE FUNCTION public.get_term_cards(p_user_id uuid, p_term_ids uuid[])
 RETURNS TABLE(id uuid, term text, category text, definition text, example text, mental_model text, discussion text, anti_example text, controversy text, note text, collection_id uuid, collection_name text, collection_language text, relationships jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    t.id,
    t.term,
    t.category,
    t.definition,
    t.example,
    t.mental_model,
    t.discussion,
    t.anti_example,
    t.controversy,
    t.note,
    t.collection_id,
    d.name as collection_name,
    d.language::text as collection_language,
    coalesce(
      (
        select jsonb_agg(rel.rel order by rel.rel->>'related_term_name')
        from (
          select jsonb_build_object(
            'direction', 'outgoing',
            'relationship_type', tr.relationship_type,
            'related_term_name', tgt.term,
            'description', tr.description
          ) as rel
          from public.term_relationships tr
          join public.terms tgt on tgt.id = tr.target_term_id
          where tr.source_term_id = t.id
            and tgt.definition is not null

          union all

          select jsonb_build_object(
            'direction', 'incoming',
            'relationship_type', tr.relationship_type,
            'related_term_name', src.term,
            'description', tr.description
          )
          from public.term_relationships tr
          join public.terms src on src.id = tr.source_term_id
          where tr.target_term_id = t.id
            and src.definition is not null
        ) rel
      ),
      '[]'::jsonb
    ) as relationships
  from public.terms t
  join public.collections d on d.id = t.collection_id
  where t.id = any(p_term_ids)
    and t.definition is not null
    and t.collection_id in (select public.review_collection_ids(p_user_id));
$function$;
revoke all on function public.get_term_cards(uuid,uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.get_term_cards(uuid,uuid[]) to service_role;

CREATE OR REPLACE FUNCTION public.get_trace_candidates(p_user_id uuid, p_collection_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(term_id uuid, collection_id uuid, created_at timestamp with time zone, read_count integer, last_read_at timestamp with time zone, recall_stability double precision, recall_difficulty double precision, review_recall_count integer, last_review_recall_at timestamp with time zone, quiz_knowledge_posterior double precision, quiz_test_count integer, last_quiz_tested_at timestamp with time zone, ever_mastered_at timestamp with time zone, ever_learning_at timestamp with time zone, marked_known_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_collections uuid[];
begin
  select coalesce(array_agg(rid.review_collection_id), '{}'::uuid[])
  into v_collections
  from public.review_collection_ids(p_user_id) as rid(review_collection_id)
  where p_collection_ids is null
     or cardinality(p_collection_ids) = 0
     or rid.review_collection_id = any(p_collection_ids);

  if cardinality(v_collections) = 0 then
    return;
  end if;

  return query
  select
    t.id,
    t.collection_id,
    t.created_at,
    coalesce(rs.read_count, 0)::int,
    rs.last_read_at,
    rs.recall_stability,
    rs.recall_difficulty,
    coalesce(rs.review_recall_count, 0)::int,
    rs.last_review_recall_at,
    rs.quiz_knowledge_posterior,
    coalesce(rs.quiz_test_count, 0)::int,
    rs.last_quiz_tested_at,
    rs.ever_mastered_at,
    rs.ever_learning_at,
    rs.marked_known_at
  from public.terms t
  left join public.review_state rs
    on rs.term_id = t.id
   and rs.user_id = p_user_id
  where t.collection_id = any(v_collections)
    and t.definition is not null;
end;
$function$;
revoke all on function public.get_trace_candidates(uuid,uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.get_trace_candidates(uuid,uuid[]) to service_role;

CREATE OR REPLACE FUNCTION public.get_trace_candidates_json(p_user_id uuid, p_collection_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(json_agg(c order by c.term_id), '[]'::json)
  from public.get_trace_candidates(p_user_id, p_collection_ids) as c;
$function$;
revoke all on function public.get_trace_candidates_json(uuid,uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.get_trace_candidates_json(uuid,uuid[]) to service_role;

CREATE OR REPLACE FUNCTION public.get_trace_state_for_term(p_user_id uuid, p_term_id uuid)
 RETURNS TABLE(read_count integer, last_read_at timestamp with time zone, recall_stability double precision, recall_difficulty double precision, review_recall_count integer, last_review_recall_at timestamp with time zone, quiz_knowledge_posterior double precision, quiz_test_count integer, last_quiz_tested_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1
    from public.terms t
    where t.id = p_term_id
      and t.collection_id in (select public.review_collection_ids(p_user_id))
  ) then
    raise exception 'Term not in review pool';
  end if;

  return query
  select
    coalesce(rs.read_count, 0)::int,
    rs.last_read_at,
    rs.recall_stability,
    rs.recall_difficulty,
    coalesce(rs.review_recall_count, 0)::int,
    rs.last_review_recall_at,
    rs.quiz_knowledge_posterior,
    coalesce(rs.quiz_test_count, 0)::int,
    rs.last_quiz_tested_at
  from public.review_state rs
  where rs.user_id = p_user_id and rs.term_id = p_term_id
  union all
  select 0, null, null, null, 0, null, null, 0, null
  where not exists (
    select 1 from public.review_state rs where rs.user_id = p_user_id and rs.term_id = p_term_id
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_collection_unshare()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if old.visibility = 'shared' and new.visibility = 'private' then
    delete from public.user_collections
    where collection_id = new.id
      and user_id <> new.owner_id;

    delete from public.user_active_collections
    where collection_id = new.id
      and user_id <> new.owner_id;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_in_user_collections(p_collection_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.owns_collection(p_collection_id)
    or exists (
      select 1
      from public.user_collections ucd
      where ucd.collection_id = p_collection_id
        and ucd.user_id = auth.uid()
    );
$function$;

CREATE OR REPLACE FUNCTION public.my_clear_not_yet_collection(p_collection_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.triage_not_yet n
  using public.terms t
  where n.user_id = auth.uid()
    and n.term_id = t.id
    and t.collection_id = p_collection_id;
end;
$function$;
revoke all on function public.my_clear_not_yet_collection(uuid) from public, anon, authenticated, service_role;
grant execute on function public.my_clear_not_yet_collection(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.my_create_collection_request(p_topic text, p_kind text, p_language text, p_level text DEFAULT NULL::text, p_size integer DEFAULT NULL::integer, p_known_terms text DEFAULT NULL::text, p_notify_email boolean DEFAULT true, p_target_collection_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_settings public.collection_request_settings;
  v_topic text := btrim(coalesce(p_topic, ''));
  v_used integer;
  v_collection public.collections;
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
     or not public.is_supported_language(p_language)
     or (p_kind = 'definitions') <> (p_target_collection_id is not null)
     or (p_kind = 'definitions' and (p_level is not null or p_size is not null))
     or (p_level is not null and not (
       (p_kind = 'jargon' and p_level in ('new', 'basics', 'brushing_up'))
       or (p_kind = 'vocabulary' and p_level in ('a1_a2', 'b1_plus'))
     )) then
    raise exception 'invalid_request';
  end if;

  if p_kind = 'definitions' then
    select * into v_collection from public.collections
    where id = p_target_collection_id and owner_id = v_user;
    if not found or v_collection.language <> p_language then
      raise exception 'invalid_request';
    end if;
    if not exists (
      select 1 from public.terms where collection_id = p_target_collection_id and definition is null
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
    user_id, topic, kind, language, level, size, known_terms, notify_email, due_at, target_collection_id
  )
  values (
    v_user, v_topic, p_kind, p_language, p_level, p_size,
    nullif(btrim(coalesce(p_known_terms, '')), ''),
    coalesce(p_notify_email, true),
    now() + make_interval(days => case when v_settings.paused
      then v_settings.paused_estimate_days else v_settings.estimate_days end),
    p_target_collection_id
  )
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'due_at', v_row.due_at, 'topic', v_row.topic);
end;
$function$;
revoke all on function public.my_create_collection_request(text,text,text,text,integer,text,boolean,uuid) from public, anon, authenticated, service_role;
grant execute on function public.my_create_collection_request(text,text,text,text,integer,text,boolean,uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.my_get_trace_candidates(p_collection_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(term_id uuid, collection_id uuid, created_at timestamp with time zone, read_count integer, last_read_at timestamp with time zone, recall_stability double precision, recall_difficulty double precision, review_recall_count integer, last_review_recall_at timestamp with time zone, quiz_knowledge_posterior double precision, quiz_test_count integer, last_quiz_tested_at timestamp with time zone, ever_mastered_at timestamp with time zone, ever_learning_at timestamp with time zone, marked_known_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query select c.* from public.get_trace_candidates(auth.uid(), p_collection_ids) as c;
end;
$function$;
revoke all on function public.my_get_trace_candidates(uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.my_get_trace_candidates(uuid[]) to authenticated;

CREATE OR REPLACE FUNCTION public.my_get_trace_candidates_json(p_collection_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return public.get_trace_candidates_json(auth.uid(), p_collection_ids);
end;
$function$;
revoke all on function public.my_get_trace_candidates_json(uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.my_get_trace_candidates_json(uuid[]) to authenticated;

CREATE OR REPLACE FUNCTION public.my_list_collection_requests()
 RETURNS TABLE(id uuid, topic text, kind text, language text, status text, display_status text, display_due_at timestamp with time zone, question text, decline_reason text, decline_note text, delivery_kind text, delivered_collection_id uuid, delivered_collection_name text, delivered_terms integer, delay_notified_at timestamp with time zone, notify_email boolean, accepted_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    r.id, r.topic, r.kind, r.language, r.status,
    case when r.status = 'merged' then
      case when p.status = 'in_progress' then 'in_progress' else 'requested' end
    else r.status end,
    case when r.status = 'merged' then coalesce(p.due_at, r.due_at) else r.due_at end,
    r.question, r.decline_reason, r.decline_note, r.delivery_kind,
    r.delivered_collection_id, d.name, r.delivered_terms,
    r.delay_notified_at, r.notify_email, r.accepted_at, r.created_at
  from public.collection_requests r
  left join public.collection_requests p on p.id = r.merged_into
  left join public.collections d on d.id = r.delivered_collection_id
  where r.user_id = auth.uid()
    and r.status <> 'cancelled'
    and r.dismissed_at is null
  order by r.created_at desc;
$function$;
revoke all on function public.my_list_collection_requests() from public, anon, authenticated, service_role;
grant execute on function public.my_list_collection_requests() to authenticated;

CREATE OR REPLACE FUNCTION public.my_progress_state_by_collection(p_collection_ids uuid[])
 RETURNS TABLE(term_id uuid, collection_id uuid, read_count integer, last_read_at timestamp with time zone, recall_stability double precision, recall_difficulty double precision, review_recall_count integer, last_review_recall_at timestamp with time zone, quiz_knowledge_posterior double precision, quiz_test_count integer, last_quiz_tested_at timestamp with time zone, ever_mastered_at timestamp with time zone, marked_known_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query select c.* from public.progress_state_by_collection(auth.uid(), p_collection_ids) as c;
end;
$function$;
revoke all on function public.my_progress_state_by_collection(uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.my_progress_state_by_collection(uuid[]) to authenticated;

CREATE OR REPLACE FUNCTION public.my_report_collection(p_collection_id uuid, p_reason text, p_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_collection public.collections;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_existing uuid;
  v_used integer;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_reason is null or p_reason not in ('rules', 'personal_info', 'not_appropriate')
     or (v_note is not null and char_length(v_note) > 500) then
    raise exception 'invalid_report';
  end if;

  -- Serialises two reports from the same person.
  perform 1 from public.users where id = v_user for update;

  select * into v_collection from public.collections where id = p_collection_id;
  if not found or v_collection.visibility <> 'shared' or v_collection.share_blocked_at is not null then
    raise exception 'collection_not_shared';
  end if;
  if v_collection.is_builtin then
    raise exception 'builtin_collection';
  end if;
  if v_collection.owner_id = v_user then
    raise exception 'own_collection';
  end if;

  select id into v_existing
  from public.collection_reports
  where collection_id = p_collection_id and reporter_id = v_user and status = 'open';
  if found then
    return v_existing;
  end if;

  select count(*) into v_used
  from public.collection_reports
  where reporter_id = v_user and created_at > now() - interval '24 hours';
  if v_used >= 10 then
    raise exception 'report_quota_reached';
  end if;

  insert into public.collection_reports (collection_id, reporter_id, reason, note)
  values (p_collection_id, v_user, p_reason, v_note)
  returning id into v_id;

  return v_id;
end;
$function$;
revoke all on function public.my_report_collection(uuid,text,text) from public, anon, authenticated, service_role;
grant execute on function public.my_report_collection(uuid,text,text) to authenticated;

CREATE OR REPLACE FUNCTION public.my_reset_collection_progress(p_collection_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  perform public.reset_collection_progress(auth.uid(), p_collection_id);
end;
$function$;
revoke all on function public.my_reset_collection_progress(uuid) from public, anon, authenticated, service_role;
grant execute on function public.my_reset_collection_progress(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.my_review_collection_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.review_collection_ids(auth.uid());
$function$;
revoke all on function public.my_review_collection_ids() from public, anon, authenticated, service_role;
grant execute on function public.my_review_collection_ids() to authenticated;

CREATE OR REPLACE FUNCTION public.my_set_collection_love(p_collection_id uuid, p_loved boolean)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_collection public.collections;
  v_count integer;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_collection from public.collections where id = p_collection_id for update;
  if not found or v_collection.visibility <> 'shared' or v_collection.share_blocked_at is not null then
    raise exception 'collection_not_shared';
  end if;
  if v_collection.owner_id = v_user then
    raise exception 'own_collection';
  end if;

  if coalesce(p_loved, false) then
    insert into public.collection_loves (user_id, collection_id)
    values (v_user, p_collection_id)
    on conflict do nothing;
  else
    delete from public.collection_loves where user_id = v_user and collection_id = p_collection_id;
  end if;

  select love_count into v_count from public.collections where id = p_collection_id;
  return v_count;
end;
$function$;
revoke all on function public.my_set_collection_love(uuid,boolean) from public, anon, authenticated, service_role;
grant execute on function public.my_set_collection_love(uuid,boolean) to authenticated;

CREATE OR REPLACE FUNCTION public.my_study_collection_term_counts()
 RETURNS TABLE(collection_id uuid, term_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select t.collection_id, count(*)::int
  from public.terms t
  where t.definition is not null
    and t.collection_id in (
      select d.id from public.collections d where d.owner_id = auth.uid()
      union
      select ucd.collection_id from public.user_collections ucd where ucd.user_id = auth.uid()
    )
    and not exists (
      select 1
      from public.review_state rs
      where rs.user_id = auth.uid()
        and rs.term_id = t.id
        and rs.marked_known_at is not null
    )
  group by t.collection_id;
end;
$function$;
revoke all on function public.my_study_collection_term_counts() from public, anon, authenticated, service_role;
grant execute on function public.my_study_collection_term_counts() to authenticated;

CREATE OR REPLACE FUNCTION public.my_term_relationships_by_collection(p_collection_id uuid)
 RETURNS TABLE(id uuid, relationship_type text, description text, source_term_id uuid, target_term_id uuid, source_term_name text, target_term_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    tr.id,
    tr.relationship_type,
    tr.description,
    tr.source_term_id,
    tr.target_term_id,
    s.term as source_term_name,
    t.term as target_term_name
  from public.term_relationships tr
  join public.terms s on s.id = tr.source_term_id
  join public.terms t on t.id = tr.target_term_id
  where (s.collection_id = p_collection_id or t.collection_id = p_collection_id)
    and (s.definition is not null or public.owns_collection(s.collection_id))
    and (t.definition is not null or public.owns_collection(t.collection_id));
end;
$function$;
revoke all on function public.my_term_relationships_by_collection(uuid) from public, anon, authenticated, service_role;
grant execute on function public.my_term_relationships_by_collection(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.my_unfinished_term_counts(p_collection_ids uuid[])
 RETURNS TABLE(collection_id uuid, unfinished_count integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select t.collection_id, count(*)::int
  from public.terms t
  where t.collection_id = any(p_collection_ids)
    and t.definition is null
  group by t.collection_id;
$function$;
revoke all on function public.my_unfinished_term_counts(uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.my_unfinished_term_counts(uuid[]) to authenticated;

CREATE OR REPLACE FUNCTION public.owns_collection(p_collection_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.collections d
    where d.id = p_collection_id
      and d.owner_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.progress_state_by_collection(p_user_id uuid, p_collection_ids uuid[])
 RETURNS TABLE(term_id uuid, collection_id uuid, read_count integer, last_read_at timestamp with time zone, recall_stability double precision, recall_difficulty double precision, review_recall_count integer, last_review_recall_at timestamp with time zone, quiz_knowledge_posterior double precision, quiz_test_count integer, last_quiz_tested_at timestamp with time zone, ever_mastered_at timestamp with time zone, marked_known_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    t.id,
    t.collection_id,
    coalesce(rs.read_count, 0)::int,
    rs.last_read_at,
    rs.recall_stability,
    rs.recall_difficulty,
    coalesce(rs.review_recall_count, 0)::int,
    rs.last_review_recall_at,
    rs.quiz_knowledge_posterior,
    coalesce(rs.quiz_test_count, 0)::int,
    rs.last_quiz_tested_at,
    rs.ever_mastered_at,
    rs.marked_known_at
  from public.terms t
  left join public.review_state rs on rs.term_id = t.id and rs.user_id = p_user_id
  where t.collection_id = any(p_collection_ids)
    and t.definition is not null;
$function$;
revoke all on function public.progress_state_by_collection(uuid,uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.progress_state_by_collection(uuid,uuid[]) to service_role;

CREATE OR REPLACE FUNCTION public.record_review_event(p_user_id uuid, p_term_id uuid, p_event review_event, p_recall_stability double precision DEFAULT NULL::double precision, p_recall_difficulty double precision DEFAULT NULL::double precision, p_quiz_knowledge_posterior double precision DEFAULT NULL::double precision, p_crossed_known_threshold boolean DEFAULT false, p_grade smallint DEFAULT NULL::smallint, p_question_type text DEFAULT NULL::text, p_retrievability_before double precision DEFAULT NULL::double precision, p_crossed_learning_threshold boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1
    from public.terms t
    where t.id = p_term_id
      and t.collection_id in (select public.review_collection_ids(p_user_id))
  ) then
    raise exception 'Term not in review pool';
  end if;

  if p_event in ('review_pass', 'review_fail')
     and (p_recall_stability is null or p_recall_difficulty is null) then
    raise exception 'review_pass/review_fail requires recall_stability and recall_difficulty';
  end if;

  if p_event in ('quiz_pass', 'quiz_fail') and p_quiz_knowledge_posterior is null then
    raise exception 'quiz_pass/quiz_fail requires quiz_knowledge_posterior';
  end if;

  if p_event in ('review_pass', 'review_fail') and p_grade is null then
    raise exception 'review_pass/review_fail requires grade';
  end if;

  if p_event in ('quiz_pass', 'quiz_fail') and p_question_type is null then
    raise exception 'quiz_pass/quiz_fail requires question_type';
  end if;

  insert into public.review_state (
    user_id, term_id, read_count, last_read_at,
    review_recall_count, last_review_recall_at,
    quiz_test_count, last_quiz_tested_at,
    recall_stability, recall_difficulty, quiz_knowledge_posterior,
    ever_mastered_at, ever_learning_at
  )
  values (
    p_user_id,
    p_term_id,
    case when p_event = 'read' then 1 else 0 end,
    case when p_event = 'read' then now() else null end,
    case when p_event in ('review_pass', 'review_fail') then 1 else 0 end,
    case when p_event in ('review_pass', 'review_fail') then now() else null end,
    case when p_event in ('quiz_pass', 'quiz_fail') then 1 else 0 end,
    case when p_event in ('quiz_pass', 'quiz_fail') then now() else null end,
    p_recall_stability,
    p_recall_difficulty,
    p_quiz_knowledge_posterior,
    case when p_crossed_known_threshold then now() else null end,
    case when p_crossed_learning_threshold then now() else null end
  )
  on conflict (user_id, term_id) do update
  set
    read_count = public.review_state.read_count
      + case when p_event = 'read' then 1 else 0 end,
    last_read_at = case
      when p_event = 'read' then now()
      else public.review_state.last_read_at
    end,
    review_recall_count = public.review_state.review_recall_count
      + case when p_event in ('review_pass', 'review_fail') then 1 else 0 end,
    last_review_recall_at = case
      when p_event in ('review_pass', 'review_fail') then now()
      else public.review_state.last_review_recall_at
    end,
    quiz_test_count = public.review_state.quiz_test_count
      + case when p_event in ('quiz_pass', 'quiz_fail') then 1 else 0 end,
    last_quiz_tested_at = case
      when p_event in ('quiz_pass', 'quiz_fail') then now()
      else public.review_state.last_quiz_tested_at
    end,
    recall_stability = coalesce(p_recall_stability, public.review_state.recall_stability),
    recall_difficulty = coalesce(p_recall_difficulty, public.review_state.recall_difficulty),
    quiz_knowledge_posterior = coalesce(
      p_quiz_knowledge_posterior, public.review_state.quiz_knowledge_posterior
    ),
    -- High-water marks: each set once, never cleared or overwritten once set.
    ever_mastered_at = case
      when public.review_state.ever_mastered_at is not null
        then public.review_state.ever_mastered_at
      when p_crossed_known_threshold then now()
      else public.review_state.ever_mastered_at
    end,
    ever_learning_at = case
      when public.review_state.ever_learning_at is not null
        then public.review_state.ever_learning_at
      when p_crossed_learning_threshold then now()
      else public.review_state.ever_learning_at
    end;

  insert into public.review_events (
    user_id, term_id, event, grade, question_type, retrievability_before,
    recall_stability, recall_difficulty, quiz_knowledge_posterior
  )
  values (
    p_user_id, p_term_id, p_event, p_grade, p_question_type, p_retrievability_before,
    p_recall_stability, p_recall_difficulty, p_quiz_knowledge_posterior
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.reset_collection_progress(p_user_id uuid, p_collection_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_term_ids uuid[];
begin
  if not exists (
    select 1 from public.collections d
    where d.id = p_collection_id and d.owner_id = p_user_id
  ) and not exists (
    select 1 from public.user_collections ucd
    where ucd.collection_id = p_collection_id and ucd.user_id = p_user_id
  ) then
    raise exception 'Collection not in user collection';
  end if;

  select coalesce(array_agg(t.id), '{}'::uuid[])
  into v_term_ids
  from public.terms t
  where t.collection_id = p_collection_id;

  if cardinality(v_term_ids) = 0 then
    return;
  end if;

  delete from public.review_state
  where user_id = p_user_id
    and term_id = any(v_term_ids);

  delete from public.triage_not_yet
  where user_id = p_user_id
    and term_id = any(v_term_ids);
end;
$function$;
revoke all on function public.reset_collection_progress(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.reset_collection_progress(uuid,uuid) to service_role;

CREATE OR REPLACE FUNCTION public.review_collection_ids(p_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select uad.collection_id
  from public.user_active_collections uad
  where uad.user_id = p_user_id
    and (
      exists (
        select 1
        from public.collections d
        where d.id = uad.collection_id
          and d.owner_id = p_user_id
      )
      or exists (
        select 1
        from public.user_collections ucd
        where ucd.user_id = p_user_id
          and ucd.collection_id = uad.collection_id
      )
    );
$function$;
revoke all on function public.review_collection_ids(uuid) from public, anon, authenticated, service_role;
grant execute on function public.review_collection_ids(uuid) to service_role;

CREATE TRIGGER collections_unshare_cleanup AFTER UPDATE OF visibility ON public.collections FOR EACH ROW EXECUTE FUNCTION handle_collection_unshare();
CREATE TRIGGER collections_guard_protected BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION _collections_guard_protected();

create policy "Users read visible terms" on public.terms as permissive for select to authenticated using ((can_read_collection(collection_id) AND ((definition IS NOT NULL) OR owns_collection(collection_id))));
create policy "Owners delete terms" on public.terms as permissive for delete to authenticated using (owns_collection(collection_id));
create policy "Owners update terms" on public.terms as permissive for update to authenticated using (owns_collection(collection_id)) with check (owns_collection(collection_id));
create policy "Owners insert terms" on public.terms as permissive for insert to authenticated with check (owns_collection(collection_id));
create policy "Owners delete relationships" on public.term_relationships as permissive for delete to authenticated using ((EXISTS ( SELECT 1
   FROM terms s
  WHERE ((s.id = term_relationships.source_term_id) AND owns_collection(s.collection_id)))));
create policy "Owners update relationships" on public.term_relationships as permissive for update to authenticated using ((EXISTS ( SELECT 1
   FROM terms s
  WHERE ((s.id = term_relationships.source_term_id) AND owns_collection(s.collection_id))))) with check ((EXISTS ( SELECT 1
   FROM (terms s
     JOIN terms t ON ((t.id = term_relationships.target_term_id)))
  WHERE ((s.id = term_relationships.source_term_id) AND owns_collection(s.collection_id) AND owns_collection(t.collection_id) AND (s.collection_id = t.collection_id)))));
create policy "Owners insert relationships" on public.term_relationships as permissive for insert to authenticated with check ((EXISTS ( SELECT 1
   FROM (terms s
     JOIN terms t ON ((t.id = term_relationships.target_term_id)))
  WHERE ((s.id = term_relationships.source_term_id) AND owns_collection(s.collection_id) AND owns_collection(t.collection_id) AND (s.collection_id = t.collection_id)))));
create policy "Users set active collections" on public.user_active_collections as permissive for insert to authenticated with check (((user_id = auth.uid()) AND is_in_user_collections(collection_id)));

update public.admin_audit_log set target_type = 'collection' where target_type = 'domain';
update public.import_batches
set result = (result - 'domain_id' - 'domain_name')
  || case when result ? 'domain_id' then jsonb_build_object('collection_id', result -> 'domain_id') else '{}'::jsonb end
  || case when result ? 'domain_name' then jsonb_build_object('collection_name', result -> 'domain_name') else '{}'::jsonb end
where result ? 'domain_id' or result ? 'domain_name';

comment on function public.review_collection_ids(uuid) is 'Collection ids in the user review pool (owned active + collection active).';
comment on column public.user_settings.term_layout is 'Term body layout: {"default": {block: "shown"|"more"}, "collections": {collection_id: {block: ...}}}.';

reset check_function_bodies;
