-- New narration clips go under terms/ and stories/ instead of audio/<type>/.
-- Same arguments and grants, so the deployed app keeps working. No row or file
-- is touched: existing clips are moved and their paths updated separately, and
-- until then the old rows keep pointing at keys that still exist.

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
  select (case p_subject_type when 'term' then 'terms' else 'stories' end)
    || '/' || p_subject_id::text || '/'
    || p_hash_version::text || '/' || p_content_hash || '/' || p_job_id::text || '.mp3';
$$;

revoke all on function public.audio_job_object_path(uuid, text, uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.audio_job_object_path(uuid, text, uuid, integer, text)
  to service_role;
