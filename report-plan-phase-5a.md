# Phase 5a plan: claim_audio_job (expand, additive)

Migration only. The deployed app keeps reading and writing `term_narrations` and `stories.narration_*`. Triggers keep copying those writes into `audio_jobs`. Nothing in this PR calls the new function. Phase 5b (app cutover) merges only after this migration's "Deploy Supabase migrations" run has succeeded. Phase 5c drops the old tables and is a separate, approval-gated PR.

Checked before writing this plan: `19871ab` (#109) and `4357a98` (#108) are on `origin/main`. The "Deploy Supabase migrations" run for `4357a98` succeeded (`36561229302`, 2026-09-29 11:21 UTC). The earlier run for that commit (`36560815320`) was skipped.

Edge cases by ID: E5, E6 (schema support only; file deletion is 5b), E15, E25, D5, D6, M6. Out of this PR: E1, E2, E3, E4 (wired when 5b calls hash v2), E7, E20, D1, F4's story generate-on-GET decision, and every undecided finding.

## What this PR changes

One new migration, `supabase/migrations/20260929210000_audio_job_claim.sql`. It adds the claim function 5b will call, a path function so new files cannot reuse an old key, two indexes, a guard so the phase 4 mirrors cannot overwrite a job the new claim owns, and the M6 foreign-key change. It regenerates `lib/supabase/database.types.ts`.

No application behavior changes. `claim_term_narration` stays. Narration still does not touch the credit ledger.

## claim_audio_job

```text
claim_audio_job(
  p_subject_type text,
  p_subject_id uuid,
  p_user_id uuid,
  p_content_hash text,
  p_hash_version integer,
  p_regenerate boolean default false
) returns setof public.audio_jobs
```

`p_hash_version` is an integer. A bare numeric literal is an integer, and that is what the app sends. The `hash_version` column stays `smallint`.

`security definer`, `search_path = public`. Revoke from `public`, `anon`, and `authenticated`. Grant execute to `service_role` only.

The function returns the new `pending` row when this caller won the claim, and an empty set otherwise. An empty set means "do not generate; read the live row." 5b owns that read. The function never writes `storage_path` (it stays null until an upload finishes) and never changes a superseded row's `storage_path` or `user_id`.

Validation, raised as an exception (the caller did something illegal, this is not a lost race):

- `p_subject_type` is `term` or `story`.
- `p_content_hash` is non-empty. `p_hash_version` is at least 1.
- A story requires `p_user_id`. A term requires `p_user_id` is null.

Decision, in one transaction:

1. Lock the live row (`status <> 'superseded'`) with `for update`. Waiting, not `skip locked`: there is one row per subject, and the loser must see the winner's committed row. This is the same serialization `claim_term_narration` gets from `on conflict`. `claim_narration_sync_tick` uses `skip locked` because it picks one job out of many; that shape does not apply here. The partial unique index is the backstop when no row exists yet.
2. No live row: insert `pending` with `attempts = 1`, `requested_at = now()`, `storage_path` null, and the caller's hash and version. A story stores `p_user_id`; a term stores null. On `unique_violation` (the other session inserted first), return empty.
3. Live row is `ready`, hash and `hash_version` both equal the arguments, and `p_regenerate` is false: return empty. The row is not modified. This is the D5 rule. A version-1 row stays valid when 5b passes that row's own hash and version 1. This migration does not compute hashes and does not mass-regenerate.
4. Live row is `pending` and `requested_at` is less than 2 minutes ago: return empty, even when `p_regenerate` is true. A second generation must not start while the first attempt is still inside the stale window.
5. Otherwise reclaim: `failed`, a `ready` row whose hash or `hash_version` differs, a `pending` row older than 2 minutes, or `p_regenerate` on a matching `ready` row. Set the live row to `superseded` (keep `storage_path`, `user_id`, `content_hash`, `hash_version`, and `attempts` as they are). Insert a new `pending` row with `attempts = old.attempts + 1`, the caller's hash and version, `storage_path` null, `error` null, `requested_at = now()`.

`p_regenerate` is the admin path. Today a `ready` job whose hash matches is not reclaimable, so a voluntary remake needs an explicit flag. Failures stay reclaimable without the flag. That keeps today's behavior. F6 (stop retrying failures on every play) stays dropped.

## Storage paths (E5, D5)

Version-1 paths stay verbatim (`<termId>.mp3`, `stories/<userId>/<storyId>.mp3`). This migration does not rewrite them.

New objects use a different key, built by `audio_job_object_path(p_job_id, p_subject_type, p_subject_id, p_hash_version, p_content_hash)`:

```text
audio/<subject_type>/<subject_id>/<hash_version>/<content_hash>/<job_id>.mp3
```

The `audio/` prefix cannot collide with a version-1 key. The job id means two attempts, even with the same hash, are different objects, so a late upload cannot overwrite the newer file. 5b must call this function and must not invent a second format. The claim function does not set the path; 5b sets it only after a successful upload, and only if that job is still the live `pending` row.

`create unique index audio_jobs_storage_path_idx on public.audio_jobs (storage_path) where storage_path is not null and storage_path like 'audio/%'`. Version-1 paths (`<termId>.mp3`, `stories/...`) are not in that index. The current app reuses them after a supersede, and a global unique index would make the mirror drop the new ready file while the old write still succeeds. New keys still cannot be shared. Before the migration is pushed, query the local database for duplicate non-null paths that start with `audio/`. If that index fails in CI or on deploy, stop and ask. Do not dedupe inside the migration.

## Orphan sweep support (E6)

Phase 4 already keeps `storage_path` on superseded rows and `user_id` on story rows, and delete mirrors only flip `status` to `superseded`. This PR keeps that, and the claim function must not clear those columns on the row it supersedes.

Do not add a foreign key on `audio_jobs.user_id`. `on delete cascade` or `set null` would drop the owner the sweep needs after an account deletion.

Add `audio_jobs_orphans_idx` on `(updated_at)` where `status = 'superseded' and storage_path is not null`, so 5b's sweep has a bounded scan. Deleting the object in storage is 5b, because it needs the storage API.

## Mirrors must not clobber a claimed job (D6)

Until 5c, the phase 4 triggers still copy old-table writes onto the live `audio_jobs` row. After 5b, a short overlap remains: an old instance can still write `term_narrations` while a new instance has superseded that subject's version-1 row and inserted a version-2 pending job. An in-place mirror update would then overwrite the new job's hash, status, and path.

Change `mirror_term_narration`, `mirror_story_narration`, and `backfill_audio_jobs` so the `do update` runs only when the live row's `hash_version = 1`. When the live row is already a later version, the conflict update does nothing and the old write still succeeds (the existing exception handler stays). Version-1 rows keep today's mirror behavior, which is all the deployed app produces. `backfill_audio_jobs()` gets the same guard so a later manual re-run cannot repair a version-2 job back to the old table.

The delete mirrors are unchanged: they still mark the live job `superseded` and leave `storage_path` and `user_id` in place.

## M6

`narration_sync_jobs.started_by` is `on delete restrict`, so deleting an admin who started a sync fails. In one `alter table` statement: drop the foreign key, drop `not null`, and add it back as `on delete set null`.

The deployed app always inserts a real user id, so a nullable column does not change that insert. Regenerated types make `started_by` nullable on read. No current TypeScript reads the column. A null appears only after that admin is deleted, which is the case that fails today.

## Files

- `supabase/migrations/20260929210000_audio_job_claim.sql` (new)
- `supabase/tests/audio_jobs_claim.sql` (new)
- `supabase/tests/audio_jobs_claim_concurrency.sh` (new)
- `lib/supabase/database.types.ts` (regenerated, then `pnpm exec oxfmt`)

`supabase/tests/audio_jobs.sql` is not rewritten. It must still pass, because version-1 mirror behavior stays.

## Migration order and rollout

1. Apply locally with `pnpm supabase migration up --local`. Never `supabase db reset`.
2. Apply the same file with `psql -f` (autocommit) against the local database. The file uses `create or replace`, `drop ... if exists`, and one `alter table` for M6, so a replay does not depend on a wrapping transaction. No `lock table`.
3. If the autocommit apply is a replay, insert the version into `supabase_migrations.schema_migrations` only when `migration up` did not already record it.
4. Regenerate types. Run `pnpm check`.
5. Run every file in `supabase/tests/` by hand and say so in the PR: `ai_credits.sql`, `ai_credits_concurrency.sh`, `ai_feature_settings.sql`, `ai_run_guard_concurrency.sh`, `narration_feature_cutover.sql`, `audio_jobs.sql`, plus the two new claim tests.

The app build that is already in production does not call `claim_audio_job` or `audio_job_object_path`. Shipping the function first is safe. 5b must not merge until this migration's deploy run has succeeded.

## Rollback

A follow-up migration drops `claim_audio_job` and `audio_job_object_path`, drops the two new indexes, and restores the mirror and backfill functions without the `hash_version = 1` guard. Restoring M6 (`not null`, `on delete restrict`) is possible only while `started_by` has no nulls. No deployed request path reads these objects.

## Tests

`audio_jobs_claim.sql` (one transaction, rolls back):

- No live row returns one `pending` row, `attempts = 1`, `storage_path` null.
- `ready` with the same hash and version returns empty and does not modify the row.
- `ready` with a different hash, or the same hash and a different version, supersedes the old row (path, `user_id`, and hash kept) and inserts `pending` with `attempts` increased by 1.
- `p_regenerate` true on a matching `ready` row does the same. `p_regenerate` true on a fresh `pending` row returns empty.
- `failed` is reclaimed without the flag, including when the hash matches.
- `pending` younger than 2 minutes returns empty. `pending` older than 2 minutes is reclaimed. The clock column is `requested_at`.
- A story without `p_user_id`, a term with `p_user_id`, an empty hash, and a version below 1 each raise.
- A superseded story row still has its `user_id` and `storage_path`.
- `audio_job_object_path` includes subject type, subject id, version, hash, and job id, starts with `audio/`, and is different for two job ids that share a hash.
- A second row with the same non-null `storage_path` fails the unique index.
- Updating `term_narrations` does not change a live job whose `hash_version` is 2. Updating a version-1 job still mirrors.
- `service_role` can execute `claim_audio_job` and `audio_job_object_path`. `anon` and `authenticated` cannot. The function body does not mention `ai_credit_ledger` or `reserve_ai_credits`.
- Deleting a user who started a `narration_sync_jobs` row succeeds and sets `started_by` to null.

`audio_jobs_claim_concurrency.sh`, same shape as `ai_run_guard_concurrency.sh`: two sessions call `claim_audio_job` for one new subject at the same time. Exactly one returns a row, and exactly one live row exists. A second pair of calls while that pending row is fresh returns no new row.

## Not in this PR

The shared audio route, `getOrCreateAudio`, moving the worker onto `audio_jobs`, uploading to the new path, deleting storage objects, hash v2 call sites, retiring the old sync secret, dropping old tables or cost columns, and `docs/ai.md`. Those are 5b and 5c.

## Review amendments (one plan review, applied; these override the text above)

Reviewed by a fresh read-only pass. These points replace the matching sentences above.

1. **New rows are version 2 or later.** Every insert (no live row, or a reclaim) raises if `p_hash_version < 2`. Passing version 1 is only the ready-match no-op: same hash, same version, `p_regenerate` false, no write. A failed or stale version-1 row is reclaimed only when the caller passes version 2 or later, so the new live row is outside the mirror guard. 5b must pass version 1 only to confirm an existing ready version-1 clip, and version 2 whenever it wants a new job.
2. **M6 is one autocommit-safe statement and replayable.** `alter table ... drop constraint if exists narration_sync_jobs_started_by_fkey, alter column started_by drop not null, add constraint narration_sync_jobs_started_by_fkey ... on delete set null`. A second `psql -f` drops the constraint it just added and adds it again, inside that one statement.
3. **After the lock, lock the live row again.** `select ... for update` on `status <> 'superseded'`, then select that same live row `for update` again. If the row we waited on was superseded, the second lock is the winner's new row, or there is nothing to lock. Nothing may update a row that is already `superseded`. No live row means insert, and `unique_violation` means the other session won: return empty. The reclaim insert does the same. If the supersede update matches no row, return empty and do not insert.
4. **Supersede sets `updated_at = now()`**, same as the delete mirrors, so the orphan index orders by the time the file became eligible for deletion. `storage_path`, `user_id`, hash, and `attempts` on that row stay as they are.
5. **E25 for this function is not `skip locked`.** It is a waiting `for update`, the one-live-row unique index, and `unique_violation` on the insert. `skip locked` stays on `claim_narration_sync_tick` only.
6. **Tests added for the gaps.** After a version-2 claim, a `term_narrations` update does not change the live job. A superseded row keeps its path, and a second live row cannot store that same path. The concurrency script also runs two sessions against one stale `pending` row: exactly one new live row, `attempts` increased once, and one empty return.
