-- Deleting a term or a story supersedes its live audio job and keeps its path
-- (and a story's owner) for the sweep. One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/audio_jobs_delete.sql
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
  u1 uuid := pg_temp.make_user('del1@example.test');
  v_collection uuid := gen_random_uuid();
  t1 uuid := gen_random_uuid();
  t2 uuid := gen_random_uuid();
  s1 uuid := gen_random_uuid();
  j_term uuid;
  j_story uuid;
  j_other uuid;
begin
  insert into public.collections (id, name, owner_id) values (v_collection, 'D', u1);
  insert into public.terms (id, term, category, definition, collection_id) values
    (t1, 'One', 'c', 'd', v_collection), (t2, 'Two', 'c', 'd', v_collection);
  insert into public.stories
    (id, user_id, language, format, tone, reading_level, cefr_level, title, segments, term_ids)
  values (s1, u1, 'en', 'email', 'neutral', 'plain', 'B1', 'T', '[]'::jsonb,
          array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid()]);

  -- New-style jobs: no row in the old narration tables at all.
  insert into public.audio_jobs (subject_type, subject_id, content_hash, hash_version, status, storage_path)
  values ('term', t1, 'h1', 2, 'ready', 'terms/x/2/h1/a.mp3') returning id into j_term;
  insert into public.audio_jobs (subject_type, subject_id, user_id, content_hash, hash_version, status, storage_path)
  values ('story', s1, u1, 'story-v2', 2, 'ready', 'stories/x/2/story-v2/b.mp3') returning id into j_story;
  insert into public.audio_jobs (subject_type, subject_id, content_hash, hash_version, status, storage_path)
  values ('term', t2, 'h2', 2, 'ready', 'terms/y/2/h2/c.mp3') returning id into j_other;

  delete from public.terms where id = t1;
  assert (select status from public.audio_jobs where id = j_term) = 'superseded', 'a deleted term supersedes its job';
  assert (select storage_path from public.audio_jobs where id = j_term) = 'terms/x/2/h1/a.mp3',
    'and keeps the path for the sweep';
  assert (select status from public.audio_jobs where id = j_other) = 'ready', 'other terms are untouched';

  delete from public.stories where id = s1;
  assert (select status from public.audio_jobs where id = j_story) = 'superseded', 'a deleted story supersedes its job';
  assert (select user_id from public.audio_jobs where id = j_story) = u1, 'and keeps its owner';

  -- A collection delete cascades to its terms and fires the row trigger for each.
  delete from public.collections where id = v_collection;
  assert (select status from public.audio_jobs where id = j_other) = 'superseded', 'a cascade delete supersedes too';

  -- A failing trigger body never fails the delete.
  v_collection := gen_random_uuid();
  insert into public.collections (id, name, owner_id) values (v_collection, 'D2', u1);
  insert into public.terms (id, term, category, definition, collection_id) values (t1, 'One', 'c', 'd', v_collection);
  insert into public.audio_jobs (subject_type, subject_id, content_hash, hash_version, status, storage_path)
  values ('term', t1, 'h1b', 2, 'ready', 'terms/x/2/h1b/d.mp3');
  create function pg_temp.boom() returns trigger language plpgsql as $f$
  begin raise exception 'boom'; end; $f$;
  create trigger boom before update on public.audio_jobs for each row execute function pg_temp.boom();
  delete from public.terms where id = t1;
  assert not exists (select 1 from public.terms where id = t1), 'the delete still went through';
  assert (select status from public.audio_jobs where content_hash = 'h1b') = 'ready', 'and the job is unchanged';
  drop trigger boom on public.audio_jobs;

end;
$$;

rollback;
