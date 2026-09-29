-- Behavior checks for audio_jobs: the copy of existing narration state, the
-- triggers that keep it current, and grants. One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/audio_jobs.sql
begin;

create function pg_temp.make_user(p_email text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
  v_code text := 'T' || replace(gen_random_uuid()::text, '-', '');
begin
  insert into public.referral_codes (code) values (v_code);
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (v_id, p_email, jsonb_build_object('referral_code', v_code), 'authenticated', 'authenticated');
  return v_id;
end;
$$;

create function pg_temp.make_story(p_user uuid, p_status text, p_path text, p_requested timestamptz)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.stories
    (id, user_id, language, format, tone, reading_level, cefr_level, title, segments, term_ids,
     narration_status, narration_path, narration_requested_at)
  values
    (v_id, p_user, 'en', 'email', 'neutral', 'plain', 'B1', 'T', '[]'::jsonb,
     array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid()],
     p_status, p_path, p_requested);
  return v_id;
end;
$$;

do $$
declare
  u1 uuid := pg_temp.make_user('a1@example.test');
  v_domain uuid := gen_random_uuid();
  t1 uuid := gen_random_uuid();
  t2 uuid := gen_random_uuid();
  t3 uuid := gen_random_uuid();
  s_ready uuid;
  s_pending uuid;
  s_nopath uuid;
  s_nostamp uuid;
  s_none uuid;
  s_new uuid;
  r record;
  v_failed boolean;
begin
  insert into public.domains (id, name, owner_id) values (v_domain, 'D', u1);
  insert into public.terms (id, term, category, definition, domain_id) values
    (t1, 'One', 'c', 'd', v_domain), (t2, 'Two', 'c', 'd', v_domain), (t3, 'Three', 'c', 'd', v_domain);

  -- Rows that exist before the copy runs: make them by turning the triggers off,
  -- as if they predated the migration, then run the copy.
  alter table public.term_narrations disable trigger term_narrations_mirror;
  alter table public.stories disable trigger stories_narration_mirror;

  insert into public.term_narrations (term_id, content_hash, status, storage_path, created_at, updated_at)
  values (t1, 'hash-1', 'ready', 't1.mp3', now() - interval '3 days', now() - interval '2 days'),
         (t2, 'hash-2', 'failed', null, now() - interval '3 days', now() - interval '1 day');
  s_ready := pg_temp.make_story(u1, 'ready', 'stories/u/1.mp3', now() - interval '1 day');
  s_pending := pg_temp.make_story(u1, 'pending', null, now() - interval '5 minutes');
  s_nopath := pg_temp.make_story(u1, 'ready', null, now() - interval '1 day');
  s_nostamp := pg_temp.make_story(u1, 'pending', null, null);
  s_none := pg_temp.make_story(u1, 'none', null, null);

  alter table public.term_narrations enable trigger term_narrations_mirror;
  alter table public.stories enable trigger stories_narration_mirror;

  perform public.backfill_audio_jobs();

  -- Copied as they are: same hash, path and status, version 1. Nothing invented.
  select * into r from public.audio_jobs where subject_type = 'term' and subject_id = t1;
  assert r.content_hash = 'hash-1' and r.status = 'ready' and r.storage_path = 't1.mp3' and r.hash_version = 1,
    'a ready term keeps its hash, path and status';
  assert r.updated_at = (select updated_at from public.term_narrations where term_id = t1), 'and its timestamps';
  assert (select status from public.audio_jobs where subject_type = 'term' and subject_id = t2) = 'failed';
  assert (select count(*) from public.audio_jobs where subject_type = 'term' and subject_id in (t1, t2, t3)) = 2,
    'a term with no narration gets no job';

  select * into r from public.audio_jobs where subject_type = 'story' and subject_id = s_ready;
  assert r.status = 'ready' and r.storage_path = 'stories/u/1.mp3' and r.user_id = u1 and r.content_hash = 'story-v1';
  assert (select status from public.audio_jobs where subject_id = s_pending) = 'pending';
  assert (select status from public.audio_jobs where subject_id = s_nopath) = 'failed',
    'a story marked ready with no file counts as failed';
  assert (select requested_at from public.audio_jobs where subject_id = s_nostamp) = 'epoch',
    'a pending story with no time is stale';
  assert not exists (select 1 from public.audio_jobs where subject_id = s_none), 'stories without narration get no job';

  -- Running the copy again changes nothing.
  perform public.backfill_audio_jobs();
  assert (select count(*) from public.audio_jobs where subject_id in (t1, t2, s_ready, s_pending, s_nopath, s_nostamp)) = 6,
    'the copy is repeatable';

  -- Triggers keep it current: the old app claims, generates and fails.
  insert into public.term_narrations (term_id, content_hash, status) values (t3, 'h3', 'pending');
  assert (select status from public.audio_jobs where subject_id = t3) = 'pending', 'a new claim is mirrored';
  assert (select attempts from public.audio_jobs where subject_id = t3) = 1, 'and counts as an attempt';
  update public.term_narrations set status = 'ready', storage_path = 't3.mp3' where term_id = t3;
  assert (select status || ':' || storage_path from public.audio_jobs where subject_id = t3) = 'ready:t3.mp3';
  assert (select attempts from public.audio_jobs where subject_id = t3) = 1, 'finishing is not a new attempt';
  update public.term_narrations set status = 'pending', content_hash = 'h3b', storage_path = null where term_id = t3;
  assert (select content_hash || ':' || attempts from public.audio_jobs where subject_id = t3) = 'h3b:2',
    'a reclaim with a new hash updates the same live job';
  assert (select count(*) from public.audio_jobs where subject_id = t3) = 1, 'one live job per subject';

  -- Stories: claim, finish, fail.
  s_new := pg_temp.make_story(u1, 'none', null, null);
  update public.stories set narration_status = 'pending', narration_requested_at = now() where id = s_new;
  assert (select status from public.audio_jobs where subject_id = s_new) = 'pending', 'a story claim is mirrored';
  update public.stories set narration_status = 'ready', narration_path = 'stories/u/new.mp3' where id = s_new;
  assert (select status || ':' || storage_path from public.audio_jobs where subject_id = s_new) = 'ready:stories/u/new.mp3';
  update public.stories set narration_status = 'failed' where id = s_new;
  assert (select status || ':' || coalesce(storage_path, '-') from public.audio_jobs where subject_id = s_new) = 'failed:-';

  -- Deleting the old row marks the job superseded, and a new row starts a new live job.
  delete from public.term_narrations where term_id = t3;
  assert (select status from public.audio_jobs where subject_id = t3) = 'superseded', 'a deleted narration is superseded';
  insert into public.term_narrations (term_id, content_hash, status) values (t3, 'h3c', 'pending');
  assert (select count(*) from public.audio_jobs where subject_id = t3) = 2, 'the old job is kept';
  assert (select count(*) from public.audio_jobs where subject_id = t3 and status <> 'superseded') = 1, 'with one live job';

  delete from public.terms where id = t1;
  assert (select status from public.audio_jobs where subject_id = t1) = 'superseded', 'deleting a term supersedes its job';
  delete from public.stories where id = s_ready;
  assert (select status from public.audio_jobs where subject_id = s_ready) = 'superseded', 'deleting a story does too';

  -- A failing copy never fails the write the app made.
  create function pg_temp.explode() returns trigger language plpgsql as $f$
  begin raise exception 'boom'; end; $f$;
  create trigger audio_jobs_explode before insert or update on public.audio_jobs
    for each row execute function pg_temp.explode();
  insert into public.term_narrations (term_id, content_hash, status) values (t2, 'hx', 'pending')
    on conflict (term_id) do update set content_hash = 'hx', status = 'pending';
  assert (select content_hash from public.term_narrations where term_id = t2) = 'hx',
    'the old write should survive a failing copy';
  drop trigger audio_jobs_explode on public.audio_jobs;

  -- Shape rules.
  begin
    insert into public.audio_jobs (subject_type, subject_id, content_hash, status) values ('story', gen_random_uuid(), 'x', 'pending');
    v_failed := false;
  exception when check_violation then
    v_failed := true;
  end;
  assert v_failed, 'a story job needs an owner';
  begin
    insert into public.audio_jobs (subject_type, subject_id, content_hash, status) values ('term', gen_random_uuid(), 'x', 'ready');
    v_failed := false;
  exception when check_violation then
    v_failed := true;
  end;
  assert v_failed, 'a ready job needs a file';
  begin
    insert into public.audio_jobs (subject_type, subject_id, content_hash, status)
    values ('term', t2, 'dup', 'pending');
    v_failed := false;
  exception when unique_violation then
    v_failed := true;
  end;
  assert v_failed, 'a subject has one live job';

  -- Credits and the ledger are never involved.
  assert not exists (select 1 from public.ai_credit_ledger where user_id = u1), 'the ledger is untouched';

  -- Grants.
  assert has_table_privilege('service_role', 'public.audio_jobs', 'insert');
  assert has_table_privilege('service_role', 'public.audio_jobs', 'update');
  assert has_table_privilege('service_role', 'public.audio_jobs', 'delete');
  assert has_table_privilege('authenticated', 'public.audio_jobs', 'select');
  assert not has_table_privilege('authenticated', 'public.audio_jobs', 'insert');
  assert not has_table_privilege('anon', 'public.audio_jobs', 'select');
  assert has_table_privilege('service_role', 'public.ai_worker_status', 'insert');
  assert has_table_privilege('service_role', 'public.ai_worker_status', 'update');
  assert not has_table_privilege('service_role', 'public.ai_worker_status', 'delete');
  assert not has_table_privilege('authenticated', 'public.ai_worker_status', 'update');
  assert not has_table_privilege('anon', 'public.ai_worker_status', 'select');
  assert not has_function_privilege('service_role', 'public.backfill_audio_jobs()', 'execute');
  assert not has_function_privilege('authenticated', 'public.backfill_audio_jobs()', 'execute');
  assert not has_function_privilege('authenticated', 'public.mirror_term_narration()', 'execute');
  assert not has_function_privilege('service_role', 'public.mirror_story_narration()', 'execute');

  -- Heartbeat rows are per worker and caller, with a known secret label.
  insert into public.ai_worker_status (worker, source, last_secret) values ('narration-sync', 'cron', 'legacy');
  insert into public.ai_worker_status (worker, source, last_secret) values ('narration-sync', 'app', 'ai');
  begin
    insert into public.ai_worker_status (worker, source, last_secret) values ('narration-sync', 'cron', 'ai');
    v_failed := false;
  exception when unique_violation then
    v_failed := true;
  end;
  assert v_failed, 'one row per worker and caller';
  begin
    insert into public.ai_worker_status (worker, source, last_secret) values ('other', 'cron', 'secret-value');
    v_failed := false;
  exception when check_violation then
    v_failed := true;
  end;
  assert v_failed, 'only a label is stored, never a secret';
end;
$$;

rollback;
\echo audio_jobs.sql: ok
