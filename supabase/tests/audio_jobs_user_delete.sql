-- Deleting a person deletes their stories; their story clips are marked
-- superseded and lose the owner, so the sweeper can still remove the files.
-- Term clips (no owner) are untouched. One transaction that rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/audio_jobs_user_delete.sql
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
  u1 uuid := pg_temp.make_user('owner@example.test');
  s1 uuid := gen_random_uuid();
  t1 uuid := gen_random_uuid();
  v_collection uuid := gen_random_uuid();
  j_story uuid;
  j_term uuid;
  v_failed boolean := false;
begin
  insert into public.collections (id, name, owner_id) values (v_collection, 'Keep', pg_temp.make_user('other@example.test'));
  insert into public.terms (id, term, category, definition, collection_id) values (t1, 'One', 'c', 'd', v_collection);
  insert into public.stories
    (id, user_id, language, format, tone, reading_level, cefr_level, title, segments, term_ids)
  values (s1, u1, 'en', 'email', 'neutral', 'plain', 'B1', 'T', '[]'::jsonb,
          array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid()]);
  insert into public.audio_jobs (subject_type, subject_id, user_id, content_hash, hash_version, status, storage_path)
  values ('story', s1, u1, 'story-v2', 2, 'ready', 'stories/x/2/story-v2/b.mp3') returning id into j_story;
  insert into public.audio_jobs (subject_type, subject_id, content_hash, hash_version, status, storage_path)
  values ('term', t1, 'h1', 2, 'ready', 'terms/x/2/h1/a.mp3') returning id into j_term;

  delete from auth.users where id = u1;

  assert (select status from public.audio_jobs where id = j_story) = 'superseded',
    'the story clip is superseded';
  assert (select user_id from public.audio_jobs where id = j_story) is null,
    'and no longer points at the deleted person';
  assert (select storage_path from public.audio_jobs where id = j_story) = 'stories/x/2/story-v2/b.mp3',
    'its path stays for the sweeper';
  assert (select status from public.audio_jobs where id = j_term) = 'ready', 'term clips are untouched';

  -- A live story clip still needs an owner.
  begin
    insert into public.audio_jobs (subject_type, subject_id, content_hash, hash_version, status, storage_path)
    values ('story', gen_random_uuid(), 'x', 2, 'ready', 'stories/y/2/x/c.mp3');
  exception when check_violation then
    v_failed := true;
  end;
  assert v_failed, 'a live story clip without an owner is refused';
end;
$$;

rollback;
