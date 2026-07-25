-- Telegram bot integration: account linking, review scheduling, and RPCs for Edge Functions.

create type public.telegram_cadence as enum ('off', '6h', '12h', '24h');

create table public.telegram_links (
  user_id uuid primary key references public.users (id) on delete cascade,
  chat_id bigint unique,
  cadence public.telegram_cadence not null default 'off',
  link_token_hash text unique,
  link_token_expires_at timestamptz,
  last_sent_at timestamptz,
  all_caught_up_at timestamptz,
  linked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index telegram_links_chat_id_idx on public.telegram_links (chat_id)
  where chat_id is not null;

create index telegram_links_pending_token_idx on public.telegram_links (link_token_hash)
  where link_token_hash is not null;

alter table public.telegram_links enable row level security;

create policy "Users read own telegram link"
  on public.telegram_links for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users delete own telegram link"
  on public.telegram_links for delete
  to authenticated
  using (user_id = auth.uid());

grant select, delete on public.telegram_links to authenticated;
grant select, insert, update, delete on public.telegram_links to service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.telegram_review_domain_ids(p_user_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select uad.domain_id
  from public.user_active_domains uad
  where uad.user_id = p_user_id
    and (
      exists (
        select 1
        from public.domains d
        where d.id = uad.domain_id
          and d.owner_id = p_user_id
      )
      or exists (
        select 1
        from public.user_collection_domains ucd
        where ucd.user_id = p_user_id
          and ucd.domain_id = uad.domain_id
      )
    );
$$;

revoke all on function public.telegram_review_domain_ids(uuid) from public;
grant execute on function public.telegram_review_domain_ids(uuid) to service_role;

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
  where tl.link_token_hash = p_token_hash
    and tl.link_token_expires_at > now();

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

revoke all on function public.complete_telegram_link(text, bigint) from public;
grant execute on function public.complete_telegram_link(text, bigint) to service_role;

create or replace function public.pick_random_unknown_term(p_user_id uuid)
returns table (
  id uuid,
  term text,
  category text,
  definition text,
  example text,
  discussion text,
  domain_id uuid,
  domain_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.term,
    t.category,
    t.definition,
    t.example,
    t.discussion,
    t.domain_id,
    d.name as domain_name
  from public.terms t
  join public.domains d on d.id = t.domain_id
  where t.domain_id in (select public.telegram_review_domain_ids(p_user_id))
    and not exists (
      select 1
      from public.user_progress up
      where up.user_id = p_user_id
        and up.term_id = t.id
        and up.is_known = true
    )
  order by random()
  limit 1;
$$;

revoke all on function public.pick_random_unknown_term(uuid) from public;
grant execute on function public.pick_random_unknown_term(uuid) to service_role;

create or replace function public.count_unknown_terms(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.terms t
  where t.domain_id in (select public.telegram_review_domain_ids(p_user_id))
    and not exists (
      select 1
      from public.user_progress up
      where up.user_id = p_user_id
        and up.term_id = t.id
        and up.is_known = true
    );
$$;

revoke all on function public.count_unknown_terms(uuid) from public;
grant execute on function public.count_unknown_terms(uuid) to service_role;

create or replace function public.mark_term_known(p_user_id uuid, p_term_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.terms t
    where t.id = p_term_id
      and t.domain_id in (select public.telegram_review_domain_ids(p_user_id))
  ) then
    raise exception 'Term not in review pool';
  end if;

  insert into public.user_progress (user_id, term_id, is_known)
  values (p_user_id, p_term_id, true)
  on conflict (user_id, term_id) do update
  set is_known = true;

  update public.telegram_links
  set all_caught_up_at = null, updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.mark_term_known(uuid, uuid) from public;
grant execute on function public.mark_term_known(uuid, uuid) to service_role;

create or replace function public.list_due_telegram_users()
returns table (user_id uuid, chat_id bigint)
language sql
stable
security definer
set search_path = public
as $$
  select tl.user_id, tl.chat_id
  from public.telegram_links tl
  where tl.chat_id is not null
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

revoke all on function public.list_due_telegram_users() from public;
grant execute on function public.list_due_telegram_users() to service_role;

create or replace function public.update_telegram_cadence(p_cadence public.telegram_cadence)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.telegram_links
  set cadence = p_cadence, updated_at = now()
  where user_id = auth.uid();

  if not found then
    insert into public.telegram_links (user_id, cadence)
    values (auth.uid(), p_cadence);
  end if;
end;
$$;

revoke all on function public.update_telegram_cadence(public.telegram_cadence) from public;
grant execute on function public.update_telegram_cadence(public.telegram_cadence) to authenticated;

create or replace function public.record_telegram_send(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.telegram_links
  set last_sent_at = now(), updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.record_telegram_send(uuid) from public;
grant execute on function public.record_telegram_send(uuid) to service_role;

create or replace function public.set_telegram_all_caught_up(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.telegram_links
  set all_caught_up_at = now(), updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.set_telegram_all_caught_up(uuid) from public;
grant execute on function public.set_telegram_all_caught_up(uuid) to service_role;

-- pg_net for scheduled Edge Function invocation (configure cron via Dashboard or supabase/telegram-cron-setup.sql).
create extension if not exists pg_net with schema extensions;
