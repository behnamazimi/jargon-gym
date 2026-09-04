-- ElevenLabs term narration: system-wide toggle, per-user allowlist, and the
-- generated-audio cache. Access requires public.has_narration_access(): the
-- global toggle on AND the calling user present in the allowlist.

-- Singleton row: id is always `true`, so the primary key + check constraint
-- together make a second row physically impossible.
create table public.narration_settings (
  id boolean primary key default true,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint narration_settings_singleton check (id)
);

insert into public.narration_settings (id, enabled) values (true, false);

create trigger narration_settings_set_updated_at
  before update on public.narration_settings
  for each row
  execute function public.set_updated_at();

-- Per-user allowlist, admin-managed. Members are added after they already
-- have an account (this app is invite-only), so this FKs to users, unlike
-- waitlist_requests' raw email column for pre-signup rows.
create table public.narration_allowlist (
  user_id uuid primary key references public.users (id) on delete cascade,
  added_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- One cached narration per term. content_hash is computed over the raw
-- narrated fields (term/definition/example/mental_model/discussion/
-- anti_example/controversy), NOT the rendered template text, so narration
-- only regenerates when those fields actually change — terms.updated_at is
-- bumped by unrelated column edits too and can't be used as this signal.
create table public.term_narrations (
  term_id uuid primary key references public.terms (id) on delete cascade,
  content_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint term_narrations_ready_has_path check (status <> 'ready' or storage_path is not null)
);

create trigger term_narrations_set_updated_at
  before update on public.term_narrations
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.has_narration_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and exists (select 1 from public.narration_settings where id and enabled)
    and exists (select 1 from public.narration_allowlist where user_id = p_user_id);
$$;

revoke all on function public.has_narration_access(uuid) from public;
grant execute on function public.has_narration_access(uuid) to authenticated, service_role;

-- Atomic claim: only the caller whose upsert actually changes the row (i.e.
-- lands a fresh 'pending') gets a row back. Postgres serializes concurrent
-- upserts on the same conflict key via row locking, so this is race-safe
-- without app-level locking. 'pending' rows older than 2 minutes are treated
-- as abandoned (e.g. a crashed request) and are eligible to be reclaimed.
create or replace function public.claim_term_narration(p_term_id uuid, p_content_hash text)
returns setof public.term_narrations
language sql
security definer
set search_path = public
as $$
  insert into public.term_narrations (term_id, content_hash, status)
  values (p_term_id, p_content_hash, 'pending')
  on conflict (term_id) do update
  set
    content_hash = excluded.content_hash,
    status = 'pending',
    storage_path = null
  where
    term_narrations.status = 'failed'
    or (term_narrations.status = 'ready' and term_narrations.content_hash <> excluded.content_hash)
    or (term_narrations.status = 'pending' and term_narrations.updated_at < now() - interval '2 minutes')
  returning *;
$$;

revoke all on function public.claim_term_narration(uuid, text) from public;
grant execute on function public.claim_term_narration(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.narration_settings enable row level security;
alter table public.narration_allowlist enable row level security;
alter table public.term_narrations enable row level security;

create policy "Admins manage narration settings"
  on public.narration_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage narration allowlist"
  on public.narration_allowlist for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Narration-eligible users can read term narrations"
  on public.term_narrations for select
  to authenticated
  using (public.has_narration_access(auth.uid()) or public.is_admin());

grant select, update on public.narration_settings to authenticated;
grant select on public.narration_settings to service_role;

grant select, insert, update, delete on public.narration_allowlist to authenticated;
grant select on public.narration_allowlist to service_role;

grant select on public.term_narrations to authenticated;
grant select, insert, update on public.term_narrations to service_role;
