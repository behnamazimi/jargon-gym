-- Delivery of a requested collection runs the import as another person, so the
-- body of my_import_terms moves into an internal function that takes the user.
-- my_import_terms keeps its signature and behaviour and just passes auth.uid().
-- The internal function can also suffix a taken collection name ("Name (2)")
-- instead of failing.
--
-- Rollback (as a new migration): restore my_import_terms from
-- 20261001130000_import_batches.sql and drop _import_terms_for.

create function public._import_terms_for(
  p_user uuid,
  p_import_id uuid,
  p_destination jsonb,
  p_terms jsonb,
  p_relationships jsonb,
  p_policy text,
  p_entry text default null,
  p_source text default null,
  p_format text default null,
  p_name_collision text default 'fail'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := p_user;
  v_count int;
  v_batch_user uuid;
  v_batch_result jsonb;
  v_domain_id uuid;
  v_domain_name text;
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

  if p_destination ? 'domain_id' then
    select d.id, d.name into v_domain_id, v_domain_name
    from public.domains d
    where d.id = (p_destination->>'domain_id')::uuid and d.owner_id = v_user;
    if v_domain_id is null then
      raise exception 'destination_not_found';
    end if;
  else
    v_name := btrim(coalesce(p_destination->>'name', ''));
    v_language := coalesce(p_destination->>'language', 'en');
    if v_name = '' or char_length(v_name) > 100 or v_language not in ('en', 'nl') then
      raise exception 'invalid_destination';
    end if;
    loop
      begin
        insert into public.domains (name, owner_id, visibility, language)
        values (
          case when v_attempt = 1 then v_name else v_name || ' (' || v_attempt || ')' end,
          v_user, 'private', v_language
        )
        returning id, name into v_domain_id, v_domain_name;
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
    where t.domain_id = v_domain_id and lower(btrim(t.term)) = v_key
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
        domain_id, term, definition, category, example, mental_model,
        discussion, anti_example, controversy, note
      )
      values (
        v_domain_id,
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

  insert into public.user_active_domains (user_id, domain_id)
  values (v_user, v_domain_id)
  on conflict (user_id, domain_id) do nothing;

  v_result := jsonb_build_object(
    'domain_id', v_domain_id,
    'domain_name', v_domain_name,
    'created', v_created,
    'updated', v_updated,
    'skipped', v_skipped,
    'unfinished', v_unfinished,
    'relationships_created', v_rel_created,
    'relationships_updated', v_rel_updated,
    'relationships_dropped', v_rel_dropped
  );

  update public.import_batches
  set result = v_result, domain_id = v_domain_id
  where id = p_import_id;

  return v_result || jsonb_build_object('already_applied', false);
end;
$$;

revoke all on function public._import_terms_for(uuid, uuid, jsonb, jsonb, jsonb, text, text, text, text, text)
  from public, anon, authenticated, service_role;

create or replace function public.my_import_terms(
  p_import_id uuid,
  p_destination jsonb,
  p_terms jsonb,
  p_relationships jsonb,
  p_policy text,
  p_entry text default null,
  p_source text default null,
  p_format text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return public._import_terms_for(
    auth.uid(), p_import_id, p_destination, p_terms, p_relationships,
    p_policy, p_entry, p_source, p_format, 'fail'
  );
end;
$$;
