-- Admin per-user page: suspend, remove an API key, delete an account. Each
-- write is one function, so the checks, the change and its audit row happen in
-- one transaction (all or nothing).
--
-- Also fixes two things that made deleting any account fail:
--   * domains.owner_id is NOT NULL but its foreign key was ON DELETE SET NULL.
--   * referral_codes_used_pair rejected the row a deleted user leaves behind
--     (used_by cleared by the foreign key, used_at still set).
--
-- Deploy order: the app deploys before this runs, and the app code shipped with
-- it reads users.suspended_at. Until this migration is applied, widget requests,
-- Telegram messages and the admin people pages fail. Fine while nobody but the
-- owner uses the app; otherwise ship this migration on its own first.
--
-- Rollback (as a new migration, history is append-only): drop the functions
-- created here, restore list_due_telegram_users and complete_telegram_link from
-- 20260725200000_telegram.sql, drop the index and the users.suspended_at
-- column. The two constraint fixes are relaxations and can stay.

-- ---------------------------------------------------------------------------
-- Suspension flag. Users have no update grant on public.users, so nobody can
-- clear their own.
-- ---------------------------------------------------------------------------

alter table public.users add column suspended_at timestamptz;

-- ---------------------------------------------------------------------------
-- Make a delete possible.
-- ---------------------------------------------------------------------------

alter table public.domains
  drop constraint domains_owner_id_fkey,
  add constraint domains_owner_id_fkey
    foreign key (owner_id) references public.users (id) on delete cascade;

alter table public.referral_codes
  drop constraint referral_codes_used_pair,
  add constraint referral_codes_used_pair
    check ((used_by is null and used_at is null) or used_at is not null);

-- The person page lists what admins did to one person.
create index admin_audit_log_target_idx
  on public.admin_audit_log (target_type, target_id, created_at desc);

-- The "who else uses these collections" check looks up by term or domain, which
-- no existing index leads with. The cascade deletes benefit too.
create index if not exists review_events_term_id_idx on public.review_events (term_id);
create index if not exists review_state_term_id_idx on public.review_state (term_id);
create index if not exists user_collection_domains_domain_id_idx
  on public.user_collection_domains (domain_id);
create index if not exists user_active_domains_domain_id_idx
  on public.user_active_domains (domain_id);
create index if not exists story_collection_prefs_domain_id_idx
  on public.story_collection_prefs (domain_id);

-- ---------------------------------------------------------------------------
-- Helpers. Only the functions below call them.
-- ---------------------------------------------------------------------------

-- Errors with this code are written for the admin to read; the app shows them.
-- Anything else is shown as a generic failure.

-- Checks the caller may act on this person and locks their row for the rest of
-- the transaction, so two admins can't act on the same person at once.
create function public._admin_manage_target(p_user_id uuid)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.users;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can manage accounts';
  end if;

  select * into v_target from public.users where id = p_user_id for update;
  if not found then
    raise exception 'That account no longer exists.' using errcode = 'AD001';
  end if;
  if v_target.id = auth.uid() then
    raise exception 'You can''t do this to your own account.' using errcode = 'AD001';
  end if;
  if v_target.role <> 'member' then
    raise exception 'Admin accounts can''t be changed here.' using errcode = 'AD001';
  end if;

  return v_target;
end;
$$;

create function public._admin_clean_reason(p_reason text)
returns text
language plpgsql
immutable
as $$
declare
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if char_length(v_reason) < 1 or char_length(v_reason) > 200 then
    raise exception 'Give a reason of up to 200 characters.' using errcode = 'AD001';
  end if;
  return v_reason;
end;
$$;

-- How many other people have something that hangs off this person's
-- collections (added it, are studying it, or have review history on its terms).
-- Deleting the collections would delete that for them.
create function public._admin_people_using_collections(p_owner uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct other.user_id)::integer
  from (
    select ucd.user_id from public.user_collection_domains ucd
      join public.domains d on d.id = ucd.domain_id where d.owner_id = p_owner
    union all
    select uad.user_id from public.user_active_domains uad
      join public.domains d on d.id = uad.domain_id where d.owner_id = p_owner
    union all
    select scp.user_id from public.story_collection_prefs scp
      join public.domains d on d.id = scp.domain_id where d.owner_id = p_owner
    union all
    select rs.user_id from public.review_state rs
      join public.terms t on t.id = rs.term_id
      join public.domains d on d.id = t.domain_id where d.owner_id = p_owner
    union all
    select re.user_id from public.review_events re
      join public.terms t on t.id = re.term_id
      join public.domains d on d.id = t.domain_id where d.owner_id = p_owner
  ) other
  where other.user_id <> p_owner;
$$;

revoke all on function public._admin_manage_target(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public._admin_clean_reason(text)
  from public, anon, authenticated, service_role;
revoke all on function public._admin_people_using_collections(uuid)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- What the person page shows that an admin's own session can't read.
-- ---------------------------------------------------------------------------

create function public.admin_person_detail(p_user_id uuid)
returns table (
  suspended_at timestamptz,
  referral_verified boolean,
  ban_mismatch boolean,
  current_streak integer,
  longest_streak integer,
  last_active_date date,
  key_provider text,
  key_last4 text,
  owned_collections integer,
  people_using_collections integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
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
    case when s.api_key_encrypted is not null then s.provider end,
    case when s.api_key_encrypted is not null then s.api_key_last4 end,
    (select count(*)::integer from public.domains d where d.owner_id = u.id),
    public._admin_people_using_collections(u.id)
  from public.users u
  join auth.users au on au.id = u.id
  left join public.user_settings s on s.user_id = u.id
  where u.id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Suspend / reactivate. Suspending bans the sign-in and ends every session
-- (the ban alone does not stop a token that is still valid). Doing either again
-- when nothing would change does nothing and leaves no audit row.
-- ---------------------------------------------------------------------------

create function public.admin_set_user_suspended(p_user_id uuid, p_suspended boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.users := public._admin_manage_target(p_user_id);
  v_reason text := public._admin_clean_reason(p_reason);
  v_banned boolean;
begin
  select coalesce(au.banned_until > now(), false) into v_banned
  from auth.users au where au.id = p_user_id;

  if p_suspended then
    if v_target.suspended_at is not null and v_banned then
      return;
    end if;
    update public.users set suspended_at = coalesce(suspended_at, now()) where id = p_user_id;
    update auth.users set banned_until = now() + interval '100 years' where id = p_user_id;
    delete from auth.sessions where user_id = p_user_id;
    perform public._admin_audit_insert(
      'suspend_user', 'user', p_user_id::text, jsonb_build_object('reason', v_reason)
    );
  else
    if v_target.suspended_at is null and not v_banned then
      return;
    end if;
    update public.users set suspended_at = null where id = p_user_id;
    update auth.users set banned_until = null where id = p_user_id;
    perform public._admin_audit_insert(
      'reactivate_user', 'user', p_user_id::text, jsonb_build_object('reason', v_reason)
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Remove a saved API key. The three columns go together (a check requires it).
-- ---------------------------------------------------------------------------

create function public.admin_remove_user_api_key(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.users := public._admin_manage_target(p_user_id);
  v_reason text := public._admin_clean_reason(p_reason);
  v_provider text;
begin
  select provider into v_provider
  from public.user_settings
  where user_id = p_user_id and api_key_encrypted is not null
  for update;
  if not found then
    raise exception 'No API key is saved for this account.' using errcode = 'AD001';
  end if;

  update public.user_settings
  set provider = null, api_key_encrypted = null, api_key_last4 = null, updated_at = now()
  where user_id = p_user_id;

  perform public._admin_audit_insert(
    'remove_user_api_key', 'user', p_user_id::text,
    jsonb_build_object('reason', v_reason, 'provider', v_provider)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Delete an account and everything that cascades from it. Refused while other
-- people use the person's collections. The collections and their terms are
-- locked first, so nobody can start using them between the check and the
-- delete. The audit row holds the id and the reason, never the email.
-- ---------------------------------------------------------------------------

create function public.admin_delete_user(p_user_id uuid, p_confirm_email text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.users := public._admin_manage_target(p_user_id);
  v_reason text := public._admin_clean_reason(p_reason);
  v_using integer;
begin
  if lower(trim(coalesce(p_confirm_email, ''))) <> lower(v_target.email) then
    raise exception 'The email you typed doesn''t match.' using errcode = 'AD001';
  end if;

  perform 1 from public.domains where owner_id = p_user_id for update;
  perform 1 from public.terms t
    join public.domains d on d.id = t.domain_id
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
$$;

revoke all on function public.admin_person_detail(uuid) from public, anon;
revoke all on function public.admin_set_user_suspended(uuid, boolean, text) from public, anon;
revoke all on function public.admin_remove_user_api_key(uuid, text) from public, anon;
revoke all on function public.admin_delete_user(uuid, text, text) from public, anon;
grant execute on function public.admin_person_detail(uuid) to authenticated;
grant execute on function public.admin_set_user_suspended(uuid, boolean, text) to authenticated;
grant execute on function public.admin_remove_user_api_key(uuid, text) to authenticated;
grant execute on function public.admin_delete_user(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Telegram: a suspended person gets no scheduled sends and can't link a chat.
-- ---------------------------------------------------------------------------

create or replace function public.list_due_telegram_users()
returns table (user_id uuid, chat_id bigint)
language sql
stable
security definer
set search_path = public
as $$
  select tl.user_id, tl.chat_id
  from public.telegram_links tl
  join public.users u on u.id = tl.user_id
  where tl.chat_id is not null
    and u.suspended_at is null
    and tl.cadence <> 'off'::public.telegram_cadence
    and now() >= coalesce(tl.last_sent_at, '1970-01-01'::timestamptz) + (
      case tl.cadence
        when '6h'::public.telegram_cadence then interval '6 hours'
        when '12h'::public.telegram_cadence then interval '12 hours'
        when '24h'::public.telegram_cadence then interval '24 hours'
        else interval '100 years'
      end
    );
$$;

create or replace function public.complete_telegram_link(p_token_hash text, p_chat_id bigint)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_existing_user uuid;
begin
  select tl.user_id
  into v_user_id
  from public.telegram_links tl
  join public.users u on u.id = tl.user_id
  where tl.link_token_hash = p_token_hash
    and tl.link_token_expires_at > now()
    and u.suspended_at is null;

  if v_user_id is null then
    raise exception 'Invalid or expired link token';
  end if;

  select tl.user_id
  into v_existing_user
  from public.telegram_links tl
  where tl.chat_id = p_chat_id;

  if v_existing_user is not null and v_existing_user <> v_user_id then
    raise exception 'Telegram chat already linked to another account';
  end if;

  update public.telegram_links
  set
    chat_id = p_chat_id,
    link_token_hash = null,
    link_token_expires_at = null,
    linked_at = now(),
    updated_at = now()
  where user_id = v_user_id;

  return v_user_id;
end;
$$;
