-- prune_operational_rows removes old usage events and finished sync jobs,
-- empties the term lists of finished jobs, and leaves everything else alone.
-- One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/prune_operational_rows.sql
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

do $$
declare
  u1 uuid := pg_temp.make_user('prune@example.test');
  v_collection uuid := gen_random_uuid();
  v_old_job uuid;
  v_done_job uuid;
  v_active_job uuid;
  v_before bigint;
begin
  insert into public.collections (id, name, owner_id) values (v_collection, 'P', u1);

  insert into public.ai_usage_events (user_id, feature, units, outcome, created_at)
  values (u1, 'narration_term', 1, 'ok', now() - interval '91 days'),
         (u1, 'narration_term', 1, 'ok', now() - interval '89 days');

  insert into public.narration_sync_jobs (collection_id, status, term_ids, term_count, finished_at)
  values (v_collection, 'completed', array[gen_random_uuid()], 1, now() - interval '91 days')
  returning id into v_old_job;
  insert into public.narration_sync_jobs (collection_id, status, term_ids, term_count, finished_at)
  values (v_collection, 'cancelled', array[gen_random_uuid(), gen_random_uuid()], 2, now() - interval '1 day')
  returning id into v_done_job;
  update public.narration_sync_jobs set status = 'cancelled' where status in ('queued', 'running');
  insert into public.narration_sync_jobs (collection_id, status, term_ids, term_count)
  values (v_collection, 'running', array[gen_random_uuid()], 1)
  returning id into v_active_job;

  select count(*) into v_before from public.ai_usage_events where user_id = u1;
  assert v_before = 2, 'two usage events to start with';

  perform * from public.prune_operational_rows();

  assert (select count(*) from public.ai_usage_events where user_id = u1) = 1, 'only the old usage event goes';
  assert not exists (select 1 from public.narration_sync_jobs where id = v_old_job), 'an old finished job goes';
  assert (select cardinality(term_ids) from public.narration_sync_jobs where id = v_done_job) = 0,
    'a recent finished job loses its term list';
  assert (select term_count from public.narration_sync_jobs where id = v_done_job) = 2, 'but keeps its total';
  assert (select cardinality(term_ids) from public.narration_sync_jobs where id = v_active_job) = 1,
    'an active job keeps its term list';
end;
$$;

rollback;
