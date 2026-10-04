-- A collection is either the terms of a field or the words and phrases of a
-- language. Public collection pages word themselves by it. Requests already
-- make the same split ('jargon' / 'vocabulary'), so delivery copies it onto the
-- collection it creates.
--
-- Additive only: existing collections become 'terms', and app code that doesn't
-- know the column keeps working.
--
-- Rollback:
--   alter table public.domains drop column kind;
--   then re-run admin_list_collections from 20260930110000_admin_rpcs.sql
--   (drop it first) and admin_deliver_request from
--   20261002110000_collection_requests.sql.

alter table public.domains
  add column kind text not null default 'terms'
  constraint domains_kind_check check (kind in ('terms', 'vocabulary'));

-- The admin list shows the kind. A function's return type can't change in
-- place, so it is dropped and recreated with the same grants.
drop function public.admin_list_collections();

create function public.admin_list_collections()
returns table (
  id uuid,
  name text,
  owner_id uuid,
  owner_email text,
  visibility public.domain_visibility,
  is_builtin boolean,
  is_public boolean,
  kind text,
  slug text,
  term_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can list all collections';
  end if;

  return query
  select d.id, d.name, d.owner_id, u.email, d.visibility, d.is_builtin, d.is_public, d.kind, d.slug,
         (select count(*) from public.terms t where t.domain_id = d.id),
         d.created_at, d.updated_at
  from public.domains d
  left join public.users u on u.id = d.owner_id
  order by d.name;
end;
$$;

revoke all on function public.admin_list_collections() from public, anon;
grant execute on function public.admin_list_collections() to authenticated;

-- Unchanged except for setting the kind of each delivered copy.
create or replace function public.admin_deliver_request(
  p_request_id uuid,
  p_name text,
  p_terms jsonb,
  p_relationships jsonb,
  p_format text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

    update public.domains
    set kind = case v_request.kind when 'vocabulary' then 'vocabulary' else 'terms' end
    where id = (v_result->>'domain_id')::uuid;

    update public.collection_requests
    set status = 'ready',
        delivery_kind = 'prepared',
        delivered_domain_id = (v_result->>'domain_id')::uuid,
        delivered_terms = (v_result->>'created')::integer,
        ready_at = now(),
        needs_input_since = null
    where id = v_target.id;

    v_terms := (v_result->>'created')::integer;
    v_deliveries := v_deliveries || jsonb_build_array(jsonb_build_object(
      'request_id', v_target.id,
      'user_id', v_target.user_id,
      'domain_id', v_result->>'domain_id',
      'domain_name', v_result->>'domain_name',
      'created', (v_result->>'created')::integer
    ));
  end loop;

  perform public._admin_audit_insert(
    'deliver_collection_request', 'collection_request', p_request_id::text,
    jsonb_build_object('deliveries', jsonb_array_length(v_deliveries), 'terms', v_terms)
  );

  return v_deliveries;
end;
$$;
