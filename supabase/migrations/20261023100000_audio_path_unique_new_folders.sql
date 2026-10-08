-- Keep one object key per file for clips written under terms/ and stories/.
-- The unique index only covered audio/%, so after clips moved folders two jobs
-- could share a new key. Version-1 keys (<id>.mp3, terms/<id>.mp3,
-- stories/<name>.mp3) stay outside the index; they have fewer path segments
-- than <folder>/<subject>/<version>/<hash>/<job>.mp3.
drop index if exists public.audio_jobs_storage_path_idx;
create unique index audio_jobs_storage_path_idx
  on public.audio_jobs (storage_path)
  where storage_path is not null
    and (
      storage_path like 'audio/%'
      or storage_path ~ '^(terms|stories)/[^/]+/[0-9]+/[^/]+/[^/]+$'
    );
