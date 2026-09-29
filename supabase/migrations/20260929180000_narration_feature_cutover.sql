-- Moves narration's on/off switch and allowlist onto the AI feature tables
-- without changing what the current app does. This is the expand step: the
-- old narration tables stay, and triggers copy anything the current app writes
-- to them into ai_feature_settings / ai_feature_allowlist, so the two never
-- disagree while the app is switched over. A later release drops the old tables.
--
-- Narration is never billed: nothing here touches the credit ledger.

-- ---------------------------------------------------------------------------
-- Copy today's values (they may have changed since ai_feature_settings was seeded)
-- ---------------------------------------------------------------------------

update public.ai_feature_settings
set enabled = (select enabled from public.narration_settings where id)
where feature in ('narration_term', 'narration_story');

delete from public.ai_feature_allowlist
where feature in ('narration_term', 'narration_story')
  and user_id not in (select user_id from public.narration_allowlist);

insert into public.ai_feature_allowlist (feature, user_id)
select f.feature, a.user_id
from public.narration_allowlist a
cross join (values ('narration_term'), ('narration_story')) as f (feature)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Old tables -> new tables, one way only
-- ---------------------------------------------------------------------------

create function public.mirror_narration_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_feature_settings
  set enabled = new.enabled
  where feature in ('narration_term', 'narration_story');
  return new;
end;
$$;

create trigger narration_settings_mirror
  after update of enabled on public.narration_settings
  for each row
  execute function public.mirror_narration_settings();

create function public.mirror_narration_allowlist_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ai_feature_allowlist (feature, user_id)
  select f.feature, new.user_id
  from (values ('narration_term'), ('narration_story')) as f (feature)
  on conflict do nothing;
  return new;
end;
$$;

create trigger narration_allowlist_mirror_insert
  after insert on public.narration_allowlist
  for each row
  execute function public.mirror_narration_allowlist_insert();

create function public.mirror_narration_allowlist_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.ai_feature_allowlist
  where feature in ('narration_term', 'narration_story') and user_id = old.user_id;
  return old;
end;
$$;

create trigger narration_allowlist_mirror_delete
  after delete on public.narration_allowlist
  for each row
  execute function public.mirror_narration_allowlist_delete();

revoke all on function public.mirror_narration_settings() from public, anon, authenticated;
revoke all on function public.mirror_narration_allowlist_insert() from public, anon, authenticated;
revoke all on function public.mirror_narration_allowlist_delete() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Access check
-- ---------------------------------------------------------------------------

-- Same rule narration always had: the feature is on and the person is allowed.
-- Admins get no automatic access outside `admin` mode (the old function gave
-- them none either), and this looks at users.role because callers pass a user
-- id through the service role, where auth.uid() is empty. lib/ai/feature-settings.ts
-- applies a different rule (admins pass every mode) to Quiz and Stories.
create function public.has_feature_access(p_user_id uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and exists (
      select 1
      from public.ai_feature_settings f
      where f.feature = p_feature
        and f.enabled
        and (
          f.access_mode = 'everyone'
          or (
            f.access_mode = 'allowlist'
            and exists (
              select 1 from public.ai_feature_allowlist a
              where a.feature = f.feature and a.user_id = p_user_id
            )
          )
          or (
            f.access_mode = 'admin'
            and exists (
              select 1 from public.users u where u.id = p_user_id and u.role = 'admin'
            )
          )
        )
    );
$$;

-- Only the server role asks this directly. The narration RLS policy reaches it
-- through has_narration_access below, which runs as its owner.
revoke all on function public.has_feature_access(uuid, text) from public, anon, authenticated;
grant execute on function public.has_feature_access(uuid, text) to service_role;

-- Same name, arguments and grants, so the deployed app and the term_narrations
-- policy keep working. It now answers from the feature tables.
create or replace function public.has_narration_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_feature_access(p_user_id, 'narration_term');
$$;

-- ---------------------------------------------------------------------------
-- Usage log (reporting only)
-- ---------------------------------------------------------------------------

-- One row per provider call made for a person. It is never charged, never
-- touches the credit ledger and has no cost column.
create table public.ai_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  feature text not null references public.ai_feature_settings (feature),
  units integer not null check (units >= 0),
  outcome text not null check (outcome in ('ok', 'failed')),
  created_at timestamptz not null default now()
);

create index ai_usage_events_user_feature_idx
  on public.ai_usage_events (user_id, feature, created_at desc);

alter table public.ai_usage_events enable row level security;

create policy "Admins read ai usage events"
  on public.ai_usage_events for select
  to authenticated
  using (public.is_admin());

revoke all on table public.ai_usage_events from public, anon, authenticated, service_role;
grant select on public.ai_usage_events to authenticated, service_role;
grant insert on public.ai_usage_events to service_role;
