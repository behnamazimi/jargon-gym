# Phase 0 plan: cheap fixes (report section 4, step 1)

Branch: `ai-phase-0-cheap-fixes`. No migrations. No schema change.

## Scope

| Item    | Change                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F4      | `GET /api/narration/[termId]` only serves cached audio (404 if none). New `POST` on the same route generates, and only runs on an explicit press. The player asks `POST` first when the clip is not already loaded. Preload (Read, Review back face) now only issues cheap GETs                                                                                                                                                    |
| F5      | Both methods check the user can read the term via the existing `get_term_card` RPC (`fetchTermCardForUser`) before serving or generating. Story route already does                                                                                                                                                                                                                                                                 |
| E1      | Missing S3 object (`NoSuchKey`) is caught: the row is set to `failed` (hash-guarded) so the next `POST` regenerates, and the GET returns 404 instead of 500                                                                                                                                                                                                                                                                        |
| E2      | `export const maxDuration = 60` on the term narration route                                                                                                                                                                                                                                                                                                                                                                        |
| M2      | `Cache-Control: private, no-cache` so the ETag is revalidated on each play (304 stays cheap). Edits are heard immediately                                                                                                                                                                                                                                                                                                          |
| F2-A    | Evaluate route and the button are admin-only. The route skips the model call when the stored `content_hash` equals the current hash (E23: visibility check kept under the admin gate). The hash now includes an `EVAL_VERSION` (D8, covers model and rubric); bump it when `rubric.ts`, `FIT_WEIGHT`, `PLAIN_THRESHOLD` or `MODEL` change. `maxDuration = 60` on the route                                                         |
| F8 / M5 | Quiz outer `catch` returns a generic message (no `err.message`). `quizFailure` for own-key users returns a generic message too, except messages the provider adapters mark as safe (none), so unknown errors are masked. `saveLlmSettingsAction` returns a generic message; the one intended user-facing text ("API key is required.") is validated in the action before the save. Copy fixed to "Couldn't save your AI settings." |
| M4      | `export const maxDuration = 60` on the quiz page                                                                                                                                                                                                                                                                                                                                                                                   |
| Env     | `AI_GATEWAY_API_KEY` added to `.env-template` with a comment                                                                                                                                                                                                                                                                                                                                                                       |

Not in this phase: showing scores in `/admin/collections` (F2-A display; deferred, needs its own UI), `force` re-evaluation flag (version bump covers it), raw probability storage (needs a migration; belongs with the ledger/settings work).

## Files

- `app/api/narration/[termId]/route.ts` (GET cached-only, POST generate, term access check, `maxDuration`, cache header, E1)
- `lib/narration/service.ts` (`getCachedNarration` read-only helper)
- `lib/narration/storage.ts` (typed `NarrationAudioMissingError`)
- `components/jargon/term-narration-player.tsx` (prepare-then-play)
- `app/api/jargon/terms/[termId]/evaluate/route.ts`, `lib/jargon/term-eval/content-hash.ts`
- `components/jargon/review/*` (thread `canEvaluateTerms` from the page to the card), `app/(private)/jargon/review/page.tsx`
- `app/(private)/jargon/quiz/{actions.ts,page.tsx}`, `lib/quiz/failure.ts`
- `app/(private)/jargon/settings/actions.ts`
- `.env-template`

## Migration order / rollout

None. Pure app release. Old and new client bundles coexist safely: an old cached bundle that still relies on GET-generates will get 404 on uncached terms until reloaded (audio silently fails, no spend). Acceptable, and the failure is quiet.

## Rollback

Revert the PR. No data changes. `term_evaluations` rows written under the new hash version are harmless to the old code (old code overwrites them).

## Tests

- `service.test.ts`: `getCachedNarration` never calls ElevenLabs or the claim RPC; returns ready only for a matching hash.
- New route test for the narration route: 401 no user, 403 not allowlisted, 404 term not visible (F5), GET cached 200 / 304 / range, GET uncached 404 with no generation, POST generates, missing object (E1) returns 404 and marks failed.
- Evaluate route test: non-admin 403 (no model call), admin cache hit skips the model, hash mismatch calls the model.
- `content-hash` test for eval: version participates in the hash.
- `quizFailure` test updated: own-key errors are masked.
- Manual: `pnpm check`.

## Edge cases covered

E1, E2 (route only), E23, F5, M2, M3 (regeneration of failed rows now needs an explicit POST), M4, M5, D8 (partial: hash version).
Not covered here: E3-E7 (F14), E9 (F1), E12 (F1).

## Review amendments (one plan review, applied)

1. **Player keeps `play()` inside the press.** No await before it. Press sets `src` and calls `play()` as today. If the element errors because the audio is not cached, the player POSTs once (`/api/narration/[termId]`, JSON reply, no audio bytes), then re-assigns `src` and calls `load()` + `play()`. The first `play()` in the gesture activates the element for iOS. A preloaded element already in the error state gets the same treatment (re-assign `src`, `load()`). One prepare attempt per press. If the clip is already loaded, no POST.
2. **F5 uses a broader visibility check than `get_term_card`.** That RPC is limited to active collections, and paused collections' terms would 404. Use the session client (`createClient`) and select the term from `terms`; the "Users read visible terms" RLS policy is the visibility rule. To keep 304 and Range cheap, the check runs on every request but is one indexed select.
3. **F8/M5 scope widened.** `recordQuizAnswerAction` and every settings action that returns `err.message` now return fixed copy, with `console.error` before masking. `saveLlmSettingsAction` trims and validates the key in the action first.
4. **`quizFailure` own-key path.** Keep `isKeyRejected` with a fixed "key rejected" message; everything else gets a generic fixed message. Rewrite `failure.test.ts`. Log before masking.
5. **E1.** Detect by error `name` (`NoSuchKey`) or `$metadata.httpStatusCode === 404`. Covers Range requests. A 304 on matching ETag returns before S3, which is fine and documented.
6. **Evaluate.** Order: verified user, admin check, `fetchTermCardForUser`, hash compare. `MODEL` is exported from `evaluate.ts` and included in the hash input, next to `EVAL_VERSION` for rubric/weights/threshold. A cache hit returns `{ schemaFit, plain }` from the stored row. Note: after deploy each viewed term is re-evaluated once (admin only).
7. **Deferred, on purpose.** Story narration GET still generates (`app/api/stories/[storyId]/narration/route.ts`); it has its own daily cap and is rebuilt in phase 4. Noted in Status.
8. **Extra tests.** 304 keeps ETag and `no-cache`; settings action masking; quiz catch masking; player unit test only if a component test setup exists (otherwise the flow is covered by review and manual reasoning).
