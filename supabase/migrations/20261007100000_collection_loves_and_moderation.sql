-- Loves and moderation for shared collections.
--
-- Members can love a shared collection and report one. Admins see the reports,
-- and can stop a collection being shared. A takedown unshares it (the existing
-- unshare trigger removes it from other libraries) and sets a sharing lock that
-- only an admin can lift. Nothing happens automatically.
--
-- Rollback (as a new migration, history is append-only): drop the functions
-- my_set_collection_love, my_report_collection and the admin_*_collection*,
-- admin_lift_share_lock functions; drop the tables collection_reports and
-- collection_loves; drop trigger domains_guard_protected; drop the three new
-- columns from public.domains; recreate the "Users add shared domains to
-- collection" policy from 20260725140000_user_owned_domains.sql; and re-run
-- admin_list_collections from 20261006100000_domain_kind.sql (drop it first).

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.domains
  add column love_count integer not null default 0,
  add column share_blocked_at timestamptz,
  add column share_block_reason text
    constraint domains_share_block_reason_check
    check (share_block_reason in ('rules', 'personal_info', 'not_appropriate')),
  add constraint domains_share_block_pair_check
    check ((share_blocked_at is null) = (share_block_reason is null));

-- ---------------------------------------------------------------------------
-- Guard: owners hold a table-wide UPDATE grant and an owner UPDATE policy, so a
-- policy can't protect single columns. The love counter trigger is the one
-- non-admin writer of love_count; it runs one level deeper than a direct update.
-- ---------------------------------------------------------------------------

create function public._domains_guard_protected()
returns trigger
language plpgsql
set search_path = public
as $$
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
$$;

create trigger domains_guard_protected
  before update on public.domains
  for each row
  execute function public._domains_guard_protected();

revoke all on function public._domains_guard_protected()
  from public, anon, authenticated, service_role;

-- Defence in depth: a blocked collection can't be added either.
drop policy "Users add shared domains to collection" on public.user_collection_domains;

create policy "Users add shared domains to collection"
  on public.user_collection_domains for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.domains d
      where d.id = domain_id
        and d.visibility = 'shared'
        and d.owner_id <> auth.uid()
        and d.share_blocked_at is null
    )
  );

-- ---------------------------------------------------------------------------
-- Loves
-- ---------------------------------------------------------------------------

create table public.collection_loves (
  user_id uuid not null references public.users (id) on delete cascade,
  domain_id uuid not null references public.domains (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, domain_id)
);

create index collection_loves_domain_id_idx on public.collection_loves (domain_id);

alter table public.collection_loves enable row level security;

create policy "Read own loves"
  on public.collection_loves for select
  to authenticated
  using (user_id = auth.uid());

revoke all on table public.collection_loves from public, anon, authenticated, service_role;
grant select on public.collection_loves to authenticated;

create function public._collection_loves_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.domains set love_count = love_count + 1 where id = new.domain_id;
    return new;
  end if;
  update public.domains set love_count = greatest(love_count - 1, 0) where id = old.domain_id;
  return old;
end;
$$;

create trigger collection_loves_count
  after insert or delete on public.collection_loves
  for each row
  execute function public._collection_loves_count();

revoke all on function public._collection_loves_count()
  from public, anon, authenticated, service_role;

create function public.my_set_collection_love(p_domain_id uuid, p_loved boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_domain public.domains;
  v_count integer;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_domain from public.domains where id = p_domain_id for update;
  if not found or v_domain.visibility <> 'shared' or v_domain.share_blocked_at is not null then
    raise exception 'collection_not_shared';
  end if;
  if v_domain.owner_id = v_user then
    raise exception 'own_collection';
  end if;

  if coalesce(p_loved, false) then
    insert into public.collection_loves (user_id, domain_id)
    values (v_user, p_domain_id)
    on conflict do nothing;
  else
    delete from public.collection_loves where user_id = v_user and domain_id = p_domain_id;
  end if;

  select love_count into v_count from public.domains where id = p_domain_id;
  return v_count;
end;
$$;

revoke all on function public.my_set_collection_love(uuid, boolean) from public, anon;
grant execute on function public.my_set_collection_love(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

create table public.collection_reports (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains (id) on delete cascade,
  reporter_id uuid not null references public.users (id) on delete cascade,
  reason text not null check (reason in ('rules', 'personal_info', 'not_appropriate')),
  note text check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users (id) on delete set null
);

create unique index collection_reports_one_open_idx
  on public.collection_reports (domain_id, reporter_id)
  where status = 'open';

create index collection_reports_status_domain_idx
  on public.collection_reports (status, domain_id);

create index collection_reports_reporter_created_idx
  on public.collection_reports (reporter_id, created_at desc);

alter table public.collection_reports enable row level security;

create policy "Read own reports, admins read all"
  on public.collection_reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

revoke all on table public.collection_reports from public, anon, authenticated, service_role;
grant select on public.collection_reports to authenticated;

create function public.my_report_collection(p_domain_id uuid, p_reason text, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_domain public.domains;
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

  select * into v_domain from public.domains where id = p_domain_id;
  if not found or v_domain.visibility <> 'shared' or v_domain.share_blocked_at is not null then
    raise exception 'collection_not_shared';
  end if;
  if v_domain.is_builtin then
    raise exception 'builtin_collection';
  end if;
  if v_domain.owner_id = v_user then
    raise exception 'own_collection';
  end if;

  select id into v_existing
  from public.collection_reports
  where domain_id = p_domain_id and reporter_id = v_user and status = 'open';
  if found then
    return v_existing;
  end if;

  select count(*) into v_used
  from public.collection_reports
  where reporter_id = v_user and created_at > now() - interval '24 hours';
  if v_used >= 10 then
    raise exception 'report_quota_reached';
  end if;

  insert into public.collection_reports (domain_id, reporter_id, reason, note)
  values (p_domain_id, v_user, p_reason, v_note)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.my_report_collection(uuid, text, text) from public, anon;
grant execute on function public.my_report_collection(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------

create function public.admin_stop_sharing_collection(p_domain_id uuid, p_reason text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain public.domains;
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

  select * into v_domain from public.domains where id = p_domain_id for update;
  if not found then
    raise exception 'That collection no longer exists.' using errcode = 'AD001';
  end if;
  if v_domain.is_builtin then
    raise exception 'Built-in collections can''t be unshared.' using errcode = 'AD001';
  end if;
  if v_domain.owner_id = auth.uid() then
    raise exception 'You can''t stop sharing your own collection.' using errcode = 'AD001';
  end if;
  if v_domain.visibility <> 'shared' then
    raise exception 'This collection isn''t shared.' using errcode = 'AD001';
  end if;

  select count(*) into v_removed
  from public.user_collection_domains
  where domain_id = p_domain_id and user_id <> v_domain.owner_id;

  update public.domains
  set share_blocked_at = now(),
      share_block_reason = p_reason,
      visibility = 'private'
  where id = p_domain_id;

  update public.collection_reports
  set status = 'actioned', resolved_at = now(), resolved_by = auth.uid()
  where domain_id = p_domain_id and status = 'open';
  get diagnostics v_closed = row_count;

  perform public._admin_audit_insert(
    'stop_sharing_collection', 'collection', p_domain_id::text,
    jsonb_build_object('reason', p_reason, 'note', v_note, 'reports_closed', v_closed, 'removed_from', v_removed)
  );
end;
$$;

create function public.admin_lift_share_lock(p_domain_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain public.domains;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can lift a sharing lock' using errcode = 'AD001';
  end if;
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'Give a note of up to 200 characters.' using errcode = 'AD001';
  end if;

  select * into v_domain from public.domains where id = p_domain_id for update;
  if not found then
    raise exception 'That collection no longer exists.' using errcode = 'AD001';
  end if;
  if v_domain.share_blocked_at is null then
    return;
  end if;

  update public.domains
  set share_blocked_at = null, share_block_reason = null
  where id = p_domain_id;

  perform public._admin_audit_insert(
    'lift_share_lock', 'collection', p_domain_id::text,
    jsonb_build_object('reason', v_domain.share_block_reason, 'note', v_note)
  );
end;
$$;

create function public.admin_dismiss_collection_reports(p_domain_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can dismiss reports' using errcode = 'AD001';
  end if;

  perform 1 from public.domains where id = p_domain_id for update;
  if not found then
    raise exception 'That collection no longer exists.' using errcode = 'AD001';
  end if;

  update public.collection_reports
  set status = 'dismissed', resolved_at = now(), resolved_by = auth.uid()
  where domain_id = p_domain_id and status = 'open';
  get diagnostics v_count = row_count;

  if v_count > 0 then
    perform public._admin_audit_insert(
      'dismiss_collection_reports', 'collection', p_domain_id::text,
      jsonb_build_object('count', v_count)
    );
  end if;
  return v_count;
end;
$$;

create function public.admin_list_collection_reports(p_domain_id uuid)
returns table (
  id uuid,
  reason text,
  note text,
  reporter_email text,
  created_at timestamptz,
  status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can list reports' using errcode = 'AD001';
  end if;

  return query
  select r.id, r.reason, r.note, u.email, r.created_at, r.status
  from public.collection_reports r
  left join public.users u on u.id = r.reporter_id
  where r.domain_id = p_domain_id
  order by (r.status = 'open') desc, r.created_at desc;
end;
$$;

revoke all on function public.admin_stop_sharing_collection(uuid, text, text) from public, anon;
revoke all on function public.admin_lift_share_lock(uuid, text) from public, anon;
revoke all on function public.admin_dismiss_collection_reports(uuid) from public, anon;
revoke all on function public.admin_list_collection_reports(uuid) from public, anon;
grant execute on function public.admin_stop_sharing_collection(uuid, text, text) to authenticated;
grant execute on function public.admin_lift_share_lock(uuid, text) to authenticated;
grant execute on function public.admin_dismiss_collection_reports(uuid) to authenticated;
grant execute on function public.admin_list_collection_reports(uuid) to authenticated;

-- The admin list shows loves, open reports and the sharing lock. It already
-- reads every collection, so blocked (now private) ones are included.
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
  love_count integer,
  open_report_count bigint,
  share_blocked_at timestamptz,
  share_block_reason text,
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
         d.love_count,
         (select count(*) from public.collection_reports r where r.domain_id = d.id and r.status = 'open'),
         d.share_blocked_at, d.share_block_reason,
         d.created_at, d.updated_at
  from public.domains d
  left join public.users u on u.id = d.owner_id
  order by d.name;
end;
$$;

revoke all on function public.admin_list_collections() from public, anon;
grant execute on function public.admin_list_collections() to authenticated;
