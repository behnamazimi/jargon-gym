# Phase 5c plan: cost move, contract and docs

Three PRs in this order. The app deploys before migrations, so each app PR waits for the deploy run of the migration it needs.

## 5c-1: expand migration for the cost move (`ai-phase-5c-cost-expand`)

Why: costs still live in `ai_credit_settings.quiz_credits_per_question` / `story_credits_per_term`; a trigger copies them to `ai_feature_settings.credit_cost`. The admin page and `my_ai_credit_state` read the old columns. To drop the old columns, charging and the setup screens must read the feature rows, and the admin must be able to write them.

- `grant update (credit_cost) on public.ai_feature_settings to authenticated` (the admin-only RLS update policy and the `billable = (credit_cost is not null)` and 1 to 1000 checks still apply).
- Two-way sync so a rolled-back build (which still reads and writes the old columns) stays correct until the contract:
  - `sync_ai_feature_costs()` (old to feature) gets an `is distinct from` guard in its `where`.
  - New `sync_ai_credit_settings_costs()` (feature to old): `after update of credit_cost on ai_feature_settings`, sets the matching column of `ai_credit_settings` (`quiz` to `quiz_credits_per_question`, `story` to `story_credits_per_term`) `where ... is distinct from new.credit_cost`. An update that changes nothing matches no row, so the two triggers cannot loop.
  - Both `security definer`, `search_path = public`, revoked from all API roles.
- Rollback: drop the new trigger and function, `revoke update (credit_cost)`, restore the old function body.
- Test `supabase/tests/ai_cost_sync.sql`: a feature-row update reaches `ai_credit_settings`; an old-column update reaches the feature row; neither loops; an admin (not a plain user) may update `credit_cost` through RLS; the check constraints still hold.
- Regenerate `database.types.ts` if it changes.

## 5c-2: app release (`ai-phase-5c-cost-app`)

Merges only after 5c-1's deploy run has succeeded.

- `getMyCreditState` keeps `my_ai_credit_state` for `enabled`, `total`, `remaining` and reads costs from `ai_feature_settings` (`quiz`, `story` rows, `credit_cost`), so charging (`quizCost`, `storyCost`), the setup screens and the notices use the feature rows. A missing or null cost row is an error (fail closed, no charge at a guessed price): the call throws and the existing "couldn't check credits" handling applies.
- Admin: `getAiCreditSettingsForAdmin` reads costs from the feature rows; `saveAiCreditSettings` writes allowance and refill to `ai_credit_settings` and the two costs to `ai_feature_settings` through the admin's own client (two updates, not atomic, same as the caps).
- Remove the story `?prepare` probe from the GET route (kept one release in 5b).
- No behaviour change for users. Tests: repository (costs from feature rows, failure when a row is missing), admin read/save, the story route without the probe.

## 5c-3: contract (`ai-phase-5c-contract`) DESTRUCTIVE, the user approves before merge

Merges only after 5c-2 is live and its deploy is done. Nothing in the deployed app reads any of these objects (grep-clean since 5b; 5c-2 removes the cost reads).

Old narration:

- Triggers `term_narrations_mirror`, `term_narrations_mirror_delete`, `stories_narration_mirror`, `stories_narration_mirror_delete`, `narration_settings_mirror`, `narration_allowlist_mirror_insert/update/delete`.
- Functions `mirror_term_narration`, `mirror_term_narration_delete`, `mirror_story_narration`, `mirror_story_narration_delete`, `mirror_narration_settings`, `mirror_narration_allowlist_insert/update/delete`, `backfill_audio_jobs`, `sync_narration_features_from_old_tables`, `claim_term_narration`, `has_narration_access`.
- Tables `term_narrations` (its RLS policy goes with it: M10 solved), `narration_settings`, `narration_allowlist`.
- `stories` columns `narration_status`, `narration_path`, `narration_requested_at`, the check `stories_narration_status_check` and the index `stories_user_narration_requested_idx`.
- The storage bucket is not touched. The clips stay; `audio_jobs` owns them.

Old costs:

- Drop the triggers `ai_credit_settings_sync_feature_costs` and the new reverse trigger, and their functions.
- Recreate `ai_credit_balance(uuid)` and `my_ai_credit_state()` without the two cost columns (drop and create, since the return type changes) and `admin_ai_credit_summary()` reading the cheapest cost from `ai_feature_settings`.
- Drop `ai_credit_settings.quiz_credits_per_question` and `story_credits_per_term`.

Expected row counts to show the user before merging: `term_narrations`, `stories` with `narration_status <> 'none'`, `narration_settings`, `narration_allowlist` (all to be dropped), `audio_jobs` (must be complete), and a check that every non-`none` story and every `term_narrations` row has a matching `audio_jobs` row (nothing valuable exists only in the old tables).

Rollback is not possible for the data in the dropped tables. Restore from backup if ever needed. The clips and `audio_jobs` are untouched.

Also in 5c-3:

- `docs/ai.md`: the single map (features, vendors, access rules, cost levers, where each lives), linked from `AGENTS.md`; `docs/ai-credits.md` updated (costs on feature rows); narration worker docs and `docs/supabase/narration-sync-cron.md` if they name removed objects; `handoff.md` cleanup debt list marked done.
- `lib/narration/` needs no file deletions (knip is clean; what remains is the template, hash, access, sync and worker code). The old-secret fallback stays until the user confirms the cron job moved.

## Edge cases and risks

- Rolled-back build after 5c-1/5c-2: old columns are kept in step by the reverse trigger.
- `credit_cost` is null for a billable row is prevented by the table check, so a null read is an error path only.
- A partial save of the two costs (first update succeeds, second fails) leaves one new price. Accepted, same as the caps; the admin sees the error and retries.
- The contract drops `has_narration_access`; no RLS policy or function may use it afterwards (checked by the migration failing at drop time if one does).

## Amendments (plan review applied; the user chose one PR for all of 5c)

The three steps ship as one PR with one migration, `20260930100000_ai_contract.sql`. Consequences and review fixes:

- No reverse cost trigger: it would only exist to protect a rolled-back build between PRs. Instead the migration grants `update (credit_cost)` and drops the old columns together. The app (which deploys first) reads prices from the feature rows, which already exist and are current, so only an admin saving prices in the short window before the migration runs could fail.
- The migration starts with a guard that aborts (no drops) if any `term_narrations` row or non-`none` story lacks an `audio_jobs` row.
- Drop order: `claim_term_narration` (its return type is the table), then the three tables (removing their triggers, indexes and the policy), the two `stories` triggers, the mirror/backfill/sync functions and `has_narration_access`, then the `stories` index, check and columns. No `cascade`.
- `ai_credit_balance` and `my_ai_credit_state` are dropped and recreated with three columns and their original grants (balance: service_role only; state: authenticated). `admin_ai_credit_summary` is `create or replace` (same return type, keeps grants) and takes the cheapest price from billable feature rows, defaulting to 1.
- `admin_ai_credit_usage` and `reserve_ai_credits` read only `enabled`/`remaining` and are unchanged.
- Old SQL tests were rewritten (`audio_jobs.sql`, `audio_jobs_claim.sql`, `ai_narration_features.sql` replacing `narration_feature_cutover.sql`, `ai_feature_settings.sql`, `ai_credits.sql`) and `ai_contract.sql` added. `database.types.ts` regenerated.
- After the contract, rolling the app back past this release is not supported (charging and the admin page read the dropped objects' replacements only).
- A fresh `db reset` replays the earlier migrations that create the old objects, then this one drops them.
