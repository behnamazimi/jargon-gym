-- Deleting a term or a story supersedes its live audio job. The old-table
-- mirrors already do this, but only for subjects that have a row in the old
-- tables. Once the app writes audio_jobs directly, new subjects have none, so
-- their job (and file) would never be cleaned up. Superseded rows keep their
-- path (and a story's user_id) for the sweep.

create or replace function public.supersede_audio_job_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.audio_jobs
  set status = 'superseded', updated_at = now()
  where subject_type = tg_argv[0]
    and subject_id = old.id
    and status <> 'superseded';
  return old;
exception when others then
  raise warning 'audio_jobs supersede failed for % %: %', tg_argv[0], old.id, sqlerrm;
  return old;
end;
$$;

revoke all on function public.supersede_audio_job_on_delete()
  from public, anon, authenticated, service_role;

drop trigger if exists terms_audio_job_delete on public.terms;
create trigger terms_audio_job_delete
  after delete on public.terms
  for each row
  execute function public.supersede_audio_job_on_delete('term');

drop trigger if exists stories_audio_job_delete on public.stories;
create trigger stories_audio_job_delete
  after delete on public.stories
  for each row
  execute function public.supersede_audio_job_on_delete('story');

-- Jobs whose subject is already gone (deleted while only the old mirrors ran).
update public.audio_jobs j
set status = 'superseded', updated_at = now()
where j.status <> 'superseded'
  and ((j.subject_type = 'term' and not exists (select 1 from public.terms t where t.id = j.subject_id))
    or (j.subject_type = 'story' and not exists (select 1 from public.stories s where s.id = j.subject_id)));
