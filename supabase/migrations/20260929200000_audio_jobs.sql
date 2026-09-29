-- One table for generated audio (term clips and story clips), added next to
-- the existing term_narrations table and stories.narration_* columns. This is
-- the expand step: the app keeps using the old places, and triggers copy every
-- change into audio_jobs so it is complete when the app switches over. A later
-- release moves the app onto audio_jobs and then drops the old places.
--
-- Nothing here costs credits. Old rows are copied as they are (hash, path,
-- status), so no clip is regenerated.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.audio_jobs (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('term', 'story')),
  subject_id uuid not null,
  -- The story's owner. Terms are shared, so it is empty for them.
  user_id uuid,
  content_hash text not null,
  -- 1 is the hash formula in use today (the narrated fields only). Rows of an
  -- older version stay valid until an admin chooses to regenerate them.
  hash_version smallint not null default 1,
  status text not null check (status in ('pending', 'ready', 'failed', 'superseded')),
  attempts integer not null default 0,
  error text,
  storage_path text,
  -- When the current attempt started; a pending job that is too old is stale.
  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint audio_jobs_ready_has_path check (status <> 'ready' or storage_path is not null),
  constraint audio_jobs_story_has_owner check (subject_type <> 'story' or user_id is not null)
);

-- One live job per subject. Superseded jobs are kept so their files can be
-- cleaned up later.
create unique index audio_jobs_live_subject_idx
  on public.audio_jobs (subject_type, subject_id)
  where status <> 'superseded';

create index audio_jobs_user_requested_idx
  on public.audio_jobs (user_id, requested_at)
  where user_id is not null;

alter table public.audio_jobs enable row level security;

create policy "Admins read audio jobs"
  on public.audio_jobs for select
  to authenticated
  using (public.is_admin());

revoke all on table public.audio_jobs from public, anon, authenticated, service_role;
grant select on public.audio_jobs to authenticated;
grant select, insert, update, delete on public.audio_jobs to service_role;

-- ---------------------------------------------------------------------------
-- Copy changes from the old places. A failing copy only logs a warning: the
-- write the app made must never fail because of this table.
-- ---------------------------------------------------------------------------

create function public.mirror_term_narration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audio_jobs
    (subject_type, subject_id, content_hash, hash_version, status, attempts, storage_path,
     requested_at, created_at, updated_at)
  values
    ('term', new.term_id, new.content_hash, 1, new.status,
     case when new.status = 'pending' then 1 else 0 end, new.storage_path,
     new.updated_at, new.created_at, new.updated_at)
  on conflict (subject_type, subject_id) where status <> 'superseded'
  do update set
    content_hash = excluded.content_hash,
    status = excluded.status,
    storage_path = excluded.storage_path,
    requested_at = excluded.requested_at,
    updated_at = excluded.updated_at,
    attempts = public.audio_jobs.attempts + case when excluded.status = 'pending' then 1 else 0 end;
  return new;
exception when others then
  raise warning 'audio_jobs mirror failed for term %: %', new.term_id, sqlerrm;
  return new;
end;
$$;

create function public.mirror_term_narration_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.audio_jobs
  set status = 'superseded', updated_at = now()
  where subject_type = 'term' and subject_id = old.term_id and status <> 'superseded';
  return old;
exception when others then
  raise warning 'audio_jobs mirror failed for deleted term %: %', old.term_id, sqlerrm;
  return old;
end;
$$;

-- Stories have no hash; they never change once written, so a constant stands in.
-- A story marked ready without a path can't be served, so it counts as failed.
create function public.mirror_story_narration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if new.narration_status = 'none' then
    return new;
  end if;

  v_status := case
    when new.narration_status = 'ready' and new.narration_path is null then 'failed'
    else new.narration_status
  end;

  insert into public.audio_jobs
    (subject_type, subject_id, user_id, content_hash, hash_version, status, attempts, storage_path,
     requested_at, updated_at)
  values
    ('story', new.id, new.user_id, 'story-v1', 1, v_status,
     case when v_status = 'pending' then 1 else 0 end,
     case when v_status = 'ready' then new.narration_path end,
     coalesce(new.narration_requested_at, 'epoch'), coalesce(new.narration_requested_at, 'epoch'))
  on conflict (subject_type, subject_id) where status <> 'superseded'
  do update set
    status = excluded.status,
    storage_path = excluded.storage_path,
    requested_at = excluded.requested_at,
    updated_at = excluded.updated_at,
    attempts = public.audio_jobs.attempts + case when excluded.status = 'pending' then 1 else 0 end;
  return new;
exception when others then
  raise warning 'audio_jobs mirror failed for story %: %', new.id, sqlerrm;
  return new;
end;
$$;

create function public.mirror_story_narration_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.audio_jobs
  set status = 'superseded', updated_at = now()
  where subject_type = 'story' and subject_id = old.id and status <> 'superseded';
  return old;
exception when others then
  raise warning 'audio_jobs mirror failed for deleted story %: %', old.id, sqlerrm;
  return old;
end;
$$;

revoke all on function public.mirror_term_narration() from public, anon, authenticated, service_role;
revoke all on function public.mirror_term_narration_delete() from public, anon, authenticated, service_role;
revoke all on function public.mirror_story_narration() from public, anon, authenticated, service_role;
revoke all on function public.mirror_story_narration_delete() from public, anon, authenticated, service_role;

create trigger term_narrations_mirror
  after insert or update on public.term_narrations
  for each row
  execute function public.mirror_term_narration();

create trigger term_narrations_mirror_delete
  after delete on public.term_narrations
  for each row
  execute function public.mirror_term_narration_delete();

create trigger stories_narration_mirror
  after update of narration_status, narration_path, narration_requested_at on public.stories
  for each row
  execute function public.mirror_story_narration();

create trigger stories_narration_mirror_delete
  after delete on public.stories
  for each row
  execute function public.mirror_story_narration_delete();

-- ---------------------------------------------------------------------------
-- Copy what exists today, as it is
-- ---------------------------------------------------------------------------

-- Run after the triggers exist, so a write made while this runs is still
-- mirrored. It only adds missing rows, so running it again changes nothing.
create function public.backfill_audio_jobs()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audio_jobs
    (subject_type, subject_id, content_hash, hash_version, status, storage_path,
     requested_at, created_at, updated_at)
  select 'term', t.term_id, t.content_hash, 1, t.status, t.storage_path,
         t.updated_at, t.created_at, t.updated_at
  from public.term_narrations t
  on conflict (subject_type, subject_id) where status <> 'superseded' do nothing;

  insert into public.audio_jobs
    (subject_type, subject_id, user_id, content_hash, hash_version, status, storage_path,
     requested_at, updated_at)
  select 'story', s.id, s.user_id, 'story-v1', 1,
         case when s.narration_status = 'ready' and s.narration_path is null
              then 'failed' else s.narration_status end,
         case when s.narration_status = 'ready' then s.narration_path end,
         coalesce(s.narration_requested_at, 'epoch'), coalesce(s.narration_requested_at, 'epoch')
  from public.stories s
  where s.narration_status <> 'none'
  on conflict (subject_type, subject_id) where status <> 'superseded' do nothing;
$$;

revoke all on function public.backfill_audio_jobs() from public, anon, authenticated, service_role;

select public.backfill_audio_jobs();

-- ---------------------------------------------------------------------------
-- Worker heartbeat
-- ---------------------------------------------------------------------------

-- The last authenticated call to a background worker, per caller: the cron job
-- or the app itself. It shows whether the cron job still uses the old secret.
create table public.ai_worker_status (
  worker text not null,
  source text not null check (source in ('cron', 'app')),
  last_tick_at timestamptz not null default now(),
  last_secret text not null check (last_secret in ('ai', 'legacy')),
  primary key (worker, source)
);

alter table public.ai_worker_status enable row level security;

create policy "Admins read ai worker status"
  on public.ai_worker_status for select
  to authenticated
  using (public.is_admin());

revoke all on table public.ai_worker_status from public, anon, authenticated, service_role;
grant select on public.ai_worker_status to authenticated;
grant select, insert, update on public.ai_worker_status to service_role;
