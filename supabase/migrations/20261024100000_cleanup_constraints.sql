-- Pre-launch cleanup from the database audit. Every change here keeps the
-- running app build working: it only adds, relaxes or removes unused objects.

-- Superseded audio jobs used to stay behind forever with an empty path. The
-- sweeper now deletes a job once its file is gone, so remove the existing ones.
delete from public.audio_jobs
where status = 'superseded' and storage_path is null;

-- Deleting a collection or a term cascades into these tables.
create index triage_not_yet_term_id_idx on public.triage_not_yet (term_id);
create index stories_collection_id_idx on public.stories (collection_id);

-- audio_jobs.user_id was the one person reference without a foreign key. When
-- a person is deleted their story clips are marked superseded first (a story
-- clip must have an owner unless it is superseded), then lose the owner, so
-- the sweeper can still remove the files.
create function public.supersede_story_audio_on_user_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.audio_jobs
  set status = 'superseded', updated_at = now()
  where user_id = old.id
    and subject_type = 'story'
    and status <> 'superseded';
  return old;
end;
$$;

create trigger users_supersede_story_audio
  before delete on public.users
  for each row execute function public.supersede_story_audio_on_user_delete();

alter table public.audio_jobs
  add constraint audio_jobs_user_id_fkey
  foreign key (user_id) references public.users (id) on delete set null;

alter table public.audio_jobs drop constraint audio_jobs_story_has_owner;
alter table public.audio_jobs
  add constraint audio_jobs_story_has_owner
  check (subject_type <> 'story' or user_id is not null or status = 'superseded');

-- Every other table points at public.users; this one pointed at auth.users.
alter table public.triage_not_yet drop constraint triage_not_yet_user_id_fkey;
alter table public.triage_not_yet
  add constraint triage_not_yet_user_id_fkey
  foreign key (user_id) references public.users (id) on delete cascade;

-- A finished sync job no longer keeps its list of term ids, so its size lives
-- in its own column. 0 means "not recorded": older app builds don't write it
-- and the app falls back to the list length.
alter table public.narration_sync_jobs
  add column term_count integer not null default 0 check (term_count >= 0);
update public.narration_sync_jobs set term_count = cardinality(term_ids);

-- Unused: the app calls my_get_trace_candidates_json.
drop function public.my_get_trace_candidates(uuid[]);
