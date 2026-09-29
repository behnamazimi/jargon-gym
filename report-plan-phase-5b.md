# Phase 5b plan: app cutover to `audio_jobs`

Two PRs, in order. 5b-pre is a tiny migration; 5b is the app release. Decisions made with the user: story narration moves to explicit prepare (POST), like terms.

## 5b-pre: delete triggers (expand, migration only)

Why: after the cutover a term or story narrated by the new app has no row in the old tables, so the old `after delete` mirrors never supersede its job. The file would stay forever (E6).

- `after delete on public.terms` and `after delete on public.stories` supersede the live `audio_jobs` row for that subject (`status <> 'superseded'` to `superseded`, `updated_at = now()`). `security definer`, `search_path = public`, body wrapped in `exception when others then raise warning`, so a delete never fails because of this. `create or replace` and `drop trigger if exists` so the file replays.
- Terms deleted by a domain cascade fire the row trigger per term; account deletion cascades to stories the same way.
- Backfill once: supersede live jobs whose subject no longer exists (idempotent `update`).
- Rollback: drop the two triggers and functions.
- Test: `supabase/tests/audio_jobs_delete.sql` (delete a term and a story, the live job becomes superseded and keeps its path and `user_id`; a failing trigger body does not fail the delete).
- Regenerate `database.types.ts` only if it changes (functions unused by the API do not).

## 5b: the app

The app deploys before migrations, but 5b needs only 5a and 5b-pre, which are deployed by then. 5b merges only after the "Deploy Supabase migrations" run for 5b-pre has succeeded.

### `lib/ai/speech/`

- `provider.ts`: `synthesizeSpeech(script, language)`, the ElevenLabs client, model, format and voice map moved from `lib/narration/eleven-labs.ts` (the `nl` voice TODO moves with it).
- `storage.ts`: upload, streaming download (missing object error, range) moved from `lib/narration/storage.ts`, plus `deleteAudioObject(path)`.
- `jobs.ts`: the `audio_jobs` repository. `getLiveJob(subject)`, `claimJob(...)` (RPC `claim_audio_job`, `p_user_id` cast for terms), `objectPathFor(job)` (RPC `audio_job_object_path`), `markReady(job, path)` and `markFailed(job, error)`, both `where id = job.id and status = 'pending'` so a job that was superseded meanwhile is not touched (its uploaded file is an orphan the sweep removes), `markFileMissing(job)` (`ready` to `failed`, `where id and status = 'ready'`), `waitForJob`.
- `subjects.ts`: what differs between a term and a story.
  - term: narrated fields plus `domains(language)` in one query. Current hash is `computeContentHashV2(fields, language)` (version 2). Legacy hash is `computeContentHash(fields)` (version 1). Script from `buildNarrationScript`.
  - story: owned by `userId` (checked in the query). Hash is the constant `story-v2` at version 2; the legacy hash `story-v1` at version 1 (what the phase 4 mirror wrote). Script is title plus the segments (`getStoryForUser`), loaded only when generating.
- `validity.ts`: `isCurrentJob(job, subject)`: `ready`, has a path, and either `hash_version = 1` with the legacy hash, or `hash_version = CURRENT_HASH_VERSION (2)` with the current hash. A version-1 clip stays valid while its v1 hash matches (D5).
- `audio.ts`:
  - `getReadyAudio(admin, subject)`: read-only, returns the live job if current, otherwise nothing. Never claims or generates.
  - `getOrCreateAudio(admin, subject, { waitMs, regenerate, allowGeneration })`: current job returns `ready`. Otherwise `allowGeneration()` (story cap) may answer `capped`. Then claim. Won: script, synthesize, upload to `audio_job_object_path`, `markReady`. Lost: poll the live job up to `waitMs` (terms 30 s as today, stories 0, returns `pending`). Provider or upload errors mark the job failed and return `unavailable` with the character count for the usage log. `regenerate` is passed to the claim (no UI in 5b).
- `serve.ts`: the shared HTTP handler both routes call. `serveAudio(request, subject)`: ETag `"<job id>"`, `Cache-Control: private, no-cache`, `Accept-Ranges`, 304, 206 with `Content-Range`, the missing-file case (E1): `markFileMissing` and 404, so the next explicit prepare reclaims the failed job and regenerates once. It never generates.
- `sweep.ts`: `sweepSupersededAudio(admin, { limit })`: superseded rows older than one hour with a `storage_path`, skipping any path that a non-superseded row also uses (version-1 paths are reused); delete the object (a missing object counts as done), then set `storage_path = null` on the row. Runs at the end of each sync tick, best effort.

### Routes (URLs stay, so open pages and cached players keep working)

- `app/api/narration/[termId]/route.ts`: `authorize` (verified header, `has_feature_access`, RLS term read) unchanged; GET calls `serveAudio`; POST keeps the run guard, the term daily cap and usage recording, and calls `getOrCreateAudio`. `maxDuration = 60` stays.
- `app/api/stories/[storyId]/narration/route.ts`: GET serves only (404 when not ready). New POST: access check, ownership, story cap through `allowGeneration`, usage recording. Replies JSON `{ ready: true }`, 202 `{ ready: false, pending: true }` while another request generates, 429 `{ capped: true }`, 502.
- `story-narration-player.tsx`: the prepare loop uses POST (retry on 202, stop on 429) then plays GET. `?prepare=1` is removed.

### Worker

- `sync-worker.ts`: `generateTerm` calls `getOrCreateAudio` for a term with `waitMs` 30 s.
- `sync-missing.ts`: reads `audio_jobs` (`subject_type = 'term'`, live rows) instead of `term_narrations`, checks with `isCurrentJob`, and selects `domains(language)` with the terms.
- `app/api/internal/narration/sync/route.ts`: runs `sweepSupersededAudio` after the batch, inside the same `after`.

### Other

- Delete `lib/narration/{service,eleven-labs,storage}.ts` and `lib/stories/narration.ts` with their tests. Everything else in `lib/narration/` stays for 5c cleanup.
- `knip.json`: drop the ignore for `content-hash-v2.ts`.
- `narration-isolation.test.ts` also scans `lib/ai/speech/`.
- The old secret is not retired in this PR: the admin page in production is the only signal and the agent does not touch production. It stays a to-do for the user (`handoff.md`). `TELEGRAM_INTERNAL_SECRET` is never removed.
- Nothing reads `narration_settings`, `narration_allowlist`, `term_narrations` or `stories.narration_*` any more (grep is part of the review).

### Rollout and rollback

- Rollout: 5b-pre migration deploys, then 5b merges. Clips already `ready` at version 1 keep their path and are served as before; no clip is regenerated and no cost is added. A term is regenerated only when its own hash changes, at version 2.
- Rollback of 5b: redeploy the previous build. It reads the old tables, which are stale for anything that changed after the cutover (clips made by 5b appear missing and are regenerated on demand, at the normal cost). No data is lost; version-2 jobs and files remain for the sweep.
- Rollback of 5b-pre: drop the two triggers.

### Edge cases (report sections 5 and 6)

E1 missing file (serve marks failed, next prepare regenerates once), E2 `maxDuration` on both routes, E3/E4 language and template in the hash (v2), E5 never-overwritten hash-keyed paths (job id in the key), E6 file cleanup on supersede and on subject/user deletion (5b-pre triggers plus sweep), E7 cancel when narration is off (kept), E13/M2 stale cache (ETag by job id, `no-cache`), E25 race-safe claim (SQL from 5a), M3 a persistent failure re-claims on every explicit prepare only (GET never generates; the term player's single prepare per load stays), M7 waiting requests hold a function up to 30 s for terms (unchanged), M9 story cap race (accepted, unchanged), F4 story GET no longer generates.

### Tests

- SQL: `audio_jobs_delete.sql` (5b-pre) and every existing `supabase/tests` file run by hand.
- `audio.test.ts`: current v1 clip served without a claim; v1 clip whose fields changed is claimed at v2; v2 clip; won and lost claim; polling; provider failure marks failed; upload path comes from the RPC; superseded-while-generating leaves the new job alone; `capped`; story ownership.
- `serve.test.ts`: 304, 206, missing file marks failed and 404, not ready is 404, never generates.
- Route tests for term and story (unauthorized, feature off, wrong owner, capped, busy, prepare).
- `sync.test.ts` moved to `audio_jobs` rows and the new function; `sweep.test.ts` (shared v1 path is kept, missing object is fine, null path after delete).
- `narration-isolation.test.ts` stays green.
- Manual pass in a browser is not possible without provider keys; the PR says so.
