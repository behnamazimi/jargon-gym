-- Web push subscriptions (phase 3 of the import redesign): one row per browser a
-- person turned notifications on in. Release 3c-1 is this table and nothing reads
-- it yet; the app code ships after it (the app deploys before migrations run).
--
-- Users can't read the table: an endpoint plus its keys is enough to push to a
-- device. They manage their own rows through the functions below. The sender
-- reads and prunes with the service role.
--
-- Also adds the admin switch collection_request_settings.push_enabled, off by default.
--
-- Rollback (as a new migration, history is append-only): set push_enabled to false
-- to stop sending. Don't drop the table once anyone subscribed. Nothing references
-- push_subscriptions, so deleting its rows is safe (unlike deleting terms).

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique
    check (endpoint like 'https://%' and char_length(endpoint) <= 2048),
  p256dh text not null check (char_length(p256dh) between 20 and 256),
  auth text not null check (char_length(auth) between 8 and 128),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_subscriptions_user_idx
  on public.push_subscriptions (user_id, last_seen_at desc);

alter table public.push_subscriptions enable row level security;

revoke all on table public.push_subscriptions from public, anon, authenticated, service_role;
grant select, delete on public.push_subscriptions to service_role;

alter table public.collection_request_settings
  add column push_enabled boolean not null default false;

grant update (enabled, paused, estimate_days, paused_estimate_days, push_enabled)
  on public.collection_request_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Functions people use on their own subscriptions.
-- ---------------------------------------------------------------------------

-- An endpoint belongs to one browser, so saving it again as someone else (a shared
-- device) moves it to them. Keeps the ten most recent per person.
create function public.my_save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = auth.uid(),
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        last_seen_at = now();

  delete from public.push_subscriptions
  where id in (
    select id from public.push_subscriptions
    where user_id = auth.uid()
    order by last_seen_at desc, created_at desc
    offset 10
  );
end;
$$;

create function public.my_remove_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.push_subscriptions
  where endpoint = p_endpoint and user_id = auth.uid();
end;
$$;

create function public.my_has_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return exists (
    select 1 from public.push_subscriptions
    where endpoint = p_endpoint and user_id = auth.uid()
  );
end;
$$;

revoke all on function public.my_save_push_subscription(text, text, text, text) from public, anon;
revoke all on function public.my_remove_push_subscription(text) from public, anon;
revoke all on function public.my_has_push_subscription(text) from public, anon;
grant execute on function public.my_save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.my_remove_push_subscription(text) to authenticated;
grant execute on function public.my_has_push_subscription(text) to authenticated;
