# Phase 4 plan: F14-A expand (audio jobs, dual write, versioned hash, second secret)

Expand only. The request path and the sync worker keep using `term_narrations` and the `stories.narration_*` columns. Phase 5 switches the app to `audio_jobs` (release) and then drops the old columns and tables (contract, needs the user's approval). Two PRs:

- **4a `ai-phase-4a-audio-jobs-migration`**: migration and SQL tests only.
- **4b `ai-phase-4b-audio-app-prep`**: app code that prepares the cutover (second internal secret, cron heartbeat, versioned hash, docs). Merges only after 4a is applied in production.

Edge cases by ID: E5, E6 (deferred to 5, see below), E15, E25, D5, D6, D10, E20, M6, M10, F14.

## 4a: migration `20260929200000_audio_jobs.sql`

1. **`audio_jobs`**: `id uuid pk default gen_random_uuid()`, `subject_type text check in ('term','story')`, `subject_id uuid`, `user_id uuid null` (the story owner; null for terms), `content_hash text not null`, `hash_version smallint not null default 1`, `status text check in ('pending','ready','failed','superseded')`, `attempts integer not null default 0`, `error text null`, `storage_path text null`, `requested_at timestamptz`, `created_at`, `updated_at`. `ready` needs a path (check). **One live job per subject**: unique index on `(subject_type, subject_id)` where `status <> 'superseded'`.
   No foreign key from `subject_id` (it points at `terms` or `stories`). Rows for deleted subjects are cleaned by delete triggers on `terms` and `stories`, which set `status = 'superseded'` and `storage_path` retained so phase 5's sweep can delete the file (E6 storage deletion needs the storage API and is done in phase 5 with the orphan sweep).
2. **Backfill (E15, D5):** every `term_narrations` row and every story with a narration status other than `none` is copied **verbatim**: hash, path, status, `hash_version = 1`. Story rows have no hash today; they get the constant `'story-v1'` and version 1 (stories never change once written). `attempts` starts at 0. Nothing is regenerated.
3. **Dual write (D6): triggers on the old tables**, so the current app build and the cron-kicked worker keep the new table current with no app change:
   - `after insert or update on term_narrations` upserts the live `audio_jobs` row for that term (`hash`, `status`, `path`).
   - `after update of narration_status, narration_path, narration_requested_at on stories` does the same for the story (owner in `user_id`).
   - Both tolerate a row that does not exist yet (insert) and never fail the original write: `security definer`, fixed `search_path`, revoked from `public, anon, authenticated`.
   - A term hash change on the old table supersedes nothing yet: the old row is updated in place, and the mirror updates the same live row (phase 5 introduces new jobs per hash).
4. **`claim_audio_job(p_subject_type, p_subject_id, p_user_id, p_content_hash, p_hash_version)`** (E25): a port of `claim_term_narration`. Only the caller whose upsert lands a fresh `pending` gets a row: `on conflict` on the live-job index, reclaiming `failed`, a `ready` row whose hash **and version** differ, or a `pending` row older than 2 minutes; `attempts` increments on every claim. Not called by the app until phase 5, but tested now, including the two-session race.
5. **Version rule (D5):** a `ready` row with `hash_version = 1` stays valid for as long as the app's v1 hash of the term still equals its stored hash. The claim only reclaims a ready row when `hash` or `hash_version` differs from what the caller passes, and phase 5's caller passes the row's own version when validating an old row. No mass regeneration on deploy.
6. **`ai_worker_status`** `(worker text pk, last_tick_at timestamptz, last_secret text check in ('ai','legacy'))` for the cron heartbeat (D10, E20). Written by the internal route (4b); admins read.
7. **RLS and grants (D2):** RLS on both new tables. `audio_jobs`: `service_role` select/insert/update/delete, admins select. `ai_worker_status`: `service_role` select/insert/update, admins select. No access for `authenticated` users otherwise (M10: the old `term_narrations` policy that exposes every row to allowlisted users stays until phase 5 and is not copied). New functions: `revoke all ... from public, anon, authenticated`, `service_role` execute for `claim_audio_job`.
8. **Dry-run count (report 5.3 item 1):** the PR states, from a query on the local database, how many old rows the backfill copies, and that none is treated as stale (v1 rows stay valid). The real production count is run by the deploy, not by hand; no production access.

Rollback: additive; undo with a follow-up migration dropping the triggers, functions and tables. The old app never reads them.

Tests (SQL, manual, local Docker): backfill copies term and story rows verbatim, no dropped or invented rows; every trigger path (term insert, hash change, status change to failed and ready; story claim, ready, failed; term/story delete supersedes); a failing mirror does not break the old write; live-job uniqueness; `claim_audio_job` semantics table, plus a two-session concurrency script; grants matrix (D2); heartbeat table grants; the ledger untouched.

## 4b: app prep

1. **Second secret (E20, D10):** `AI_INTERNAL_SECRET` is accepted alongside `TELEGRAM_INTERNAL_SECRET` on `/api/internal/narration/sync` (constant-time comparison, M8). The app's own self-kick sends the new secret when set, else the old one. `.env-template` and `docs/supabase/narration-sync-cron.md` describe the switch: set the new secret in Vercel, update the cron job header, then (phase 5) drop the old one. `narration-cron-setup.sql` vault name documented. Telegram and its Edge Functions keep the old secret untouched.
2. **Heartbeat:** every authenticated tick upserts `ai_worker_status` (`narration-sync`, now, which secret matched). The admin narration page shows "last cron tick: N minutes ago, using the legacy/new secret", and a warning when there is none in the last 5 minutes while a job is active or resumable. This is also the signal that says when removing the old secret is safe.
3. **Versioned hash (E3, E4, D5):** `computeContentHash(fields)` stays as version 1 (unchanged output). New `computeContentHashV2(fields, language)` adds the language and a `NARRATION_TEMPLATE_VERSION` (bump it when `template.ts` wording changes). `hash_version` constants live next to them. Nothing calls v2 yet; `knip.json` ignores that file until phase 5 wires it.
4. Docs: `docs/ai.md` (start: features, vendors, access rules, cost levers, generated from the registry) is phase 5 (F15). This PR only updates `docs/supabase/narration-sync-cron.md` and `.env-template`.

Tests: secret auth (either accepted, wrong rejected, both unset 500, constant time path), heartbeat written with the right secret label and failure to write never fails the tick, versioned hash (v1 output identical to today's for a fixed input, v2 differs by language and template version), admin page note.

Not in phase 4: the shared audio route, `getOrCreateAudio`, hash-keyed storage paths, storage deletion and the orphan sweep, dropping old tables and columns, `lib/narration` file cleanup, `docs/ai.md`. All phase 5.

## Review amendments (one plan review, applied; these override the text above)

**4a scope changes**

1. **No `claim_audio_job` in phase 4.** A reclaim-in-place function would encode semantics phase 5 must replace (hash-keyed paths need supersede-then-insert). Phase 5 adds the claim function with the final supersede semantics in its own migration step. The two-session claim test moves with it. Consequently phase 5 becomes several PRs: 5a migration (claim, sweep support), 5b app cutover, 5c contract (needs approval).
2. **Mirrors never break the old write:** each mirror function wraps its body in `begin ... exception when others then raise warning ...; return new; end`. A test injects a failing trigger on `audio_jobs` and proves the old write survives.
3. **Partial index:** every upsert repeats the predicate: `on conflict (subject_type, subject_id) where status <> 'superseded'`.
4. **Order and backfill:** create the table, then the triggers, then run an idempotent `backfill_audio_jobs()` (`on conflict ... do nothing`), so writes made during the migration are mirrored, not lost. Backfill rules: a story `ready` with no path becomes `failed`; a story `pending` with no requested time is backfilled as stale (epoch); term rows copy `updated_at` and `created_at`; stories use `narration_requested_at` (epoch if null) as `requested_at` and `updated_at`; story rows with status `none` are skipped. The table checks `subject_type = 'story'` implies `user_id is not null`. No `set_updated_at` trigger: the mirror sets `updated_at` from the source.
5. **Delete mirroring** hangs off the old narration rows: `after delete on term_narrations` and `after delete on stories` mark the live job `superseded`. A term deleted by a domain cascade removes its `term_narrations` row, which fires the mirror. Audio files and `user_id`/`storage_path` of superseded story jobs survive account deletion until the phase 5 sweep (acknowledged).
6. **Heartbeat table** is keyed `(worker, source)` with `source in ('cron','app')`, each row holding `last_tick_at` and `last_secret`. The self-kick sends a header marking it as the app, so the cron row alone tells whether the cron header still uses the legacy secret.
7. **Grants:** `revoke all on table ... from public, anon, authenticated, service_role`, then explicit grants (`service_role` select/insert/update/delete on `audio_jobs`, select/insert/update on `ai_worker_status`; `authenticated` select with admin-only RLS policies). Mirror and backfill functions are revoked from all API roles.
8. `lib/supabase/database.types.ts` is regenerated and formatted in 4a (CI diffs it).
9. M6 (`narration_sync_jobs.started_by ... on delete restrict`) is out of scope for phase 4; it is listed for phase 5's cleanup.
10. SQL tests are manual (no CI job); the PR says so.

**4b scope changes**

1. **Separate auth function** `authenticateNarrationSyncRequest` accepts either secret; the Telegram authentication function is untouched (the new secret never authenticates Telegram routes). Both candidate secrets are hashed with SHA-256 and compared with `timingSafeEqual`, evaluated without short-circuiting, so unequal lengths cannot throw. "New set, old unset" works (the phase 5 end state); neither set returns 500.
2. `getNarrationSyncSecret()` returns `AI_INTERNAL_SECRET` if set, else the legacy secret; the self-kick uses it and adds the app header.
3. Heartbeat writes are best-effort (a missing table is logged, never fails the tick). The admin page shows the cron row (legacy or new secret, minutes ago) and warns when there is no cron tick in 5 minutes while a job is active.
4. Docs say the cron header is the only value to change; Edge Functions keep the legacy Telegram secret.
5. Tests add: Telegram authentication unchanged, mismatched-length secrets, cron vs app heartbeat source, heartbeat failure not failing the tick.
