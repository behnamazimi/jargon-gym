# Phase 3 plan: narration on the AI module (never billed)

Two PRs, because one would be too big.

- **3a** `ai-phase-3a-narration-feature`: narration access, toggle, allowlist and the sync worker check read `ai_feature_settings` / `ai_feature_allowlist`. Includes a migration.
- **3b** `ai-phase-3b-narration-caps`: usage log (`ai_usage_events`), caps from settings for term and story narration, cap fields in the admin page. Includes a migration.

Narration never reserves credits, never writes to the ledger and never imports `lib/ai-credits` (the isolation test stays and gains new paths). Edge cases by ID: E7, E13, E14, E16, E18, E21, E22, D6, D9, F3.

## 3a scope

### Migration `20260929180000_narration_feature_cutover.sql` (expand; the old tables stay)

1. **Resync (E16).** Copy `narration_settings.enabled` into `narration_term` and `narration_story`, and make the narration allowlist rows in `ai_feature_allowlist` equal to `narration_allowlist` (insert missing, delete extra). Reads the singleton with `where id`. Phase 1 seeded these once; this catches changes since.
2. **Old to new triggers**, so the previous app build (still running during rollout, writing the old tables through the old admin page) keeps the new tables correct: `after update of enabled` on `narration_settings` sets both feature rows; `after insert` / `after delete` on `narration_allowlist` mirror to both features. `security definer`, fixed `search_path`.
3. **`has_feature_access(user, feature)`**: enabled, and (`everyone`, or a per-feature allowlist row, or the user is an admin). Admin mode means admins only. Returns false for unknown features. `revoke ... from public`, `grant execute ... to authenticated, service_role`.
4. **`has_narration_access(uuid)` keeps its name and signature** (the `term_narrations` RLS policy calls it, D6) and now returns `has_feature_access(user, 'narration_term')`.

Deploy order is app first, migration after CI. The new build's access helper calls `has_feature_access`; if that function does not exist yet (`42883`/`PGRST202`) it falls back to the old `has_narration_access` RPC, so narration does not switch off during the gap. Likewise the admin page and worker read `ai_feature_settings` and fall back to `narration_settings` when the table read fails with a schema-missing error.

### App

- `lib/narration/access.ts`: `getNarrationAccessForUser(client, userId, feature = "narration_term")` calls `has_feature_access`, with the fallback above. Callers: term routes and Read/Review/Collection actions use `narration_term`; the story route and `lib/stories/setup.ts` use `narration_story`.
- **E7:** `lib/narration/feature.ts` `isNarrationEnabled(admin)` (settings row, fallback to the old table). `enqueueNarrationSync` uses it. The worker checks it before each wave and on each tick; when off it cancels the active job (existing `cancelled` status) and stops. Test: disabling stops an active job.
- Admin narration page and actions read and write `ai_feature_settings` (`enabled` for both narration features together, since the UI still has one switch) and `ai_feature_allowlist` (both features). The page uses the signed-in admin's client (service role cannot update settings). Allowlist add/remove touches both features; the list shows one row per person. E21 holds: rows are per feature.
- **E14:** the page shows `featureHealth("narration_term")` note (missing ElevenLabs / S3 variables).
- Nav label stays "Narration"; folding the page into one AI hub is not done in this phase (kept as separate tabs, stated in the PR).
- Old tables `narration_settings` / `narration_allowlist` stay written only by the old build and its triggers; after this release nothing in the new build reads them except the fallbacks. They are dropped in the phase 5 cleanup.

### Rollback

Revert the app PR. The migration is additive; the old app still works because `has_narration_access` and the triggers keep the old tables authoritative for it. Edits made through the new admin page while live are not copied back to the old tables (the old page would show stale values after a rollback); noted in the PR.

### Tests (3a)

- SQL `supabase/tests/narration_feature_cutover.sql` (rolls back): resync makes both narration rows equal the old settings and allowlist (E16); the triggers mirror updates, inserts and deletes; `has_feature_access` matrix (disabled, everyone, allowlist member and non-member, admin, admin mode, unknown feature); `has_narration_access` result equals the term feature; narration features cannot be reserved and the ledger stays untouched (E18).
- Vitest: access helper (feature passed through, fallback on missing function, real errors not swallowed); worker cancels an active job when narration is switched off (E7); `enqueueNarrationSync` refuses when off; admin actions write both features and only admins can; isolation test extended to `lib/narration/feature.ts` and the admin actions.
- `pnpm check`, full vitest, SQL tests run locally against Docker Supabase (the old ones included).

## 3b scope

### Migration `20260929190000_ai_usage_events.sql`

`ai_usage_events(id, user_id, feature fk, units int, outcome check in ('ok','failed'), created_at)`, index `(user_id, feature, created_at)`. RLS on; admins read; `service_role` select and insert only (no update or delete); explicit grants and a SQL grant test (D2). It never touches the ledger and has no cost column. Reporting only; it never reduces a balance.

### App

- `lib/ai/usage.ts`: `recordUsage(admin, {userId, feature, units, outcome})` and `countRecentGenerations(admin, userId, feature)` (rolling 24 h). Errors from logging are logged and never fail a request.
- **Term narration (D9, E22):** the POST route serves a cache hit without counting. Only a generation counts, attributed to the user who triggered it, failures included (existing behavior, decided once). Cap comes from `ai_feature_settings.daily_cap` (null means none, today's term behavior). Over the cap returns 429 with a plain message the player treats as "couldn't play".
- **Story narration:** the cap comes from `narration_story.daily_cap` (default 20 from the seed) instead of `STORY_NARRATION_DAILY_CAP`. Counting stays as it is (rolling 24 h from `narration_requested_at`, failures count) and a usage event is written per generation. The constant is removed. The M9 race (parallel requests exceeding the cap) is not fixed here; noted.
- Admin narration page: editable cap for each narration feature (blank means no cap) and a small "last 24 h" count from the usage log. Written with the admin's client; `daily_cap` is in the column grant.
- Deploy order: the new build inserts into `ai_usage_events`; if the table is missing the insert error is logged and ignored, and the cap count falls back to zero (no cap enforced until the migration lands; the story cap keeps its own row-based count).

### Tests (3b)

SQL grants and shape for `ai_usage_events`; vitest for recordUsage/count, term route (cache hit free, generation counted, cap returns 429, failed generation counts), story cap from settings, admin cap action validation; isolation test extended to `lib/ai/usage.ts`.

## Review amendments (one plan review, applied; these override the text above)

**Three PRs, proper expand then release.** The review showed that shipping the migration and the app together lets the new admin page write `ai_feature_settings` before the migration re-points access, and the migration's resync would then overwrite those edits (finding 3). So:

- **3a `ai-phase-3a-narration-migration`: migration only.** Resync, old-to-new triggers, `has_feature_access`, the re-pointed `has_narration_access`, and the `ai_usage_events` table. No app code changes, so app-first deploy order is harmless. The old app keeps working because the triggers keep the new tables equal to what its admin page writes.
- **3b `ai-phase-3b-narration-app`: app cutover** (access helper, worker check, admin page and actions, health note). Merges only after the 3a migration is confirmed applied in production, so the "fall back to the old tables on schema-missing" code is dropped: the tables and functions exist by then.
- **3c `ai-phase-3c-narration-caps`: usage log writes, caps from settings, admin cap fields.** Same gate.

**Decisions made explicitly:**

1. **Keep the old access semantics: no admin bypass.** `has_feature_access(user, feature)` is true when the feature is enabled and (mode `everyone`, or a per-feature allowlist row, or mode `admin` and the user's `users.role` is `admin`). Admins who are not on the allowlist still get no narration, as today (the old function had no bypass; only the `term_narrations` RLS policy has one). It looks up `users.role` for `p_user_id`, not `is_admin()`, because callers pass a user id through the service role where `auth.uid()` is null. This differs from the TypeScript `checkFeaturePolicy` (admins pass every mode) on purpose; both carry a comment pointing at the other.
2. **Grants:** `has_feature_access` and all trigger functions: `revoke all ... from public, anon, authenticated`, `service_role` execute only for `has_feature_access` (the RLS policy reaches it through the security-definer `has_narration_access`, which keeps its current grants). Stops any signed-in user probing another user's admin or allowlist status.
3. **Triggers:** allowlist insert mirror uses `on conflict do nothing`; delete mirror removes both features; settings mirror updates both narration rows. One-way only, so no loops.
4. **E7 worker:** the check sits before each wave after the claim, and at the start of a single tick. When narration is off it writes `status = 'cancelled'`, clears the lease and sets `finished_at`, then stops (a wave already in flight finishes). This frees the unique active-job index and stops the admin page re-kicking. Existing `sync.test.ts` fixtures move to the new settings source and a worker-cancel test is added.
5. **Term cap (3c):** `NarrationResult` gains `attempted` (this request won the claim and ran the provider, success or failure). The cap check sits in the POST route after the cache check and before generation. Only `attempted` requests are recorded, attributed to the caller. Losing the claim and polling, cache hits, and sync-worker generations are not counted.
6. **Term player on 429:** stays silent (goes back to idle), like today's failures; not distinguished from 403. Documented, not built.
7. **Story cap (3c):** the enforced count stays the stories rows in the last 24 hours (a retry of one story counts once). Usage events are reporting only, and the admin page labels its number "generation attempts"; it can differ from the cap on retries. The admin cap field for `narration_story` must be a whole number of at least 1 (blank is refused, so the only cost bound cannot be removed); `narration_term` may be blank (no cap, as today). The constant `STORY_NARRATION_DAILY_CAP` is removed with its test updated.
8. **E13 accepted and documented:** the story route's cache header (one day) can serve cached audio for a while after allowlist removal; the term route revalidates on every play (phase 0).
9. **Allowlist page:** `ai_feature_allowlist` has no `added_by`; the list shows email and date, and the page reads the `narration_term` rows. Add and remove write both features.
10. **Term vs story feature:** Read, Review and Collection actions and the term route use `narration_term`; the story route and story setup use `narration_story`.

**Extra tests:** `has_feature_access` called as the service role (no JWT) for an admin; allowlist duplicate insert through the trigger; resync overwrites drift; the old-app write path (insert into `narration_allowlist`) mirrors; the ledger stays untouched; route tests updated for the new access signature; isolation test gets explicit new paths (`lib/ai/usage.ts`, the admin narration actions).
