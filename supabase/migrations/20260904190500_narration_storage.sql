-- Private bucket for cached ElevenLabs term narration MP3s. No anon or
-- authenticated policies are created on storage.objects: this app never
-- talks to Storage from the browser or the user's own RLS-scoped client —
-- every read and write goes through lib/narration/storage.ts, which uses
-- Supabase's S3-compatible endpoint with a dedicated set of S3 credentials
-- after lib/narration/service.ts has already enforced
-- public.has_narration_access(). With RLS enabled and zero anon/
-- authenticated policies, storage.objects defaults to deny-all for those
-- roles — exactly the access shape we want.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('term-narrations', 'term-narrations', false, 10485760, array['audio/mpeg'])
on conflict (id) do nothing;
