# Phase 1 plan: F1-A expand (`lib/ai`, registry, `ai_feature_settings`, ledger generalization)

Branch: `ai-phase-1-ai-module` from up-to-date `main` (after PR 102 merges).
This is the **expand** step only (D1). Deployed code keeps working before, during and after the migration. Nothing is dropped. Quiz and Stories are moved in phase 2.

## Scope

### Migration `20260929170000_ai_feature_settings.sql` (additive)

1. `ai_feature_settings` (one row per feature):
   `feature text pk`, `billable boolean not null`, `enabled boolean not null default false`,
   `access_mode text not null default 'admin' check in ('everyone','allowlist','admin')`,
   `daily_cap integer null check (> 0)`, `credit_cost integer null`, `unit text not null`, `updated_at`.
   Constraints: `unique (feature, billable)` (target of the ledger FK, D3); `billable = (credit_cost is not null)`; cost > 0 when set.
2. `ai_feature_allowlist (feature, user_id)`, pk `(feature, user_id)`, FK to settings and `users` (cascade). Never a global list (E21).
3. Seed rows, preserving today's behavior (E16, E17):
   - `quiz`: billable, enabled, `everyone`, `credit_cost` = `ai_credit_settings.quiz_credits_per_question`, unit `question`.
   - `story`: billable, enabled, `everyone`, cost = `story_credits_per_term`, unit `term`.
   - `term_evaluation`: not billable, enabled, `admin` (matches phase 0), unit `term`.
   - `narration_term`, `narration_story`: not billable, `enabled` copied from `narration_settings.enabled`, `access_mode = 'allowlist'`, `daily_cap` null for term and 20 for story (today's hard-coded cap), unit `clip`. Allowlist rows copied verbatim from `narration_allowlist` into both features.
     Nothing reads the narration rows until phase 3, so a **resync migration at the phase 3 cutover** re-copies the toggle and allowlist to catch changes made in between.
4. One-way sync trigger: an update of `ai_credit_settings.quiz_credits_per_question` / `story_credits_per_term` updates `credit_cost` on the `quiz` / `story` rows. The old admin UI keeps working and the new table never drifts (D1). The old columns and functions stay until the contract step.
5. Ledger generalization:
   - Add `billable boolean not null default true check (billable)`.
   - Drop the `feature in ('quiz','story')` check; add FK `(feature, billable) -> ai_feature_settings (feature, billable)`. Rows with null `feature` (refund/grant/reset) are unaffected (MATCH SIMPLE). Existing `quiz`/`story` rows validate because the seed comes first.
   - `reserve_ai_credits` (same signature and return type, so `create or replace`): raises for a feature that is not billable (D3), returns `disabled` when the feature row is disabled or the credits switch is off (E17: two levers, feature disabled blocks everyone; credits switch blocks only the central key).
6. Run guard (E12/D4): `ai_feature_runs (user_id, feature, started_at, pk (user_id, feature))` with `begin_ai_run(user, feature, ttl_seconds)` (insert, or take over an expired row; returns boolean) and `end_ai_run(user, feature)`. Not an advisory lock, which cannot span the model call. TTL 120 s. Distinct from the `reserve_ai_credits` lock.
7. RLS and grants (D2): revoke all then grant explicitly. `ai_feature_settings`: select to `authenticated` and `service_role`, update to admins (RLS `is_admin()`). Allowlist: admin manage, select to `service_role`. `ai_feature_runs`: `service_role` only (functions security definer).

Rollback of the migration: additive. To undo, ship a follow-up that restores the old check on the ledger and the old `reserve_ai_credits` body, and drops the new tables. Old code is unaffected in the meantime.

### App code (`lib/ai/`), all new and pure

- `registry.ts`: source of truth for features (E19). Each entry: `capability` (`object | text | evaluate | speech`), `billing` (`credits | none`), `vendor`, `sends` (plain-language, for F13 later), `unit`. Exports `FeatureId`, `BillableFeatureId`, `FEATURES`.
- `feature-settings.ts`: repository, `getFeatureSettings(admin, feature)`, `listFeatureSettings`, `isFeatureUsable(row, {userId, isAdmin, onAllowlist})` for policy: enabled, `access_mode`, allowlist.
- `run-metered.ts`: `runMetered({feature, cost, ...}, run)`, a generalization of `runWithCredits`. Adds the run guard (`begin_ai_run`, released in `finally`). `lib/ai-credits/charge.ts` becomes a thin re-export so callers and tests keep working; the quiz and story actions switch to `runMetered` (behavior identical, plus the double-click guard). The narration paths never import it (F3, E18).
- `CreditFeature` becomes `BillableFeatureId` from the registry.
- `docs/ai.md` skeleton is deferred to phase 5 (F15); this phase updates `docs/ai-credits.md` only where the flow changes (run guard, feature rows).

`isFeatureUsable`/allowlist reading is wired into the quiz and story actions in phase 2. To keep knip green until then, `knip.json` gets a temporary `ignore` entry for `lib/ai/feature-settings.ts` with a note; phase 2 removes it.

## Files

`supabase/migrations/20260929170000_ai_feature_settings.sql`, `supabase/tests/ai_feature_settings.sql`, `lib/ai/{registry,feature-settings,run-metered}.ts` (+tests), `lib/ai-credits/{charge,types,repository}.ts`, quiz and story actions (call sites), `lib/supabase/database.types.ts` (regenerated, CI checks it), `knip.json`, `docs/ai-credits.md`.

## Migration order and rollout

1. Merge (CI `supabase-migrations` applies it to a local DB and diffs types).
2. `deploy-migrations.yml` applies to production on merge. Old app build still running: unaffected, since the old `reserve_ai_credits` behavior is a subset (features `quiz` and `story` exist and are enabled).
3. New app build deploys. It calls the same RPCs plus `begin_ai_run`/`end_ai_run`. The new build needs the migration first (`begin_ai_run` must exist). The existing workflow applies migrations on merge, before or alongside the Vercel deploy; to be safe against that race, `runMetered` treats a missing-function error (`PGRST202`) from `begin_ai_run` as "no guard" and logs it.
4. No contract step here. The contract (drop `quiz_credits_per_question`, `story_credits_per_term` and the old function shapes) waits until phase 2 has shipped and is included in the phase 5 cleanup, which needs the user's approval.

Never applied by hand to production.

## Tests

- `supabase/tests/ai_feature_settings.sql` (rolls back, like `ai_credits.sql`):
  - exact set of seeded features equals the registry list (E19, with a vitest counterpart reading the migration file);
  - narration toggle and allowlist copy equal the old values (E16); a fresh feature row defaults to disabled and `admin`;
  - narration features cannot be reserved: `reserve_ai_credits(…, 'narration_term', 1)` raises, and a direct ledger insert with a non-billable feature fails the FK (E18, D3);
  - disabled feature row makes reserve return `disabled`; credits switch off does not depend on the feature switch (E17);
  - cost sync trigger updates the feature rows;
  - run guard: second `begin_ai_run` while running returns false, succeeds after TTL, and after `end_ai_run` (E12);
  - grants for `ai_feature_settings`, `ai_feature_allowlist`, `ai_feature_runs` for `service_role`/`authenticated` (D2);
  - allowlist is per feature (E21).
  - The existing `ai_credits.sql` and `ai_credits_concurrency.sh` still pass unchanged.
- Vitest: registry integrity (billable features have a unit, narration is `billing: none`); `runMetered` charges, refunds on throw, releases the guard on success and failure, refuses when the guard is taken; a test that no file under `lib/narration` or `lib/stories/narration.ts` imports `runMetered` or the credits repository (E18).
- `pnpm check`, full `pnpm vitest run`, and the SQL test against local Supabase (Docker).

## Edge cases covered

D1, D2, D3, D4, E12 (credits path only; the own-key path is covered in phase 2), E16 (seed; resync in phase 3), E17, E18, E19, E21. D7 (model id allowlist) and F9 wait for phase 2, where the column is first used. E9 and E14 (key health) land in phase 2.

## Review amendments (one plan review, applied; these override the text above)

1. **Real deploy order:** `deploy-migrations.yml` runs after CI succeeds on main, so the app build can reach production before the migration. Therefore **phase 1 changes no call sites.** The quiz and story actions, `charge.ts`, `CreditFeature` and `repository.ts` stay untouched, so a phase 1 app build is safe against the old database. `lib/ai/` is new, unwired code; `knip.json` gets a temporary `ignore` for `lib/ai/**` (removed in phase 2). Phase 2 must not merge until the phase 1 migration is confirmed applied to production by the deploy workflow. The `PGRST202` fallback is dropped.
2. **Run guard SQL:** `begin_ai_run(user, feature, ttl_seconds)` is one statement (`insert ... on conflict (user_id, feature) do update set token = new, started_at = now() where ai_feature_runs.started_at < now() - ttl`) and returns the new `token uuid`, or null when busy. `end_ai_run(user, feature, token)` deletes only a matching token, so a slow run cannot release a newer holder's guard. A killed function leaves the guard until the 120 s TTL (documented). In `runMetered` the guard is taken **before** `reserve_ai_credits`, so a refused double-click never charges. `runMetered` returns a third outcome `busy`; wiring it into the actions (and `creditsRefusedFailure`) is phase 2.
3. **Grants and RLS:** `enable row level security` on all three new tables (CI rejects tables without it). `ai_feature_runs`: no policy, `revoke all`, `service_role` gets select/insert/update/delete. New functions: `revoke all ... from public, anon, authenticated`, `grant execute ... to service_role`. `ai_feature_settings`: authenticated gets `select` and **column-level `update (enabled, access_mode, daily_cap)`** only; `credit_cost`, `billable`, `unit` are trigger/migration-owned. Allowlist: admin manage, `service_role` select.
4. **Cost-sync trigger:** `security definer`, `set search_path = public`, `after update of quiz_credits_per_question, story_credits_per_term`.
5. **Ledger:** seed first, then drop `ai_credit_ledger_feature_check` (`if exists`), add `billable`, then the FK. Add a test that `refund_ai_credits` still works after the FK.
6. **`reserve_ai_credits`:** raises for an unknown or non-billable feature; returns `disabled` when the feature row is disabled or credits are off. The `disabled` copy in `repository.ts` ("credits are off") is wrong for a feature switch until phase 2; nothing can trigger it in phase 1 because both rows are enabled. E17 is only half enforced here (own-key path is phase 2), and the plan no longer claims otherwise.
7. **Semantics to fix now:** `daily_cap` is a **rolling 24 hours** counted per (user, feature), matching today's story cap. `isFeatureUsable` gives admins access like the old `narration_allowlist` RLS did. The seed reads `narration_settings` with `where id`.
8. **Tests:** SQL tests are **manual** (no CI job runs `supabase/tests/`); run locally against Docker Supabase and say so in the PR. Added cases: concurrent `begin_ai_run` (extension of the shell test), token mismatch, unknown feature reserve, trigger fired by an `authenticated` admin, exact `has_table_privilege` matrix, and a vitest that greps `lib/narration` and `lib/stories/narration.ts` for `reserve_ai_credits`, `ai_credit_ledger`, `runMetered`, `ai-credits`.
9. `unique (feature, billable)` is documented as the FK target. `database.types.ts` is regenerated and formatted with `oxfmt`.
