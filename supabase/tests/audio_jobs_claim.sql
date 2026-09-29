-- claim_audio_job: supersede then insert, version rule, path keys, mirror guard, M6.
-- One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/audio_jobs_claim.sql
begin;

create function pg_temp.make_user(p_email text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
  v_code text := 'C' || replace(gen_random_uuid()::text, '-', '');
begin
  insert into public.referral_codes (code) values (v_code);
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (v_id, p_email, jsonb_build_object('referral_code', v_code), 'authenticated', 'authenticated');
  return v_id;
end;
$$;

do $$
declare
  u_owner uuid := pg_temp.make_user('claim-owner@example.test');
  u_starter uuid := pg_temp.make_user('claim-starter@example.test');
  v_domain uuid := gen_random_uuid();
  v_term uuid := gen_random_uuid();
  v_subject uuid;
  v_story uuid;
  v_old uuid;
  v_new uuid;
  v_job uuid;
  v_path text;
  v_other text;
  v_failed boolean;
  r record;
begin
  insert into public.domains (id, name, owner_id) values (v_domain, 'Claim', u_owner);
  insert into public.terms (id, term, category, definition, domain_id)
  values (v_term, 'Claim', 'c', 'd', v_domain);

  -- No live row: one pending job, version 2, no file yet.
  v_subject := gen_random_uuid();
  select * into r from public.claim_audio_job('term', v_subject, null, 'hash-a', 2, false);
  assert r.status = 'pending' and r.attempts = 1 and r.storage_path is null
    and r.hash_version = 2 and r.content_hash = 'hash-a' and r.user_id is null,
    'a first claim inserts a pending version-2 job';
  assert (select count(*) from public.audio_jobs where subject_id = v_subject) = 1;

  -- A fresh pending row is left alone, including a regenerate request.
  assert not exists (
    select 1 from public.claim_audio_job('term', v_subject, null, 'hash-a', 2, true)
  ), 'a fresh pending job is not reclaimed';
  assert (select status from public.audio_jobs where subject_id = v_subject) = 'pending';

  -- Version 1 cannot create a job. It can only confirm a ready one.
  begin
    perform public.claim_audio_job('term', gen_random_uuid(), null, 'hash-a', 1, false);
    v_failed := false;
  exception when others then
    v_failed := true;
  end;
  assert v_failed, 'a new job cannot be version 1';

  -- Ready and unchanged: no write. Version 1 is allowed on this path only.
  v_subject := gen_random_uuid();
  insert into public.audio_jobs
    (subject_type, subject_id, content_hash, hash_version, status, attempts, storage_path, requested_at)
  values ('term', v_subject, 'v1-hash', 1, 'ready', 3, v_subject::text || '.mp3', now());
  v_old := (select id from public.audio_jobs where subject_id = v_subject);
  assert not exists (
    select 1 from public.claim_audio_job('term', v_subject, null, 'v1-hash', 1, false)
  ), 'a matching ready job is kept';
  assert (select id from public.audio_jobs where subject_id = v_subject and status <> 'superseded') = v_old,
    'confirming a ready job does not replace it';

  -- A different hash supersedes, keeps the old file, and starts a new attempt.
  -- updated_at is set back first: now() does not move inside this transaction,
  -- so a bump is visible only because the old value is earlier than now().
  update public.audio_jobs set updated_at = 'epoch' where id = v_old;
  select * into r from public.claim_audio_job('term', v_subject, null, 'v2-hash', 2, false);
  assert r.status = 'pending' and r.attempts = 4 and r.hash_version = 2 and r.id <> v_old;
  assert (select status from public.audio_jobs where id = v_old) = 'superseded';
  assert (select storage_path from public.audio_jobs where id = v_old) = v_subject::text || '.mp3',
    'the superseded job keeps its file';
  assert (select content_hash from public.audio_jobs where id = v_old) = 'v1-hash';
  assert (select hash_version from public.audio_jobs where id = v_old) = 1;
  assert (select attempts from public.audio_jobs where id = v_old) = 3;
  assert (select updated_at from public.audio_jobs where id = v_old) > 'epoch',
    'superseding stamps updated_at';

  -- The live row cannot take the superseded file's path.
  begin
    update public.audio_jobs set storage_path = v_subject::text || '.mp3' where id = r.id;
    v_failed := false;
  exception when unique_violation then
    v_failed := true;
  end;
  assert v_failed, 'two jobs cannot share a storage path';

  -- Same hash, newer version: also a new job.
  v_subject := gen_random_uuid();
  insert into public.audio_jobs
    (subject_type, subject_id, content_hash, hash_version, status, storage_path)
  values ('term', v_subject, 'same', 1, 'ready', v_subject::text || '.mp3');
  select * into r from public.claim_audio_job('term', v_subject, null, 'same', 2, false);
  assert r.hash_version = 2 and r.content_hash = 'same' and r.attempts = 1;
  assert (select status from public.audio_jobs where subject_id = v_subject and hash_version = 1) = 'superseded';

  -- Regenerate a matching ready job. A version-1 caller cannot do it.
  v_subject := gen_random_uuid();
  insert into public.audio_jobs
    (subject_type, subject_id, content_hash, hash_version, status, attempts, storage_path)
  values ('term', v_subject, 'keep', 2, 'ready', 2, 'audio/keep.mp3');
  begin
    perform public.claim_audio_job('term', v_subject, null, 'keep', 1, true);
    v_failed := false;
  exception when others then
    v_failed := true;
  end;
  assert v_failed, 'regenerate still creates a version-2 job';
  assert (select status from public.audio_jobs where subject_id = v_subject) = 'ready',
    'the refused regenerate leaves the ready job';
  select * into r from public.claim_audio_job('term', v_subject, null, 'keep', 2, true);
  assert r.status = 'pending' and r.attempts = 3 and r.content_hash = 'keep';
  assert (select storage_path from public.audio_jobs
          where subject_id = v_subject and status = 'superseded') = 'audio/keep.mp3';

  -- A failure is reclaimed without the flag. The old path stays.
  v_subject := gen_random_uuid();
  insert into public.audio_jobs
    (subject_type, subject_id, content_hash, hash_version, status, attempts, storage_path)
  values ('term', v_subject, 'bad', 1, 'failed', 4, v_subject::text || '.mp3');
  select * into r from public.claim_audio_job('term', v_subject, null, 'bad', 2, false);
  assert r.attempts = 5 and r.status = 'pending';
  assert (select storage_path from public.audio_jobs
          where subject_id = v_subject and status = 'superseded') = v_subject::text || '.mp3';

  -- A pending job older than 2 minutes is reclaimed. The clock is requested_at.
  v_subject := gen_random_uuid();
  insert into public.audio_jobs
    (subject_type, subject_id, content_hash, hash_version, status, attempts, requested_at)
  values ('term', v_subject, 'old', 2, 'pending', 1, now() - interval '3 minutes');
  v_old := (select id from public.audio_jobs where subject_id = v_subject);
  select * into r from public.claim_audio_job('term', v_subject, null, 'old', 2, false);
  assert r.id <> v_old and r.attempts = 2 and r.status = 'pending';
  assert (select status from public.audio_jobs where id = v_old) = 'superseded';

  -- Illegal callers.
  begin
    perform public.claim_audio_job('story', gen_random_uuid(), null, 'h', 2, false);
    v_failed := false;
  exception when others then
    v_failed := true;
  end;
  assert v_failed, 'a story job needs an owner';
  begin
    perform public.claim_audio_job('term', gen_random_uuid(), u_owner, 'h', 2, false);
    v_failed := false;
  exception when others then
    v_failed := true;
  end;
  assert v_failed, 'a term job has no owner';
  begin
    perform public.claim_audio_job('term', gen_random_uuid(), null, '  ', 2, false);
    v_failed := false;
  exception when others then
    v_failed := true;
  end;
  assert v_failed, 'an empty hash is rejected';
  begin
    perform public.claim_audio_job('nope', gen_random_uuid(), null, 'h', 2, false);
    v_failed := false;
  exception when others then
    v_failed := true;
  end;
  assert v_failed, 'an unknown subject type is rejected';

  -- Story rows keep the owner on the superseded job and on the new one.
  v_story := gen_random_uuid();
  insert into public.audio_jobs
    (subject_type, subject_id, user_id, content_hash, hash_version, status, attempts, storage_path)
  values ('story', v_story, u_owner, 'story-v1', 1, 'ready', 1, 'stories/old.mp3');
  select * into r from public.claim_audio_job('story', v_story, u_owner, 'story-v2', 2, false);
  assert r.user_id = u_owner and r.subject_type = 'story';
  assert (select user_id from public.audio_jobs
          where subject_id = v_story and status = 'superseded') = u_owner;
  assert (select storage_path from public.audio_jobs
          where subject_id = v_story and status = 'superseded') = 'stories/old.mp3';

  -- Path keys include the hash and the job id, and differ per attempt.
  v_new := gen_random_uuid();
  v_old := gen_random_uuid();
  v_path := public.audio_job_object_path(v_new, 'term', v_subject, 2, 'abc');
  v_other := public.audio_job_object_path(v_old, 'term', v_subject, 2, 'abc');
  assert v_path <> v_other;
  assert v_path = 'audio/term/' || v_subject::text || '/2/abc/' || v_new::text || '.mp3';
  assert v_path like 'audio/%';

  -- A version-2 live job is not rewritten when the old table changes.
  v_subject := gen_random_uuid();
  insert into public.terms (id, term, category, definition, domain_id)
  values (v_subject, 'Guarded', 'c', 'd', v_domain);
  select * into r from public.claim_audio_job('term', v_subject, null, 'guarded', 2, false);
  insert into public.term_narrations (term_id, content_hash, status, storage_path)
  values (v_subject, 'from-old', 'ready', v_subject::text || '.mp3');
  assert (select content_hash || ':' || status || ':' || hash_version::text
          from public.audio_jobs where id = r.id) = 'guarded:pending:2',
    'a mirror does not clobber a version-2 job';
  assert (select storage_path from public.audio_jobs where id = r.id) is null;

  -- A version-1 job still follows the old table.
  update public.audio_jobs
  set hash_version = 1, content_hash = 'from-old', status = 'ready',
      storage_path = v_subject::text || '.mp3'
  where id = r.id;
  update public.term_narrations
  set status = 'failed', content_hash = 'from-old-2', storage_path = v_subject::text || '.mp3'
  where term_id = v_subject;
  assert (select status || ':' || content_hash from public.audio_jobs where id = r.id) = 'failed:from-old-2',
    'a version-1 job is still mirrored';

  -- Grants, and the claim never mentions the credit ledger.
  assert has_function_privilege('service_role', 'public.claim_audio_job(text,uuid,uuid,text,integer,boolean)', 'execute');
  assert not has_function_privilege('authenticated', 'public.claim_audio_job(text,uuid,uuid,text,integer,boolean)', 'execute');
  assert not has_function_privilege('anon', 'public.claim_audio_job(text,uuid,uuid,text,integer,boolean)', 'execute');
  assert has_function_privilege('service_role', 'public.audio_job_object_path(uuid,text,uuid,integer,text)', 'execute');
  assert not has_function_privilege('authenticated', 'public.audio_job_object_path(uuid,text,uuid,integer,text)', 'execute');
  assert position('ai_credit_ledger' in pg_get_functiondef('public.claim_audio_job(text,uuid,uuid,text,integer,boolean)'::regprocedure)) = 0;
  assert position('reserve_ai_credits' in pg_get_functiondef('public.claim_audio_job(text,uuid,uuid,text,integer,boolean)'::regprocedure)) = 0;

  -- Deleting the admin who started a sync clears started_by and keeps the job.
  -- Clear the referral pair first: user delete nulls used_by and would leave used_at set.
  insert into public.narration_sync_jobs (domain_id, started_by, term_ids)
  values (v_domain, u_starter, array[v_term])
  returning id into v_job;
  update public.referral_codes set used_by = null, used_at = null where used_by = u_starter;
  delete from auth.users where id = u_starter;
  assert (select started_by from public.narration_sync_jobs where id = v_job) is null,
    'deleting the starter clears started_by';
  assert (select count(*) from public.narration_sync_jobs where id = v_job) = 1;
end;
$$;

rollback;
\echo audio_jobs_claim.sql: ok
