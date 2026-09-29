-- Shape rules, grants and the worker heartbeat for audio_jobs. One transaction
-- that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/audio_jobs.sql
begin;

do $$
declare
  t1 uuid := gen_random_uuid();
  v_failed boolean;
begin
  insert into public.audio_jobs (subject_type, subject_id, content_hash, hash_version, status)
  values ('term', t1, 'h', 2, 'pending');

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
    insert into public.audio_jobs (subject_type, subject_id, content_hash, status) values ('term', t1, 'dup', 'pending');
    v_failed := false;
  exception when unique_violation then
    v_failed := true;
  end;
  assert v_failed, 'a subject has one live job';

  update public.audio_jobs set status = 'superseded' where subject_id = t1;
  insert into public.audio_jobs (subject_type, subject_id, content_hash, hash_version, status)
  values ('term', t1, 'h2', 2, 'pending');
  assert (select count(*) from public.audio_jobs where subject_id = t1) = 2, 'a superseded job does not block a new live one';

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
