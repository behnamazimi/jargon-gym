-- Claim for audio_jobs: supersede the live job and insert a new one, instead of
-- rewriting it in place. The app does not call this yet. Existing version-1
-- paths are left as they are. A new job is always hash version 2 or later, so
-- the mirrors below (which still copy the old tables, and only onto a
-- version-1 live row) cannot overwrite it.

-- ---------------------------------------------------------------------------
-- One object key per file. Version-1 paths stay. Two rows cannot share a key.
-- ---------------------------------------------------------------------------

-- Only new keys are unique. Version-1 paths are reused by the current app
-- (<termId>.mp3, stories/...), and a superseded row keeps that path for the
-- sweep. A global unique index would make the mirror drop the new ready file.
drop index if exists public.audio_jobs_storage_path_idx;
create unique index audio_jobs_storage_path_idx
  on public.audio_jobs (storage_path)
  where storage_path is not null
    and storage_path like 'audio/%';

-- Superseded jobs keep their file path. This index is the sweep's scan.
create index if not exists audio_jobs_orphans_idx
  on public.audio_jobs (updated_at)
  where status = 'superseded' and storage_path is not null;

-- New files only. Includes the job id so a late upload cannot replace a newer
-- file that hashed the same. Version-1 rows do not use this.
-- integer, not smallint: a bare numeric literal is an integer, and that is
-- also what the app sends. The column itself stays smallint.
drop function if exists public.audio_job_object_path(uuid, text, uuid, smallint, text);

create or replace function public.audio_job_object_path(
  p_job_id uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_hash_version integer,
  p_content_hash text
) returns text
language sql
immutable
set search_path = public
as $$
  select 'audio/' || p_subject_type || '/' || p_subject_id::text || '/'
    || p_hash_version::text || '/' || p_content_hash || '/' || p_job_id::text || '.mp3';
$$;

revoke all on function public.audio_job_object_path(uuid, text, uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.audio_job_object_path(uuid, text, uuid, integer, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Claim
-- ---------------------------------------------------------------------------

-- Returns the new pending row when this caller won, otherwise nothing.
-- Nothing means: do not generate; read the live row.
-- Waiting on the live row (not skip locked): there is one live row per subject,
-- and the caller that loses must see the winner's row. The unique index covers
-- the case where no row exists yet.
drop function if exists public.claim_audio_job(text, uuid, uuid, text, smallint, boolean);

create or replace function public.claim_audio_job(
  p_subject_type text,
  p_subject_id uuid,
  p_user_id uuid,
  p_content_hash text,
  p_hash_version integer,
  p_regenerate boolean default false
) returns setof public.audio_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_live public.audio_jobs;
  v_new public.audio_jobs;
  v_regenerate boolean := coalesce(p_regenerate, false);
begin
  if p_subject_type not in ('term', 'story') then
    raise exception 'invalid audio subject type';
  end if;
  if p_content_hash is null or length(btrim(p_content_hash)) = 0 then
    raise exception 'content hash is required';
  end if;
  if p_hash_version is null or p_hash_version < 1 then
    raise exception 'hash version must be at least 1';
  end if;
  if p_subject_type = 'story' and p_user_id is null then
    raise exception 'a story job needs an owner';
  end if;
  if p_subject_type = 'term' and p_user_id is not null then
    raise exception 'a term job has no owner';
  end if;

  -- Lock whatever is live, then lock it again. A row that was superseded while
  -- we waited no longer matches, and the second lock is the winner's new row.
  perform 1
  from public.audio_jobs
  where subject_type = p_subject_type
    and subject_id = p_subject_id
    and status <> 'superseded'
  for update;

  select * into v_live
  from public.audio_jobs
  where subject_type = p_subject_type
    and subject_id = p_subject_id
    and status <> 'superseded'
  for update;

  if not found then
    if p_hash_version < 2 then
      raise exception 'a new audio job uses hash version 2 or later';
    end if;
    begin
      insert into public.audio_jobs (
        subject_type, subject_id, user_id, content_hash, hash_version,
        status, attempts, storage_path, requested_at
      ) values (
        p_subject_type, p_subject_id,
        case when p_subject_type = 'story' then p_user_id end,
        p_content_hash, p_hash_version,
        'pending', 1, null, now()
      )
      returning * into v_new;
      return next v_new;
      return;
    exception when unique_violation then
      return;
    end;
  end if;

  -- Version 1 is accepted only here: confirming a ready clip, not making one.
  if v_live.status = 'ready'
     and v_live.content_hash = p_content_hash
     and v_live.hash_version = p_hash_version
     and not v_regenerate then
    return;
  end if;

  if v_live.status = 'pending'
     and v_live.requested_at >= now() - interval '2 minutes' then
    return;
  end if;

  if p_hash_version < 2 then
    raise exception 'a new audio job uses hash version 2 or later';
  end if;

  update public.audio_jobs
  set status = 'superseded', updated_at = now()
  where id = v_live.id
    and status <> 'superseded';

  if not found then
    return;
  end if;

  begin
    insert into public.audio_jobs (
      subject_type, subject_id, user_id, content_hash, hash_version,
      status, attempts, storage_path, error, requested_at
    ) values (
      p_subject_type, p_subject_id,
      case when p_subject_type = 'story' then p_user_id end,
      p_content_hash, p_hash_version,
      'pending', v_live.attempts + 1, null, null, now()
    )
    returning * into v_new;
    return next v_new;
  exception when unique_violation then
    return;
  end;
end;
$$;

revoke all on function public.claim_audio_job(text, uuid, uuid, text, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.claim_audio_job(text, uuid, uuid, text, integer, boolean)
  to service_role;

-- ---------------------------------------------------------------------------
-- Mirrors keep copying the old tables, but only onto a version-1 live row.
-- A later version belongs to claim_audio_job. The old write still succeeds.
-- ---------------------------------------------------------------------------

create or replace function public.mirror_term_narration()
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
    attempts = public.audio_jobs.attempts + case when excluded.status = 'pending' then 1 else 0 end
  where public.audio_jobs.hash_version = 1;
  return new;
exception when others then
  raise warning 'audio_jobs mirror failed for term %: %', new.term_id, sqlerrm;
  return new;
end;
$$;

create or replace function public.mirror_story_narration()
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
     case when v_status in ('ready', 'failed') then new.narration_path end,
     coalesce(new.narration_requested_at, 'epoch'), coalesce(new.narration_requested_at, 'epoch'))
  on conflict (subject_type, subject_id) where status <> 'superseded'
  do update set
    status = excluded.status,
    storage_path = excluded.storage_path,
    requested_at = excluded.requested_at,
    updated_at = excluded.updated_at,
    attempts = public.audio_jobs.attempts + case when excluded.status = 'pending' then 1 else 0 end
  where public.audio_jobs.hash_version = 1;
  return new;
exception when others then
  raise warning 'audio_jobs mirror failed for story %: %', new.id, sqlerrm;
  return new;
end;
$$;

create or replace function public.backfill_audio_jobs()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audio_jobs
    (subject_type, subject_id, content_hash, hash_version, status, attempts, storage_path,
     requested_at, created_at, updated_at)
  select 'term', t.term_id, t.content_hash, 1, t.status,
         case when t.status = 'pending' then 1 else 0 end, t.storage_path,
         t.updated_at, t.created_at, t.updated_at
  from public.term_narrations t
  on conflict (subject_type, subject_id) where status <> 'superseded'
  do update set
    content_hash = excluded.content_hash,
    status = excluded.status,
    storage_path = excluded.storage_path,
    requested_at = excluded.requested_at,
    updated_at = excluded.updated_at
  where public.audio_jobs.hash_version = 1
    and (public.audio_jobs.content_hash, public.audio_jobs.status, public.audio_jobs.storage_path)
      is distinct from (excluded.content_hash, excluded.status, excluded.storage_path);

  insert into public.audio_jobs
    (subject_type, subject_id, user_id, content_hash, hash_version, status, attempts, storage_path,
     requested_at, updated_at)
  select 'story', s.id, s.user_id, 'story-v1', 1,
         case when s.narration_status = 'ready' and s.narration_path is null
              then 'failed' else s.narration_status end,
         case when s.narration_status = 'pending' then 1 else 0 end,
         case when s.narration_status in ('ready', 'failed') then s.narration_path end,
         coalesce(s.narration_requested_at, 'epoch'), coalesce(s.narration_requested_at, 'epoch')
  from public.stories s
  where s.narration_status <> 'none'
  on conflict (subject_type, subject_id) where status <> 'superseded'
  do update set
    status = excluded.status,
    storage_path = excluded.storage_path,
    requested_at = excluded.requested_at,
    updated_at = excluded.updated_at
  where public.audio_jobs.hash_version = 1
    and (public.audio_jobs.status, public.audio_jobs.storage_path)
      is distinct from (excluded.status, excluded.storage_path);
$$;

revoke all on function public.mirror_term_narration() from public, anon, authenticated, service_role;
revoke all on function public.mirror_story_narration() from public, anon, authenticated, service_role;
revoke all on function public.backfill_audio_jobs() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- An admin who started a sync can be deleted. The job keeps its row.
-- One statement, so a replay drops and adds the same constraint cleanly.
-- ---------------------------------------------------------------------------

alter table public.narration_sync_jobs
  drop constraint if exists narration_sync_jobs_started_by_fkey,
  alter column started_by drop not null,
  add constraint narration_sync_jobs_started_by_fkey
    foreign key (started_by) references public.users (id) on delete set null;
