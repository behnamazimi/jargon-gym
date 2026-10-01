-- Request a collection. A person sends a topic, the admin builds the
-- collection by hand and delivers it as a private collection the requester
-- owns. People act on their own requests only through the my_* functions; the
-- admin's simple transitions are compare-and-set updates from the app, and
-- delivery (which writes into another person's account) is a function that
-- audits in the same transaction.
--
-- Requests ship switched off: collection_request_settings.enabled starts false.
--
-- Rollback (as a new migration, history is append-only): set enabled to false to
-- stop new requests. Don't drop the tables once anyone has a request. Delivered
-- collections are ordinary collections and are never cleaned up with SQL.

-- ---------------------------------------------------------------------------
-- Settings: one row, readable by everyone signed in (the form shows the pause
-- banner), changed by admins.
-- ---------------------------------------------------------------------------

create table public.collection_request_settings (
  id boolean primary key default true,
  enabled boolean not null default false,
  paused boolean not null default false,
  estimate_days integer not null default 2 check (estimate_days between 1 and 30),
  paused_estimate_days integer not null default 7 check (paused_estimate_days between 1 and 60),
  updated_at timestamptz not null default now(),
  constraint collection_request_settings_singleton check (id)
);

insert into public.collection_request_settings (id) values (true);

create trigger collection_request_settings_set_updated_at
  before update on public.collection_request_settings
  for each row
  execute function public.set_updated_at();

alter table public.collection_request_settings enable row level security;

create policy "Signed-in users read request settings"
  on public.collection_request_settings for select
  to authenticated
  using (true);

create policy "Admins update request settings"
  on public.collection_request_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on table public.collection_request_settings from public, anon, authenticated, service_role;
grant select on public.collection_request_settings to authenticated, service_role;
grant update (enabled, paused, estimate_days, paused_estimate_days)
  on public.collection_request_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Requests
-- ---------------------------------------------------------------------------

create table public.collection_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  topic text not null check (char_length(btrim(topic)) between 3 and 120),
  kind text not null check (kind in ('jargon', 'vocabulary')),
  language text not null check (language in ('en', 'nl')),
  level text check (level in ('new', 'basics', 'brushing_up', 'a1_a2', 'b1_plus')),
  size integer check (size in (20, 50, 100)),
  known_terms text check (char_length(known_terms) <= 5000),
  status text not null default 'requested'
    check (status in ('requested', 'in_progress', 'needs_input', 'ready', 'declined', 'cancelled', 'merged')),
  notify_email boolean not null default true,
  due_at timestamptz not null,
  accepted_at timestamptz,
  ready_at timestamptz,
  needs_input_since timestamptz,
  question text check (char_length(question) <= 500),
  user_reply text check (char_length(user_reply) <= 1000),
  replied_at timestamptz,
  decline_reason text
    check (decline_reason in ('too_broad', 'too_niche', 'not_jargon_or_vocabulary', 'language_not_supported', 'team_internal')),
  decline_note text check (char_length(decline_note) <= 300),
  merged_into uuid references public.collection_requests (id) on delete set null,
  delivery_kind text check (delivery_kind in ('prepared', 'added_shared')),
  delivered_domain_id uuid references public.domains (id) on delete set null,
  delivered_terms integer,
  delay_notified_at timestamptz,
  email_failed boolean not null default false,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The one-open-request rule, enforced by the database.
create unique index collection_requests_one_open_idx
  on public.collection_requests (user_id)
  where status in ('requested', 'in_progress', 'needs_input', 'merged');

create index collection_requests_queue_idx on public.collection_requests (status, due_at);
create index collection_requests_user_created_idx on public.collection_requests (user_id, created_at desc);
create index collection_requests_merged_into_idx
  on public.collection_requests (merged_into) where merged_into is not null;

create trigger collection_requests_set_updated_at
  before update on public.collection_requests
  for each row
  execute function public.set_updated_at();

alter table public.collection_requests enable row level security;

create policy "Read own requests, admins read all"
  on public.collection_requests for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Admins update requests"
  on public.collection_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on table public.collection_requests from public, anon, authenticated, service_role;
grant select on public.collection_requests to authenticated, service_role;
grant update (
  status, accepted_at, needs_input_since, question, user_reply, replied_at,
  decline_reason, decline_note, due_at, delay_notified_at, merged_into, email_failed
) on public.collection_requests to authenticated;

-- ---------------------------------------------------------------------------
-- Merged requests follow a primary. When the primary is cancelled or deleted
-- (an account deletion cascades), the oldest merged request becomes the new
-- primary so nobody is left waiting on a job nobody owns.
-- ---------------------------------------------------------------------------

create function public._promote_merged_children(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_accepted_at timestamptz;
  v_new uuid;
begin
  select accepted_at into v_accepted_at from public.collection_requests where id = p_id;

  select id into v_new
  from public.collection_requests
  where merged_into = p_id and status = 'merged'
  order by created_at, id
  limit 1
  for update;

  if v_new is null then
    return;
  end if;

  update public.collection_requests
  set status = case when v_accepted_at is not null then 'in_progress' else 'requested' end,
      accepted_at = v_accepted_at,
      merged_into = null
  where id = v_new;

  update public.collection_requests
  set merged_into = v_new
  where merged_into = p_id and status = 'merged' and id <> v_new;
end;
$$;

create function public._collection_requests_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._promote_merged_children(old.id);
  return old;
end;
$$;

create trigger collection_requests_promote_children
  before delete on public.collection_requests
  for each row
  execute function public._collection_requests_before_delete();

revoke all on function public._promote_merged_children(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public._collection_requests_before_delete()
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- A person's own requests
-- ---------------------------------------------------------------------------

-- What counts toward "3 in 30 days": everything except declined requests and
-- requests cancelled before work started.
create function public._counted_requests(p_user uuid)
returns table (created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.created_at
  from public.collection_requests r
  where r.user_id = p_user
    and r.created_at > now() - interval '30 days'
    and r.status <> 'declined'
    and not (r.status = 'cancelled' and r.accepted_at is null);
$$;

revoke all on function public._counted_requests(uuid) from public, anon, authenticated, service_role;

create function public.my_create_collection_request(
  p_topic text,
  p_kind text,
  p_language text,
  p_level text default null,
  p_size integer default null,
  p_known_terms text default null,
  p_notify_email boolean default true
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
  v_row public.collection_requests;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  -- Serialises two submits from the same person.
  perform 1 from public.users where id = v_user for update;

  select * into v_settings from public.collection_request_settings where id;
  if not v_settings.enabled then
    raise exception 'requests_closed';
  end if;

  if char_length(v_topic) < 3 or char_length(v_topic) > 120
     or p_kind not in ('jargon', 'vocabulary')
     or p_language not in ('en', 'nl')
     or (p_level is not null and not (
       (p_kind = 'jargon' and p_level in ('new', 'basics', 'brushing_up'))
       or (p_kind = 'vocabulary' and p_level in ('a1_a2', 'b1_plus'))
     )) then
    raise exception 'invalid_request';
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
    user_id, topic, kind, language, level, size, known_terms, notify_email, due_at
  )
  values (
    v_user, v_topic, p_kind, p_language, p_level, p_size,
    nullif(btrim(coalesce(p_known_terms, '')), ''),
    coalesce(p_notify_email, true),
    now() + make_interval(days => case when v_settings.paused
      then v_settings.paused_estimate_days else v_settings.estimate_days end)
  )
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'due_at', v_row.due_at, 'topic', v_row.topic);
end;
$$;

create function public.my_collection_request_quota()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_settings public.collection_request_settings;
  v_used integer;
  v_oldest timestamptz;
  v_open public.collection_requests;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_settings from public.collection_request_settings where id;
  select count(*), min(c.created_at) into v_used, v_oldest from public._counted_requests(v_user) c;

  select * into v_open
  from public.collection_requests
  where user_id = v_user and status in ('requested', 'in_progress', 'needs_input', 'merged')
  limit 1;

  return jsonb_build_object(
    'enabled', v_settings.enabled,
    'paused', v_settings.paused,
    'estimate_days', case when v_settings.paused then v_settings.paused_estimate_days else v_settings.estimate_days end,
    'used', v_used,
    'limit', 3,
    'next_available_at', case when v_used >= 3 then v_oldest + interval '30 days' end,
    'open_request_id', v_open.id,
    'open_request_topic', v_open.topic
  );
end;
$$;

-- A merged request shows its primary's progress, and nothing else of the primary.
create function public.my_list_collection_requests()
returns table (
  id uuid,
  topic text,
  kind text,
  language text,
  status text,
  display_status text,
  display_due_at timestamptz,
  question text,
  decline_reason text,
  decline_note text,
  delivery_kind text,
  delivered_domain_id uuid,
  delivered_domain_name text,
  delivered_terms integer,
  delay_notified_at timestamptz,
  notify_email boolean,
  accepted_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id, r.topic, r.kind, r.language, r.status,
    case when r.status = 'merged' then
      case when p.status = 'in_progress' then 'in_progress' else 'requested' end
    else r.status end,
    case when r.status = 'merged' then coalesce(p.due_at, r.due_at) else r.due_at end,
    r.question, r.decline_reason, r.decline_note, r.delivery_kind,
    r.delivered_domain_id, d.name, r.delivered_terms,
    r.delay_notified_at, r.notify_email, r.accepted_at, r.created_at
  from public.collection_requests r
  left join public.collection_requests p on p.id = r.merged_into
  left join public.domains d on d.id = r.delivered_domain_id
  where r.user_id = auth.uid()
    and r.status <> 'cancelled'
    and r.dismissed_at is null
  order by r.created_at desc;
$$;

create function public.my_cancel_collection_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.collection_requests;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row from public.collection_requests
  where id = p_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if v_row.status not in ('requested', 'in_progress', 'needs_input', 'merged') then
    raise exception 'request_not_cancellable';
  end if;

  update public.collection_requests set status = 'cancelled', merged_into = null where id = p_id;
  perform public._promote_merged_children(p_id);
end;
$$;

-- Answering a question puts the request back in the queue (or back to work if
-- it was already accepted) and gives back the days spent waiting.
create function public.my_reply_collection_request(p_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.collection_requests;
  v_reply text := btrim(coalesce(p_reply, ''));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if char_length(v_reply) < 1 or char_length(v_reply) > 1000 then
    raise exception 'invalid_request';
  end if;

  select * into v_row from public.collection_requests
  where id = p_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if v_row.status <> 'needs_input' then
    raise exception 'request_not_waiting';
  end if;

  update public.collection_requests
  set user_reply = v_reply,
      replied_at = now(),
      due_at = due_at + (now() - coalesce(needs_input_since, now())),
      needs_input_since = null,
      status = case when accepted_at is not null then 'in_progress' else 'requested' end
  where id = p_id;
end;
$$;

create function public.my_dismiss_collection_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.collection_requests set dismissed_at = now()
  where id = p_id and user_id = auth.uid() and status in ('ready', 'declined');
  if not found then
    raise exception 'request_not_found';
  end if;
end;
$$;

create function public.my_set_request_notify(p_id uuid, p_notify boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.collection_requests set notify_email = coalesce(p_notify, true)
  where id = p_id and user_id = auth.uid();
  if not found then
    raise exception 'request_not_found';
  end if;
end;
$$;

revoke all on function public.my_create_collection_request(text, text, text, text, integer, text, boolean) from public, anon;
revoke all on function public.my_collection_request_quota() from public, anon;
revoke all on function public.my_list_collection_requests() from public, anon;
revoke all on function public.my_cancel_collection_request(uuid) from public, anon;
revoke all on function public.my_reply_collection_request(uuid, text) from public, anon;
revoke all on function public.my_dismiss_collection_request(uuid) from public, anon;
revoke all on function public.my_set_request_notify(uuid, boolean) from public, anon;
grant execute on function public.my_create_collection_request(text, text, text, text, integer, text, boolean) to authenticated;
grant execute on function public.my_collection_request_quota() to authenticated;
grant execute on function public.my_list_collection_requests() to authenticated;
grant execute on function public.my_cancel_collection_request(uuid) to authenticated;
grant execute on function public.my_reply_collection_request(uuid, text) to authenticated;
grant execute on function public.my_dismiss_collection_request(uuid) to authenticated;
grant execute on function public.my_set_request_notify(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Delivery. These write into another person's account, which their row level
-- security would block, so they are functions: admin only, one transaction,
-- audited. The audit details hold ids and counts, never the topic or emails.
-- ---------------------------------------------------------------------------

-- Builds the collection by hand-prepared terms, one private copy for the
-- requester and one for every request merged into this one.
create function public.admin_deliver_request(
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

-- Adds a shared collection to the requester's library (the same effect as the
-- one-tap Add), for a request a Browse collection already answers.
create function public.admin_deliver_existing_collection(p_request_id uuid, p_domain_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.collection_requests;
  v_target public.collection_requests;
  v_domain public.domains;
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

  select * into v_domain from public.domains where id = p_domain_id;
  if not found or v_domain.visibility <> 'shared' then
    raise exception 'That collection isn''t shared.' using errcode = 'AD001';
  end if;
  select count(*)::integer into v_count
  from public.terms where domain_id = p_domain_id and definition is not null;

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

    if v_domain.owner_id <> v_target.user_id then
      insert into public.user_collection_domains (user_id, domain_id)
      values (v_target.user_id, p_domain_id)
      on conflict (user_id, domain_id) do nothing;
    end if;
    insert into public.user_active_domains (user_id, domain_id)
    values (v_target.user_id, p_domain_id)
    on conflict (user_id, domain_id) do nothing;

    update public.collection_requests
    set status = 'ready',
        delivery_kind = 'added_shared',
        delivered_domain_id = p_domain_id,
        delivered_terms = v_count,
        ready_at = now(),
        needs_input_since = null
    where id = v_target.id;

    v_deliveries := v_deliveries || jsonb_build_array(jsonb_build_object(
      'request_id', v_target.id,
      'user_id', v_target.user_id,
      'domain_id', p_domain_id,
      'domain_name', v_domain.name,
      'created', v_count
    ));
  end loop;

  perform public._admin_audit_insert(
    'deliver_existing_collection', 'collection_request', p_request_id::text,
    jsonb_build_object('deliveries', jsonb_array_length(v_deliveries), 'domain_id', p_domain_id)
  );

  return v_deliveries;
end;
$$;

revoke all on function public.admin_deliver_request(uuid, text, jsonb, jsonb, text) from public, anon;
revoke all on function public.admin_deliver_existing_collection(uuid, uuid) from public, anon;
grant execute on function public.admin_deliver_request(uuid, text, jsonb, jsonb, text) to authenticated;
grant execute on function public.admin_deliver_existing_collection(uuid, uuid) to authenticated;
