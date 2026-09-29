# Handoff: AI redesign, continue from Phase 5

Written 2026-09-29 by the agent that did phases 0 to 4. Read this first, then `report.md` (the source of truth, with a Status list at the top) and the per-phase plans `report-plan-phase-N.md` (each ends with the review amendments that override the text above them). The goal prompt to paste is in [goal-prompt-phase-5.md](goal-prompt-phase-5.md).

## Where things stand

| Phase | What                                                                                                                                                | PR   | Merged commit |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------- |
| 0     | Cheap fixes (narration GET no longer generates, admin-only term evaluation, error masking, `maxDuration`, `AI_GATEWAY_API_KEY` in the env template) | #102 | 6a92d17       |
| 1     | `lib/ai` module, `ai_feature_settings`, per-feature allowlist, billable ledger rule, run guard (`begin_ai_run`)                                     | #103 | 7197a72       |
| 2     | Quiz and Stories on `resolveAiAccess`, run guard on both key paths, admin Features card                                                             | #104 | 7590332       |
| 3a    | Narration cutover migration (`has_feature_access`, old-to-new triggers, `ai_usage_events`)                                                          | #105 | 7421a8e       |
| 3b    | Narration access, switch, allowlist and worker E7 cancel on the feature tables                                                                      | #106 | 93b7932       |
| 3c    | Usage log, per-person caps from settings                                                                                                            | #107 | a06d8dc       |
| 4a    | `audio_jobs` table, mirror triggers, repairable backfill, `ai_worker_status`                                                                        | #108 | 4357a98       |
| 4b    | `AI_INTERNAL_SECRET` accepted next to the old one, cron heartbeat, versioned hash v2                                                                | #109 | 19871ab       |

Phase 4 is an **expand** step: the app still reads and writes the old places (`term_narrations`, `stories.narration_*`), and triggers keep `audio_jobs` in step. **Phase 5 is what is left**: cutover and cleanup (F14-A). It contains a destructive contract step that needs the user's approval.

### Check first (before starting)

1. `git log --oneline origin/main -12`: #109 (`19871ab`) and #108 (`4357a98`) are merged. This handoff itself ships in a small docs PR after them.
2. `gh run list --branch main --limit 6`: the "Deploy Supabase migrations" run for `4357a98` (the `audio_jobs` migration) **succeeded at 2026-09-29 11:22 UTC**. Its CI had failed once on the Supabase 502 flake and was re-run; that first deploy was skipped, the second ran. Re-check it still shows success before relying on `audio_jobs` in production.
3. Read the Status list at the top of `report.md`. Phase 5 is "not started".
4. The two env vars are not set anywhere by the agent; the cron job still uses the old Telegram secret (the admin Narration page shows it once the route has been called).

## How the work is done (the loop that was used, keep it)

Per phase or sub-phase: (1) write `report-plan-phase-N.md` (scope, files, migration order, rollback, tests, edge-case IDs from `report.md` sections 5 and 6); (2) one fresh read-only subagent reviews the plan, apply valid findings, one review only; (3) implement on `ai-phase-N-<slug>` from up-to-date `main`, with tests, run `pnpm check`; (4) open a PR (changes, rollout, rollback, tests); (5) one fresh subagent reviews the PR, fix valid findings, no second review; (6) enable the CI monitor with `mcp__ccd_pr__set_monitor` (auto_fix on), merge only when every check is green, never poll CI with loops, never bypass checks, never force-push main, never enable auto-merge; (7) add a Status line to `report.md`, report in under 10 lines, start the next.

Rules from the user: migrations stay compatible with the deployed code (expand, release, contract); never touch production Supabase; narration never uses credits or the ledger; ask before merging the destructive phase 5 contract; stop and ask if a decision is missing or a reviewer finds a blocking design problem; after two failed fixes of one failure, stop and report. Commit and PR attribution lines are in the system reminder (Co-Authored-By for commits, "Generated with Claude Code" for PR bodies). Use `gh pr merge N --squash --delete-branch` (the repo squashes).

## Hard-won facts (each one cost time)

- **Deploy order is app first, migration after.** Vercel deploys on merge; `deploy-migrations.yml` runs only after CI succeeds on `main` (`workflow_run`). So a new app build must work against the _old_ schema, and an app PR that needs a new migration must not merge until the "Deploy Supabase migrations" run for the migration's commit has succeeded. This is why phases 3 and 4 were split into a migration PR followed by an app PR.
- **The `supabase-migrations` CI job flakes.** It ends with `Error status 502: An invalid response was received from the upstream server` right after "Restarting containers", with every migration already applied. It hit #103 twice and main once. A failed-job re-run (`gh run rerun <id> --failed`) is fine; if the same job fails twice on one PR, stop and ask (the user chose "re-run once more" once). Do not confuse it with a real error: read `gh run view <id> --log-failed`.
- **`db reset` runs migrations outside a transaction.** A `LOCK TABLE` in #105 passed `supabase migration up` locally and failed in CI. Always also apply the migration file with `psql -f` (autocommit) before pushing. Prefer `create or replace` and `drop ... if exists` so a file can be replayed.
- **Local database.** Docker Supabase is running at `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. Apply new migrations with `pnpm supabase migration up --local`. Never run `supabase db reset` without asking: it wipes the user's local dev data. If you re-apply a migration by hand, also insert its row in `supabase_migrations.schema_migrations`. Regenerate types with `pnpm supabase:types` then `pnpm exec oxfmt lib/supabase/database.types.ts` (CI diffs the file).
- **SQL tests are manual** (`supabase/tests/*.sql`, `*.sh`); no CI job runs them. Run every one before a migration PR and say so in the PR: `ai_credits.sql`, `ai_credits_concurrency.sh`, `ai_feature_settings.sql`, `ai_run_guard_concurrency.sh`, `narration_feature_cutover.sql`, `audio_jobs.sql`.
- **Formatter is oxfmt, not prettier.** `pnpm fmt`, then `pnpm check` (lint, format check, tsc, knip). Complexity limit 14 per function (oxlint). Knip flags unused exports: files ignored on purpose right now are listed under "Cleanup debt".
- **Supabase grants:** new tables get default privileges for `anon` and `authenticated`. Always `revoke all ... from public, anon, authenticated, service_role` and grant explicitly (service_role has no default access on tables that were revoked). New security-definer functions: pin `search_path`, revoke from `public, anon, authenticated`, grant execute to `service_role` only when the app calls them.
- **Clients:** `has_feature_access` is executable by `service_role` only, so its callers pass the admin client. `ai_feature_settings` updates (column grant on `enabled, access_mode, daily_cap`) and allowlist writes go through the signed-in admin's own client (RLS), not the service role.
- **Vercel bot comments and stale CI events** arrive as "review comments" on merged PRs; they need no action. The CI monitor is enabled per PR (`set_monitor` with the PR url).
- The stop hook re-fires until the goal holds; when blocked on the user, use `AskUserQuestion` instead of ending the turn repeatedly.

## What Phase 5 must do (F14-A, from `report.md` plus the amendments in `report-plan-phase-4.md`)

Split into three PRs, in this order. Each needs its own plan and reviews.

**5a: migration (expand, additive)**

- `claim_audio_job(...)` with the final semantics: supersede the live job and insert a new one atomically (plpgsql or CTE), reclaiming `failed`, a `ready` job whose hash or `hash_version` differs, or a `pending` job older than 2 minutes; `attempts` increment; race-safe (E25, keep `for update skip locked`-style safety used by `claim_narration_sync_tick`). Add a two-session concurrency script like `ai_run_guard_concurrency.sh`.
- Storage paths that include the content hash and are never overwritten (E5); paths of `hash_version = 1` rows are kept verbatim. Version rule (D5): a v1 row stays valid while the app's v1 hash of the term equals its stored hash; new jobs use v2 (`computeContentHashV2`, in `lib/narration/content-hash-v2.ts`).
- Admin "regenerate" path (a ready job with an equal hash is not reclaimable today).
- Support for the orphan sweep (superseded jobs keep `storage_path`; story rows keep `user_id`).
- M6: `narration_sync_jobs.started_by ... on delete restrict` blocks deleting an admin who started a sync.

**5b: app cutover (release)**

- `lib/ai/speech/` with `getOrCreateAudio(subject)` (terms and stories differ only in script and subject key), the ElevenLabs client and voice map moved behind it as the speech adapter (the `nl` voice TODO moves there), storage upload/download included. Replaces `lib/narration/service.ts` and `lib/stories/narration.ts`.
- One shared audio route handler for terms and stories (ETag, Range, headers, the F3 feature row, per-subject authorization (F5; terms are done in #102, stories already check ownership)), explicit `maxDuration` (E2), missing-file handling (E1: mark the job failed, regenerate once; the term route already returns 404 and marks `failed`).
- The sync worker and `narration_sync_jobs` enqueue and read `audio_jobs`; the lease logic stays (E25). E7 is done; keep it.
- E6: delete audio files when a job is superseded or its subject/user is deleted, plus an orphan sweep.
- Wire hash v2 (remove the knip ignore for `lib/narration/content-hash-v2.ts`).
- Retire the old secret from the narration route only after the admin Narration page says the cron job uses the AI secret. Never remove `TELEGRAM_INTERNAL_SECRET` itself (Telegram still uses it).
- Stop reading `narration_settings`, `narration_allowlist`, `term_narrations`, `stories.narration_*`.

**5c: contract (destructive, ask the user before merging)**

- Drop `term_narrations`, `stories.narration_status/narration_path/narration_requested_at` (and their index/check), `narration_settings`, `narration_allowlist`, the mirror triggers/functions (`mirror_*`, `backfill_audio_jobs`, `sync_narration_features_from_old_tables`), and re-point or drop `has_narration_access` and the `term_narrations` RLS policies (M10).
- D1 contract: costs still come from `ai_credit_settings.quiz_credits_per_question` and `story_credits_per_term` via `my_ai_credit_state`, and a trigger copies them to `ai_feature_settings.credit_cost`. To drop the old columns, first move charging and the setup screens to the feature rows (changes `AiAccess`/`AiAccessView`, `lib/quiz/credit-use.ts`, `lib/stories/credit-fit.ts`, the notices components), then a migration recreates `ai_credit_balance` / `my_ai_credit_state` / `admin_ai_credit_summary` without them. Do this in an expand, release, contract order of its own.
- Docs (F15): `docs/ai.md` as the single map (features, vendors, access rules, cost levers, generated from `lib/ai/registry.ts`), linked from `AGENTS.md`; update `docs/ai-credits.md`; narration and worker docs; delete leftover files in `lib/narration/` (knip will point at them).
- Tests: route tests for the shared audio handler (missing file, unauthorized subject, disabled feature, range, 304), worker tests, the F15 access-ordering tests ("a failing own key never falls back to credits" has a resolver test already).

## Decisions still open (ask the user; do not guess)

- **F4 remainder:** story narration `GET /api/stories/[storyId]/narration` still generates on GET (term narration was fixed in #102). F14-A's shared handler forces a decision: keep generate-on-GET for stories, or move to explicit "prepare" like terms.
- **E10:** "use credits this time" as a per-request choice instead of deleting the saved key. Not built.
- **Setup screens** do not show a switched-off feature or an unreadable saved key ahead of Generate (`getAiAccessView` ignores the feature row); the message appears after Generate.
- **F13** (disclosure of what leaves the app), **E8** (batch sync on private collections), **F10/F11/F12** (settled_at sweep, key table, key handling), **F9** (per-feature models) and **F6/F7** (dropped) are undecided or dropped: not in scope.
- A single "AI hub" admin page was not built; the narration page and the AI credits page are still separate tabs.

## Accepted gaps from earlier phases (do not silently "fix")

`added_by` of narration allowlist entries is no longer recorded; the term player treats a 429 (cap or busy) as a silent failure; story cap race M9 (parallel requests for different stories can exceed the cap) not fixed; admin 24 h usage counts provider calls while the enforced story cap counts stories; if the settings table is missing, requests fail open (only for that specific error); a killed provider call is never recorded; the guard TTL is 70 s (quiz has `maxDuration = 60`); admin caps save term then story (not atomic); the narration admin switch drives both features and shows on only when both are.

## Cleanup debt (things left on purpose for phase 5)

- `knip.json` ignore: `lib/narration/content-hash-v2.ts` (wired in 5b).
- Old narration tables and triggers (5c); `has_narration_access` (kept for the RLS policy until then).
- The trigger `ai_credit_settings_sync_feature_costs` and the old cost columns (D1 contract).
- `narration_settings` / `narration_allowlist` are written only by the previous app build now; nothing reads them.
- `lib/narration/*` files superseded by `lib/ai/speech/`.

## Map of what was built

- `lib/ai/`: `registry.ts` (features), `feature-settings.ts` (policy), `run-guard.ts` and `run-metered.ts` (guard, credits), `usage.ts` (usage log and 24 h counts), `health.ts` (env checks per feature), `schema-missing.ts`.
- `lib/llm/access.ts`: `resolveAiAccess(client, admin, userId, feature)`, `getAiAccessView`; `lib/ai-credits/*`: charge, costs, messages (`busyFailure`, `noAiFailure`, `creditsRefusedFailure`).
- Narration: `lib/narration/{access,feature,service,storage,eleven-labs,sync,sync-worker,sync-auth,worker-status,content-hash,content-hash-v2,template}.ts`, `lib/stories/narration.ts`, routes `app/api/narration/[termId]/route.ts` (GET cached only, POST generate under the guard with the cap), `app/api/stories/[storyId]/narration/route.ts`, `app/api/internal/narration/sync/route.ts`, admin `app/(private)/admin/narration/*` and `components/jargon/admin/admin-narration-*.tsx`.
- Migrations (all under `supabase/migrations/`): `20260929170000_ai_feature_settings.sql`, `20260929180000_narration_feature_cutover.sql`, `20260929200000_audio_jobs.sql`.
- Tests: `lib/ai/*.test.ts`, `lib/narration/*.test.ts`, `app/api/narration/[termId]/route.test.ts`, `app/(private)/admin/**/actions.test.ts`, `app/(private)/jargon/quiz/actions.test.ts`, `lib/ai/narration-isolation.test.ts` (proves narration source never mentions credits, the ledger or `runMetered`), SQL tests listed above.

## Environment and operations

- New env vars: `AI_GATEWAY_API_KEY` (term evaluation, admin only), `AI_INTERNAL_SECRET` (narration sync route; optional until the cron header is switched, see `docs/supabase/narration-sync-cron.md`). Nothing was set in production by the agent.
- Operational to-dos that only the user can do: set `AI_INTERNAL_SECRET` on Vercel with a value different from the Telegram secret, change the Supabase Dashboard cron header, then read the admin Narration page.
- No browser run of Quiz, Stories or narration was possible (needs live provider keys and storage); every phase says so in its PR. If keys become available, do one manual pass on quiz, story, narration play/prepare, the admin switches and caps.
- Memory notes in `/Users/behnam/.claude/projects/-Users-behnam-projects-jargon-gym/memory/` were not changed.
