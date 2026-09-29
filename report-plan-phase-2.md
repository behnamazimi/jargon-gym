# Phase 2 plan: move Quiz and Stories onto `lib/ai`

Branch: `ai-phase-2-quiz-stories` from up-to-date `main`. **Gate:** the phase 1 migration (`20260929170000_ai_feature_settings.sql`) must be confirmed applied in production by `deploy-migrations.yml` before this PR merges, because the new build calls `begin_ai_run`/`end_ai_run` and reads `ai_feature_settings`. No migration in this phase.

## Scope

1. **`lib/ai/access.ts` `resolveAccess(feature, user)`** (F1-A): one call that returns who pays and whether the feature may be used.
   - Reads the feature row (`getFeatureSettings`) and the allowlist/admin state, applies `checkFeaturePolicy`. Feature off or not allowed returns `unavailable` with reason `feature-off` (E17: this blocks own-key users too; the credits switch still blocks only the central key).
   - Then the existing order: own key, else credits, else unavailable. A saved key that cannot be decrypted (E9) is treated as "no usable own key": logged, never shown raw, falls through to credits/unavailable.
   - Credit costs come from the feature rows (`credit_cost`), not the old `quiz_credits_per_question` / `story_credits_per_term` columns. The balance still comes from `my_ai_credit_state` (its old cost columns are ignored). This lets the contract step drop the old columns later.
   - `lib/llm/access.ts` keeps the key/credits mechanics (folded into `lib/ai/access.ts`, no circular imports: F11 cycle removed for these modules).
2. **`runMetered` wired in** for the credits path in both actions (replacing `runWithCredits`), plus the same run guard on the own-key path (E12 for both): `withRunGuard(admin, userId, feature, run)`. A refused guard returns a `busy` failure ("Already generating, wait a moment"). `creditsRefusedFailure` / `noAiFailure` get the new outcomes (`busy`, `feature-off`).
3. **Admin: Features card on `/admin/ai-credits`** (E17, F1): per-feature switch (`enabled`) for `quiz` and `story` with a one-line health note (E14: central key configured or not). Backed by an admin action that updates only `enabled` (column grant allows it). Access mode and cap editing wait for phase 3, where narration needs them.
4. **`lib/ai/health.ts`** `featureHealth(feature)` (pure, env based): reports a missing key/config for each registry feature. Used by the card.
5. Remove the `lib/ai/**` knip ignore. Delete `runWithCredits` re-export usage if unused; keep `charge.ts` as the implementation `runMetered` wraps.
6. Docs: `docs/ai-credits.md` updated (feature rows are now read; guard in use).

Not in this phase: per-feature model ids (F9/D7, undecided), "use credits this time" per-request choice (E10, needs UI decisions), dropping old cost columns (contract, phase 5 with approval), term evaluation moving onto the wrapper (it is admin-only and unbilled; it gets its feature row check in phase 3 with narration).

## Files

`lib/ai/{access,health,run-guard}.ts` (+tests), `lib/llm/access.ts` (moved/re-exported), `lib/ai-credits/{messages,repository}.ts`, `app/(private)/jargon/quiz/actions.ts`, `app/(private)/jargon/read/stories/actions.ts`, `app/(private)/admin/ai-credits/{page.tsx,actions.ts}`, a Features card component, `knip.json`, `docs/ai-credits.md`.

## Rollout / rollback

App-only release once the migration is live. If the feature rows were missing (migration not applied) `resolveAccess` would throw; the actions already mask errors (phase 0), so users see a generic failure, not a crash. Rollback: revert the PR; the schema is untouched and old code still works with it.

## Tests

- `resolveAccess`: feature off blocks own-key and credits; allowlist/admin modes; own key wins; a failing own key never falls to credits (docs promise); undecryptable key (E9) falls to credits with no raw message; credits switch off blocks only the central key (E17); exhausted balance.
- Actions: double-submit refused without a charge (E12) for both own-key and credits paths; quiz and story error masking (F8); busy/feature-off copy.
- Admin action: only admins; updates only `enabled`.
- `featureHealth` per feature.
- Narration isolation test still green. `pnpm check`, full vitest, and local run of the Quiz/Stories path in the browser against local Supabase if a central key is available (otherwise state that it was not exercised).

## Edge cases

E9, E12 (both paths), E14 (env-key health), E17, F8 (already partly done in phase 0), F11 (cycle removed for the moved modules), D4.

## Review amendments (one plan review, applied; these override the text above)

1. **Guard helper first.** `lib/ai/run-guard.ts` gets a guard-only `withRunGuard(admin, userId, feature, run)` (begin, run, token-matched end in `finally`). `runMetered` is refactored to use it. Quiz and Stories wrap it around their own-key branch. The guard is taken immediately around the produce step, after all early returns (not-enough-terms, prefs), so an early return cannot leak it.
2. **Fail open on infrastructure errors.** App can deploy before the migration lands. If `begin_ai_run` returns an RPC error, log and run unguarded (a null token, meaning "busy", still refuses). If reading the feature row errors, log and fall back to the built-in default (enabled, everyone) for `quiz` and `story`; a missing row means feature off. The merge gate stays.
3. **Guard TTL 70 s** (max duration 60 s plus margin). "Busy" copy: "You already have one running. Give it a minute and try again."
4. **Costs stay on the old columns for now.** `access.costs` and the setup screens keep reading `my_ai_credit_state` (the sync trigger keeps the feature rows equal). Moving display and charging to the feature rows changes `AiAccess`/`AiAccessView` and every consumer, so it moves to the contract step (phase 5 cleanup, with approval). Not done here, stated in the PR.
5. **E9 without a silent fallback.** Only a decrypt failure is caught in `getDecryptedApiKey`; a database error still throws. `resolveAiAccess` returns `unavailable` with reason `key-unreadable` (never credits), and the message asks the user to re-enter the key in Settings. Setup screens still say "own key" until the user does; documented.
6. **Feature policy stays in `lib/llm/access.ts`.** No file move (no cycle was shown). `resolveAiAccess` gains the feature argument and applies `checkFeaturePolicy`; allowlist is read only when the mode needs it, admin via the cached `getUserIsAdmin`. `CreditFeature` becomes `BillableFeatureId`.
7. **UI for new outcomes.** `AiFailureReason` gains `busy` and `feature-off`; neither shows the "Check settings" link. `busy` and `feature-off` get their own message helpers; `creditsRefusedFailure` keeps only `insufficient`/`disabled`. `noAiFailure` handles `key-unreadable` and `feature-off`.
8. **Admin Features card** uses the user-scoped admin client (service role has no update on `ai_feature_settings`), a zod enum of `quiz`/`story`, updates `enabled` only, and asserts one row changed. Copy explains: this switch blocks everyone including own-key users; the credits switch blocks only the app's key; the health note applies to credits users only.
9. **Setup screens** do not learn about a switched-off feature; the failure appears on Generate. Deferred, noted in the PR.
10. **E12 honesty.** The guard catches multi-tab and direct duplicate requests; same-tab clicks are already serialized by Next. Docs say so.
11. **Tests added:** `withRunGuard` (release on throw and success, busy, fail-open on RPC error), `resolveAiAccess` (feature off blocks own key and admin; allowlist; admin mode; missing row; own key wins and a failing own key never falls to credits; undecryptable key; DB read error is not swallowed), failure copy for `busy`/`feature-off`/`key-unreadable`, admin action (only quiz/story, zero rows changed is an error). SQL test: an `authenticated` admin can update `enabled`, a non-admin cannot, and neither can change `credit_cost`.
