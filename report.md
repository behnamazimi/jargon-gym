# AI audit: generated content, access, cost and architecture

Date: 2026-09-29. Scope: everything in the app that calls an AI provider or serves AI output. Read-only review. No code was changed.

**Status:**

- Phase 0 (cheap fixes): merged in #102, 2026-09-29. Deferred: story narration still generates on GET (phase 4), admin score display, raw probability storage.
- Phase 1 (`lib/ai`, `ai_feature_settings`, ledger generalization): merged in #103, 2026-09-29. Migration applies to production through `deploy-migrations.yml`; the CI dry-run needed two re-runs for an unrelated Supabase 502. Nothing reads the new tables yet. Contract of the old cost columns is deferred to phase 5 (needs approval).
- Phase 2 (Quiz and Stories onto `lib/ai`): merged in #104, 2026-09-29. Costs still read from the old columns (contract in phase 5); setup screens do not show 'feature off' ahead of Generate; E10 not built; no Stories action-level test.
- Phase 3 (narration on the AI module, never billed): done, 2026-09-29, in three PRs: #105 migration (resync function, old-to-new triggers, `has_feature_access`, `ai_usage_events`; CI caught a `LOCK TABLE` that fails under `db reset`, removed), #106 app cutover (access, worker E7 cancel, admin page on the feature tables), #107 caps and usage log (term generation runs under the per-person guard; story cap from settings). Accepted gaps: `added_by` no longer recorded, term player silent on 429, story cap race M9 not fixed, no single AI hub page. Old tables `narration_settings` / `narration_allowlist` are no longer read; dropped in phase 5.

## 1. What exists today

Five features call a paid AI service. They share almost nothing.

| #   | Feature         | Provider / path                                                                                             | Who pays                                             | Access control                                              | Cost tracking            | Admin surface                                  |
| --- | --------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- | ------------------------ | ---------------------------------------------- |
| 1   | AI Quiz         | Google or Anthropic via `ai` SDK (`lib/quiz/generate.ts`)                                                   | User's own key, else the app's `CENTRAL_LLM_API_KEY` | Own key, else credits                                       | Credits ledger (`quiz`)  | `/admin/ai-credits`                            |
| 2   | Stories (text)  | Same (`lib/stories/generate.ts`)                                                                            | Same                                                 | Same                                                        | Credits ledger (`story`) | `/admin/ai-credits`                            |
| 3   | Term evaluation | Jev (`typesafe-ai/jev`) via Vercel AI Gateway, `experimental_evaluate` (`lib/jargon/term-eval/evaluate.ts`) | The app's `AI_GATEWAY_API_KEY`                       | **None beyond being signed in**                             | **None**                 | **None**                                       |
| 4   | Term narration  | ElevenLabs `eleven_v3` (`lib/narration/`)                                                                   | The app's `ELEVENLABS_API_KEY`                       | Global toggle + per-user allowlist (`has_narration_access`) | **None**                 | `/admin/narration`                             |
| 5   | Story narration | ElevenLabs, same client (`lib/stories/narration.ts`)                                                        | The app's `ELEVENLABS_API_KEY`                       | Same allowlist, plus a hard-coded 20/day cap per user       | **None**                 | `/admin/narration` (toggle and allowlist only) |

Adjacent and fine as is: the Import page's "LLM prompt" is copy-and-paste text for the user's own chat tool. It never calls a provider.

Three provider credentials, three access models, three failure models, and two admin pages. Only features 1 and 2 have the "central AI hub" the admin nav suggests. `Narration` and `AI credits` are sibling tabs, not one system.

### About the narration suspicion

I could not reproduce "narration needs the user's AI key" in code. Term narration access is `narration_settings.enabled AND user in narration_allowlist` (`lib/narration/access.ts`, `has_narration_access`). It never reads `user_settings`, credits or the LLM key. Two things can produce that impression:

- Story narration is only reachable after an AI story exists, so it needs AI to be reachable at all (`components/jargon/read/stories/story-reader.tsx:88`).
- Narration is invisible to the AI hub: no shared switch, no shared balance, no shared failure log. It reads as "a different system that happens to be near AI".

`supabase/migrations/20260929160000_user_settings_service_role.sql` fixed a missing grant that broke Stories setup for the admin client. Any narration symptom seen before that fix could have come from the same cause. I have not confirmed this. If you saw narration fail for a specific user, tell me the symptom and I will trace it.

The point still stands: narration should be part of the AI system. Findings 1 to 3 below cover it.

## 2. Findings at a glance

| ID  | Finding                                                                                                                                                              | Severity | Type                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------- |
| F1  | No shared AI layer: three credentials, three policies, three failure models                                                                                          | High     | Architecture          |
| F2  | Term evaluation is open to every user, unmetered, and its output is never read                                                                                       | High     | Cost and access       |
| F3  | Narration cost is unmetered and outside credits, with a hard-coded cap                                                                                               | High     | Cost and architecture |
| F4  | Narration GET generates audio and spends money; on Review it fires before the answer is revealed                                                                     | High     | Cost                  |
| F5  | Term narration route skips per-term authorization                                                                                                                    | Medium   | Security              |
| F6  | ~~Failed narration retries on every play~~                                                                                                                           | Dropped  | Decision              |
| F7  | ~~Quiz answers come from the model unverified~~                                                                                                                      | Dropped  | Decision              |
| F8  | Credits orchestration is copied per feature; raw errors can reach users                                                                                              | Medium   | Architecture and UX   |
| F9  | Provider quirks leak into feature code; models are hard-coded                                                                                                        | Medium   | Architecture          |
| F10 | Retry and timeout behavior is inconsistent; quiz can call the provider up to 6 times per charge                                                                      | Medium   | Cost and reliability  |
| F11 | Mixed layering: LLM key lives in `user_settings`; `lib/llm` and `lib/ai-credits` depend on each other                                                                | Medium   | Architecture          |
| F12 | User key handling: `user_settings` is fully user-writable and the ciphertext user-readable; no validation on save; per-call `scryptSync`; static salt; no versioning | Medium   | Security              |
| F13 | Data leaves to TypeSafe/Jev and ElevenLabs with no disclosure                                                                                                        | Medium   | Privacy               |
| F14 | Two narration generation paths, duplicated routes, and the Telegram secret reused for the narration cron                                                             | Medium   | Architecture          |
| F15 | Docs and tests cover credits only                                                                                                                                    | Low      | Maintainability       |

## Decisions (2026-09-29)

- **F1:** Alternative A accepted. One internal `lib/ai/` module.
- **F2:** Alternative A accepted. Term evaluation becomes an admin curation tool.
- **F3:** Alternative A accepted, with one change: narration stays **out of credit calculations on purpose**. It joins the AI module and the AI hub, but it is never charged in credits. It keeps its own toggle and per-user enablement, now as a feature row in `ai_feature_settings`.
- **F6 and F7:** dropped. Not planned.
- **F14:** Alternative A accepted. The single audio job model lives inside the `lib/ai/` module from F1, not as a separate narration system.
- F4, F5 and the remaining findings have no decision yet.

Each finding below has two alternatives. A recommended target design is in section 4.

---

## F1. No shared AI layer (High)

**Evidence**

- Quiz and Stories use `lib/llm/model.ts` (Google and Anthropic SDKs). Term evaluation calls `experimental_evaluate` with a bare model string and relies on `AI_GATEWAY_API_KEY` from the environment (`lib/jargon/term-eval/evaluate.ts:13`). Narration builds its own `ElevenLabsClient` (`lib/narration/eleven-labs.ts`).
- Access resolution exists once (`lib/llm/access.ts`) and only knows "own key, credits, unavailable" for text generation.
- `ai_credit_ledger.feature` is constrained to `('quiz','story')`. Adding a feature needs a migration, a `CreditFeature` change, a `CreditCosts` change, a repository mapping, the settings schema, and the admin UI. That is six places for one feature.
- The admin sees credits for two features and a separate page for a third. Nothing shows total AI spend.

**Why it matters:** the app has no single answer to "what did AI cost us today, who caused it, and how do I switch it off". Every new AI feature copies one of three patterns, which is how F2 and F3 happened.

**Alternative A: one internal AI module (recommended).** Create `lib/ai/` with:

- a capability registry (`object`, `text`, `evaluate`, `speech`);
- one `resolveAccess(feature, user)` that returns who pays;
- one `runMetered(feature, cost, fn)` wrapper (today's `runWithCredits`, generalized);
- one `ai_feature_settings` table with a row per feature (`enabled`, `access_mode: everyone | allowlist | admin`, `daily_cap`, `credit_cost`, `unit`).

The ledger's `feature` becomes free text checked against that table. The admin hub reads all of it. Existing tables stay; this is a refactor plus one migration.

**Alternative B: route everything through the Vercel AI Gateway.** The Gateway is already in use for Jev. Moving quiz and stories to `provider/model` strings drops `@ai-sdk/google`, `@ai-sdk/anthropic` and the per-provider branching (F9). Spend and logs appear in one dashboard. It does not solve per-user access, and ElevenLabs audio would still need its own path unless the Gateway route for speech fits. Bring-your-own-key users would need Gateway BYOK, or a separate path.

---

## F2. Term evaluation is open, unmetered and write-only (High)

**Evidence**

- `TermEvalButton` renders for every user on a revealed Review card (`components/jargon/review/review-card.tsx:145`). There is no admin check.
- `app/api/jargon/terms/[termId]/evaluate/route.ts` checks only the verified-user header and that the user can see the term. It has no credits, allowlist, cap, `maxDuration`, or in-flight dedupe.
- It always calls the model, even when a stored `term_evaluations.content_hash` equals the current hash. The hash is computed and saved but never used to skip work.
- One shared row per term (`term_id` primary key). Any user's press overwrites everyone's score, and `evaluated_by` only records the last one.
- Nothing reads `term_evaluations`. It is written and shown once in the button, then discarded.
- `AI_GATEWAY_API_KEY` is in `.env` but missing from `.env-template`, so a fresh non-Vercel deploy silently has no evaluation (on Vercel the Gateway can authenticate with the deployment's OIDC token, so check before relying on this).
- Test coverage is one pure function (`schemaFitFromAnswers`).

**Why it matters:** this reads as an admin or curator tool that shipped to all users. Any signed-in user can spend the app's Gateway budget by pressing a button in a loop, and the result is not used.

**Alternative A: make it an admin curation tool.** Gate the button and route on `getUserIsAdmin`. Skip the call when the stored hash matches unless a `force` flag is set. Show scores in `/admin/collections` where they can drive edits. Add the env var to the template and document it.

**Alternative B: make it a metered user feature.** Keep it for users, but route through the F1 wrapper with a credit cost and a per-user daily cap, per-user results keyed `(user_id, term_id)` if the score is meant to be personal, and use the hash to serve cached results. Only do this if there is a product reason for users to see the score. Today there is none.

---

## F3. Narration is a fourth cost centre outside the AI system (High) - decided: A, revised

**Decision:** narration is not part of the credit calculation and never will be. It becomes part of the AI module and hub, with its own toggle and per-user enablement.

**Evidence**

- Term and story narration call ElevenLabs outside any shared AI code. The controls are a global toggle, an allowlist, and `STORY_NARRATION_DAILY_CAP = 20` in `lib/stories/types.ts`.
- The cap lives in code, so it cannot change without a deploy, and it counts failed attempts (`narration_requested_at` is set on claim). Term narration has no per-user cap.
- `/admin/narration` sits beside `/admin/ai-credits` in `admin-nav.tsx` as an unrelated tab, with no usage view.

**What to build**

1. Register `narration_term` and `narration_story` as features in the F1 registry, with `billing: "none"` (never touches the credit ledger).
2. Move the global toggle, the allowlist and the story cap into `ai_feature_settings` (per-feature `enabled`, `access_mode: everyone | allowlist | admin`, `daily_cap`). Per-user enablement stays an explicit allowlist per feature, so narration can be on for a user without any other AI feature being on, and the reverse.
3. Keep `has_narration_access` as the single check, reading from the new table. Do not add an AI-key or credits condition to it.
4. Log each generation to a usage record (feature, user, characters, outcome) for the hub to display. This is reporting only and never reduces a balance.
5. Fold the `/admin/narration` page into the AI hub as a section. The batch sync stays there as a tool.

**Rejected:** charging story narration in credits (the original Alternative A), and keeping narration fully separate (Alternative B).

---

## F4. GET requests that spend money, including preload (High)

**Evidence**

- `GET /api/narration/[termId]` generates audio when none is cached (`getOrGenerateNarration`).
- `TermCardHeader` passes `narrationPreload` on Read and Review cards. The player then sets `src` and `preload="auto"` on mount (`components/jargon/term-narration-player.tsx:155`), so simply showing a card requests the audio.
- On Review, the card's back face is always mounted (rotated, hidden by `backface-visibility`), so the audio request fires when the card is shown, before the user reveals the answer (`components/jargon/review/review-card.tsx:130`).
- For an allowlisted user, browsing cards can trigger ElevenLabs generation for every uncached term they see, without pressing play.
- A GET with side effects is also prefetchable and retryable by browsers and proxies.

**Alternative A: separate "prepare" from "serve".** GET serves cached audio or returns 404. A POST (`/prepare`) generates on explicit press, or the admin sync pre-generates. Preload only requests the GET. This removes accidental spend and matches HTTP semantics.

**Alternative B: keep generate-on-demand but bound it.** Keep the GET, drop `preload` for uncached terms (a cheap `status` field on the card data tells the client whether audio exists), and apply the F3 per-user cap.

---

## F5. Term narration skips per-term authorization (Medium)

**Evidence:** `app/api/narration/[termId]/route.ts` checks that the user is on the allowlist, then calls `getOrGenerateNarration(admin, termId)`. The admin client bypasses RLS and nothing checks that this user can see the term. Domains can be `private` (`20260725140000_user_owned_domains.sql`). A user who knows another user's private term UUID gets the spoken text of that term. Story narration does check ownership, so the two routes disagree.

UUIDs are hard to guess, which limits real-world exposure. Still, the route is the only thing between the private text and any allowlisted user, and the evaluate route already does this check properly (`fetchTermCardForUser`).

**Alternative A:** call the same `fetchTermCardForUser` (or a light `can_read_term` RPC) before generating or serving.
**Alternative B:** key audio by content hash instead of term id, and serve it only through a signed, short-lived URL minted by an authorized server action. This also makes the cache shareable across identical terms.

---

## F6. Dropped

Not planned, by decision.

---

## F7. Dropped

Not planned, by decision.

---

## F8. Credits orchestration is copied and leaks raw errors (Medium)

**Evidence**

- `generateAiQuizResult` and `generateStoryAction` each implement: resolve access, branch on own versus credits, compute cost, call `runWithCredits`, map failures with `quizFailure` or `storyFailure`, and pass a `usingCredits` flag by hand. Any new feature repeats this and can get it wrong.
- The outer `catch` in `generateQuizAction` returns `err.message` verbatim (`app/(private)/jargon/quiz/actions.ts:145`). If `resolveAiAccess` or `reserveCredits` throws, a database or provider message reaches the user. That is exactly what `quizFailure` was written to avoid for credits users.
- `quizFailure` for own-key users also returns `err.message` verbatim.
- Copy inconsistencies: `saveLlmSettingsAction` says "Couldn't save quiz settings" although the key is used for Stories too (`app/(private)/jargon/settings/actions.ts:159`).

**Alternative A:** one `runAiFeature({ feature, terms/cost, produce, mapError })` in the F1 module that owns resolve, charge, refund, and error masking. Actions only supply the produce function and the user-facing copy. Unknown errors always become a generic message.
**Alternative B:** a small higher-order server-action wrapper, `withAiAccess(feature, handler)`, that injects `access` and a `charge(cost, fn)` helper. Less structural change; features still map their own errors.

---

## F9. Provider quirks leak into features; models are hard-coded (Medium)

**Evidence**

- `lib/quiz/generate.ts:31` branches on `provider === "google"` to use a different schema shape, because Gemini cannot express tuples. Quiz code knows about a vendor limitation. Stories chose plain text for a similar reason and the fix lives in the parser.
- `lib/llm/model.ts` maps one model per provider for all features. Commit `5619d35` ("Fix Stories and AI Quiz on production: move Google to gemini-3.8-flash") shows a model change causing a production incident. There is no per-feature model, no fallback model, and the active model is not shown in the admin page.
- Jev's model id is a separate constant in `evaluate.ts`.

**Alternative A:** put provider adaptation behind one `generateStructured(schema, prompt)` in `lib/ai/` that hides tuple-versus-object schemas and returns typed data. Model ids come from `ai_feature_settings` (per feature, editable in the hub) with an optional fallback id.
**Alternative B:** switch to Gateway model strings (F1-B) so a model change is a config edit, and keep provider quirks in one adapter file.

---

## F10. Retries and timeouts are inconsistent (Medium)

**Evidence**

- Stories: `maxRetries: 0`, one manual retry, a shared 45 s abort.
- Quiz: no timeout. `generateObject` uses the SDK default of 2 retries, and `generateQuizQuestions` retries once more, so a failing provider can be called up to 6 times for one charge. Six is the worst case for outages and rate limits; a 401 or 400 is not retried by the SDK and costs 2 calls. On the app's key that is app spend. When the second attempt fails, the first error is thrown and the second is discarded, which hides the more recent cause.
- `docs/ai-credits.md` admits that if the process dies after the charge the credits stay spent, and that nothing marks such rows. Quiz is the feature most exposed to this because it has no time limit.
- Term evaluation has no timeout or `maxDuration`.

**Alternative A:** one shared policy (timeout, `maxRetries: 0`, one bounded retry for retryable errors) in the F1 wrapper. Add a `settled_at` column to spends and a small job that refunds unsettled spends older than N minutes, as the doc already suggests.
**Alternative B:** move long generations to a queue (the narration sync job is already this pattern). The request charges and enqueues; a worker generates, refunds on failure, and the client polls. It costs more moving parts, so use it only if quiz sizes grow.

---

## F11. Layering: keys in `user_settings`; circular module dependencies (Medium)

**Evidence**

- `user_settings` holds the encrypted API key, provider, tour progress, streak fields, read mode and Stories preferences. Unrelated modules read it: `lib/streak/settings.ts:32` computes `hasOwnKey` from the LLM columns. A grant that was missing for one role broke Stories (`20260929160000_user_settings_service_role.sql`), which is the kind of coupling this causes.
- Type-level cycle: `lib/llm/types.ts` imports from `lib/ai-credits/types`, `lib/ai-credits/messages.ts` imports from `lib/llm/types`, and `lib/llm/access.ts` imports the credits repository. Credits and access are one concept split across two folders.
- `lib/llm/central.ts` decides the account-menu mode (`aiCreditsMenuMode`), which is UI policy inside a provider-config file.
- Naming is scattered: `llm`, `ai-credits`, `narration`, `jargon/term-eval`, and routes under `api/jargon`, `api/narration`, `api/stories`.

**Alternative A:** a dedicated `user_ai_keys` table (user id, provider, encrypted key, key version, last4) with its own grants. `user_settings` stops holding secrets. Merge `lib/llm` and `lib/ai-credits` into `lib/ai/`; menu and UI helpers move out to the components layer.
**Alternative B:** keep the table, but expose keys only through one module (`lib/ai/keys`) and stop other modules reading the columns. Enforce with a lint rule or the existing `knip` config. Cheaper, and the cycles still need untangling.

---

## F12. User key handling (Medium, raised after review)

**Evidence**

- The key is not checked when saved. The user finds out it is bad when a quiz fails; `isKeyRejected` then offers credits.
- `getEncryptionKey` runs `scryptSync` on every encrypt or decrypt (`lib/llm/encryption.ts:14`). That is a synchronous, CPU-heavy call on every AI request and blocks the event loop. The salt is a fixed string and there is no key version, so rotating `LLM_SETTINGS_ENCRYPTION_KEY` invalidates every stored key at once.
- The encrypted blob is selected with the user's own session client (`lib/llm/settings.ts:35`), so the ciphertext is reachable by that user's token. Useless without the secret, but the column should be server-only.
- `user_settings` has `grant select, insert, update, delete to authenticated` and a `for all` policy on `user_id = auth.uid()` (`20260730220000_rename_user_llm_settings.sql`). A user can therefore read the ciphertext and also write any column of their own row (provider, key, tour, streak, read mode) straight from the browser. Credits are safe, since they live in the ledger.
- No rate limit for own-key users; their cost is theirs, but a stolen session could burn their key.

**Alternative A:** validate on save with a tiny call (one token). Derive the key once at module load, store a `key_version` with each ciphertext, and select the encrypted column only through the admin client (revoke `api_key_encrypted` from `authenticated`).
**Alternative B:** move secrets to Supabase Vault or the Gateway's BYOK feature and store only a reference. Better rotation and audit, more setup.

---

## F13. Data disclosure gaps (Medium)

**Evidence:** `docs/ai-credits.md` and the Settings text say that terms, definitions and outlines go to "our AI provider" when credits are used. Not covered:

- Term evaluation sends the full term entry, including the user's own private-collection text, to TypeSafe (Jev) via Vercel. Users are not told.
- Narration sends term text and full story text to ElevenLabs.
- Nothing distinguishes shared-collection content from private text in what is sent.

**Alternative A:** one plain-language "what leaves the app" list in Settings and the privacy page, generated from the F1 feature registry (each feature declares its vendor and what it sends). Show a one-line notice at first use.
**Alternative B:** limit evaluation and narration of private collections to explicit user action with an inline note, and never run them in bulk (admin sync) on private domains.

---

## F14. Narration architecture: two paths, duplicated code, borrowed secret (Medium) - decided: A

**Evidence**

- Two ways to generate the same audio: the request path (`getOrGenerateNarration`, with a 30 s polling loop inside the request) and the batch worker (`sync-worker.ts`, a lease table, a claim RPC, `after()` that POSTs to its own public URL, and a Supabase cron job). The worker calls the request-path function, so it also polls.
- That is about a dozen files for one job type. Recovery relies on a manually created Dashboard cron job; the docs call it required in production but nothing checks it exists.
- The internal sync route authenticates with `TELEGRAM_INTERNAL_SECRET`. One secret now unlocks Telegram traffic and narration generation.
- `app/api/narration/[termId]/route.ts` and `app/api/stories/[storyId]/narration/route.ts` duplicate ETag, range, and header code. `lib/stories/narration.ts` re-implements the claim, pending timeout and result logic that `lib/narration/service.ts` and the SQL RPC already have.
- `lib/narration/sync.ts` re-exports from `sync-worker`, `sync-missing` and `sync-shared` (a barrel over three files). `narrationIsEnabled` in `sync.ts` duplicates `getNarrationSettingsForAdmin`.
- Narration state is a status string on two tables with different lifecycles (`term_narrations` and columns on `stories`).

**Decision: Alternative A, inside `lib/ai/`.** Narration is the `speech` capability of the F1 module, not a separate subsystem.

- One `audio_jobs` table (subject type, subject id, content hash, status, attempts, error, storage path) and one claim RPC replace `term_narrations` and the narration columns on `stories`. Migrate existing rows.
- One `getOrCreateAudio(subject)` service in `lib/ai/speech/` replaces `lib/narration/service.ts` and `lib/stories/narration.ts`. Terms and stories differ only in how the script is built and the subject key.
- The ElevenLabs client, voice map and storage upload become the speech provider adapter behind the F1 capability registry. The voice TODO for `nl` moves there.
- Batch sync is "enqueue many audio jobs" and runs on the same worker. The lease logic stays, the parallel request-path polling goes.
- One shared audio route handler serves both terms and stories (ETag, range, headers), with access checked by the F3 feature row and per-subject authorization (F5).
- The internal sync route gets its own `AI_INTERNAL_SECRET` (or a per-purpose secret) instead of `TELEGRAM_INTERNAL_SECRET`. The Supabase cron job header must be updated in the same deploy.
- Policy (toggle, allowlist, caps) comes from `ai_feature_settings`, per F3. No billing.

**Alternative B:** drop request-time generation entirely. Audio is only made by the worker (admin sync for terms, an enqueue on story creation for stories). Requests only serve ready audio. This removes polling in requests and most of F4 and F6, at the cost of a "not ready yet" state for new stories.

---

## F15. Docs and tests (Low)

- `docs/ai-credits.md` and `AGENTS.md` describe credits, Stories and the scoring engine. Narration, the sync worker and term evaluation are undocumented apart from the cron note.
- Tests exist for credit math, story parsing, failure mapping and narration services. The evaluate route, the narration routes, and the AI quiz actions have none, and there are no tests for the access ordering that the docs promise ("a failing own key never falls back to credits").

**Alternative A:** add `docs/ai.md` as the single map (features, vendors, access rules, cost levers), generated from the F1 registry, and link it from `AGENTS.md`. Add route-level tests for evaluate and narration.
**Alternative B:** keep separate docs per feature but add a checklist in `AGENTS.md`: any new AI feature must register with the AI module, declare its cost, and appear in the hub.

---

## 3. What works well

- `reserve_ai_credits` takes a per-user lock and writes the spend in one step; the refund is idempotent (`supabase/migrations/20260929120000_ai_credits.sql`, `20260929150000_ai_credit_refund_reasons.sql`). This is the right primitive and should be the base of F1.
- The order "own key first, credits second, never fall back on a failing own key" is clear and documented.
- Refund notes are redacted and truncated (`lib/ai-credits/failure-reason.ts`), and the admin page surfaces failure reasons.
- Story output is plain text with a strict marker parser that rejects broken markup; the outline is fenced and marked as untrusted in the prompt.
- Narration cache keys use a content hash, so edits regenerate audio and unchanged terms do not.

## 4. Direction

1. **Now, cheap and stops spend leaks:** F4 first (no generation on preload, including the Review back face), then F2-A (admin-only evaluation, skip the call when the hash matches), F8 and M5 (stop returning raw error text), F5 (term-access check), E1 (catch a missing audio file), `maxDuration` on the term narration route and the quiz, M2 (cache), and add `AI_GATEWAY_API_KEY` to `.env-template`.
2. **Main build (decided), as expand, release, contract (section 6):** F1-A. Create `lib/ai/` with the capability registry, `resolveAccess`, `runMetered` and `ai_feature_settings`. Generalize the ledger `feature` column. Move Quiz and Stories onto it, then term evaluation (F2-A), then narration (F3, no billing) as features. Merge the narration page into one AI hub.
3. **After F1-A lands (decided):** F14-A, the single audio job model, as the `speech` part of `lib/ai/`.
4. **Later, not decided:** F10 (`settled_at` sweep), F11 (separate key table).

Open question: is the Vercel AI Gateway the intended long-term route for text models (F1-B)? It is not required for the plan above.

---

## 5. Edge cases

Each case was checked against the code unless marked _reasoned_. The first group is bugs in today's code. The second is what the decided design (F1-A, F2-A, F3-A, F14-A) must handle, or it will introduce regressions.

### 5.1 Present in today's code

| ID  | Scenario                                                                                                   | What happens now                                                                                                                                                                                         | Where                                                                           | Handle in                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| E1  | The stored audio file is missing (bucket cleaned, wrong bucket, manual delete) but the DB row says `ready` | `downloadNarrationAudio` throws, the route has no `try/catch`, so every play returns a 500. Status is never re-verified, so the term never regenerates                                                   | `app/api/narration/[termId]/route.ts`, `lib/narration/storage.ts`               | F14: catch missing-object, mark the job `failed` and regenerate once                                         |
| E2  | Term narration generation is slower than the platform default limit                                        | The term route sets no `maxDuration` (the story route sets 60). The function can be killed mid-generation, leaving a `pending` row that blocks others for 2 minutes                                      | `app/api/narration/[termId]/route.ts`                                           | F14: one route handler with an explicit `maxDuration`                                                        |
| E3  | A term's domain language changes                                                                           | The content hash covers term fields only, not language, so the old audio is served in the wrong voice                                                                                                    | `lib/narration/content-hash.ts`                                                 | F14: include language and a script-template version in the hash                                              |
| E4  | The narration script template (connector phrases) is edited                                                | Hash is over raw fields, so no term regenerates and old wording stays cached                                                                                                                             | `lib/narration/template.ts`                                                     | F14: template version in the hash                                                                            |
| E5  | Two generations for the same term overlap (the first exceeds the 2-minute stale window)                    | Both upload to the same path `<termId>.mp3`. The late, older upload overwrites the newer file, while the DB update is guarded by hash and does nothing. Row says new hash, file holds old audio          | `lib/narration/service.ts`, `claim_term_narration`                              | F14: make the storage path include the content hash, and never overwrite                                     |
| E6  | A story or term is deleted, or an account is deleted                                                       | DB rows cascade. The MP3 files in the bucket are never deleted, including private story text spoken aloud (`stories/<userId>/<storyId>.mp3`)                                                             | `20260926120000_stories.sql` (`on delete cascade`), no storage cleanup anywhere | F14: delete audio on job delete, plus a sweep for orphans. Needed for account deletion requests              |
| E7  | The admin turns narration off while a batch sync is running                                                | The kill switch is checked when a sync is enqueued and when audio is served, but the worker never checks it. Cron keeps ticking and ElevenLabs keeps being called until the job ends                     | `lib/narration/sync-worker.ts`, `lib/narration/sync.ts`                         | F3: worker checks the feature row every wave; disabling cancels the active job                               |
| E8  | The admin runs a batch sync on a private collection                                                        | The admin client sees every collection, and sync sends private users' term text to ElevenLabs                                                                                                            | `lib/jargon/admin/list-all-collections.ts`, `sync-missing.ts`                   | F13: batch sync limited to shared or built-in collections unless the owner opted in                          |
| E9  | `LLM_SETTINGS_ENCRYPTION_KEY` is rotated or wrong                                                          | `decryptApiKey` throws inside `resolveAiAccess`. The screen still says "own key" (it only checks `last4`) and credits are never tried. Quiz shows the raw error; Stories masks it with a generic message | `lib/llm/encryption.ts`, `lib/llm/access.ts`                                    | F1/F12: treat undecryptable as "own key invalid", show a re-enter prompt, offer credits, never a raw message |
| E10 | "Remove my key, use AI credits"                                                                            | The button permanently deletes the stored key. If the rejection was temporary (provider outage reported as 400/403), the user must re-enter the key                                                      | `components/jargon/ai-credits/credits-instead-button.tsx`                       | F1: "use credits this time" as a per-request choice, without deleting the key                                |
| E11 | The refund call itself fails (database down) after a failed generation                                     | The error is only logged. The user keeps paying for nothing and nothing marks it                                                                                                                         | `lib/ai-credits/charge.ts`                                                      | F10: `settled_at` marker plus a sweep, as the credits doc already suggests                                   |
| E12 | The user double-clicks Generate or uses two tabs                                                           | No server idempotency. Two requests are both charged and both generate a story, and the older is dismissed                                                                                               | `generateStoryAction`, `generateQuizAction`                                     | F1: one in-flight request per user per feature (advisory lock or a pending spend row)                        |
| E13 | An allowlisted user is removed from the list                                                               | Cached audio keeps playing for up to a day (`private, max-age=86400`)                                                                                                                                    | narration routes                                                                | Accept, or lower the cache time. Document                                                                    |
| E14 | `ELEVENLABS_API_KEY`, `AI_GATEWAY_API_KEY` or the S3 variables are missing                                 | Narration marks each item `failed`. Evaluation returns 502. Nothing tells the admin the cause                                                                                                            | `lib/narration/*`, evaluate route                                               | F1: a health check per feature shown in the hub ("key missing")                                              |

### 5.2 The decided design must handle these

| ID  | Scenario                                                                                 | Risk                                                                                                                                                                                                | Required behavior                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E15 | Migrating `term_narrations` and story audio into `audio_jobs`                            | If `content_hash` or `storage_path` is not carried over, or the hash formula changes (E3, E4), the whole library looks stale and every term is regenerated. That is a large ElevenLabs bill         | Copy hash and path as they are. Version the hash formula, and treat old-version rows as valid until an admin chooses to regenerate. Dry-run count before deploy |
| E16 | Moving `narration_settings.enabled` and `narration_allowlist` into `ai_feature_settings` | The default for a new table row is off. A migration that forgets to copy leaves narration disabled for allowlisted users, or opens it to everyone if `access_mode` defaults to `everyone`           | Copy the current toggle and allowlist verbatim. Default new features to `enabled = false`, `access_mode = admin`                                                |
| E17 | Per-feature `enabled` versus the credits switch                                          | The credits doc promises that switching credits off does not affect users with their own key. A generic "feature disabled" flag could break that                                                    | Keep two separate levers: feature enabled (blocks everyone) and credits enabled (blocks only the central key)                                                   |
| E18 | Generalizing `ai_credit_ledger.feature`                                                  | The column has a check limited to `quiz`/`story` and the shape constraint requires `feature` on spends. Narration must never write to this ledger (F3), and a wrong insert would spend user credits | Narration writes only to its own usage record. Add a test that narration paths never call `reserve_ai_credits`                                                  |
| E19 | Feature rows referenced by name in code and in the DB                                    | A typo or a feature in the DB with no code, or the reverse, fails at request time                                                                                                                   | Registry is the source of truth. A test or startup check asserts every registry feature has a settings row and every row has a registry entry                   |
| E20 | Changing the internal sync secret (F14)                                                  | `TELEGRAM_INTERNAL_SECRET` is also read by Supabase Edge Functions (`supabase/functions/_shared/env.ts`) and the cron header. If the app is deployed first, cron gets 401 and syncs silently stall  | Deploy order: accept both secrets for one release, update the cron header, then remove the old one. Update `docs/supabase/narration-sync-cron.md`               |
| E21 | `access_mode: allowlist` for a feature other than narration                              | Evaluation is admin-only (F2), Quiz and Stories are open. One allowlist table shared by features can grant more than intended                                                                       | Allowlist rows keyed by `(feature, user_id)`, never a global list                                                                                               |
| E22 | Daily caps in `ai_feature_settings`                                                      | The story cap counts rows in the last 24 hours, and failed attempts consume it. With `audio_jobs` a retry could double-count or never count                                                         | Count attempts per `(user, feature, day)` explicitly, and decide once whether failures count. Keep the existing behavior (they count) unless changed on purpose |
| E23 | Admin evaluation of a term the admin does not own                                        | The evaluate route checks visibility via `fetchTermCardForUser`. Admin-only (F2-A) must still call it, or admins can spend on terms that no longer exist                                            | Keep the visibility check under the admin gate. Skip the model call when the stored hash matches, unless `force` is set                                         |
| E24 | Serving audio for a subject that has since changed (term edited, story deleted)          | A hash-keyed path (E5) makes old audio still reachable by an old URL                                                                                                                                | Serve by job id resolved server-side to the current job. Return 404 for deleted subjects                                                                        |
| E25 | _(reasoned)_ Cron and `after()` both start a worker at once                              | The lease and `for update skip locked` prevent double processing today. A new `audio_jobs` claim RPC must keep both                                                                                 | Reuse the current claim and lease logic unchanged, and port `supabase/tests`-style SQL checks to the new table                                                  |

### 5.3 Checks to add before building

1. A dry-run query that counts `term_narrations` rows that would look stale under the new hash formula (E15).
2. SQL tests: migrated toggle and allowlist equal the old values (E16); narration cannot insert into `ai_credit_ledger` (E18).
3. Route tests for the shared audio handler: missing file (E1), unauthorized term (F5), disabled feature, range request, 304.
4. A worker test that disabling the feature stops an active job (E7).
5. A key-decrypt failure test at the access resolver (E9).

---

## 6. Independent review (subagent, 2026-09-29)

A second reviewer re-checked every claim in this report against the code. Result: **no claim was wrong**. Corrections it caused are already applied above (F4 Review preload, F10 retry wording, F2 Gateway caveat, E9 scope, F12 severity, a line number). I re-verified the two claims that most change priorities: the `user_settings` grant and policy, and the always-mounted Review back face. Both hold.

### 6.1 Design flaws in the decided solutions

| #   | Flaw                                                                        | Failure scenario                                                                                                                                                                                                                                                                                                                                                               | Required change                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Moving costs into `ai_feature_settings` breaks the deployed code            | `ai_credit_balance`, `my_ai_credit_state` and `admin_ai_credit_usage` return `quiz_credits_per_question` and `story_credits_per_term`; `getMyCreditState` reads them. A `create function` cannot change a return type, so it is a drop and recreate. If the migration lands before the new build, old code reads `undefined` costs and reserves fail ("Cost must be positive") | Expand and contract. Keep the old columns and functions one release, add new ones, switch code, then drop                                                                             |
| D2  | New tables can ship without grants                                          | The credits tables `revoke all ... from service_role` and re-grant selectively. Commits `293ba24` and `20260929160000` show this exact miss taking Stories down                                                                                                                                                                                                                | Add a SQL test asserting grants for `ai_feature_settings`, `audio_jobs` and the usage table, next to `supabase/tests/ai_credits.sql`                                                  |
| D3  | "Narration never touches the ledger" cannot be enforced by a CHECK          | A CHECK cannot reference another table. `reserve_ai_credits(p_feature text, ...)` accepts any text, so a `narration_*` spend could still be written                                                                                                                                                                                                                            | Add `billable boolean` to `ai_feature_settings` with `unique (feature, billable)`, make the ledger FK `(feature, true)`, and reject non-billable features inside `reserve_ai_credits` |
| D4  | The E12 "advisory lock" cannot span a model call                            | Calls go through PostgREST RPC, so the transaction ends when the RPC returns. Reusing `hashtextextended(user_id, 0)` would also collide with the lock `reserve_ai_credits` takes                                                                                                                                                                                               | Use a row guard: a unique partial index on `(user_id, feature) where status = 'running'` with a TTL, or a pending ledger state                                                        |
| D5  | Hash versioning conflicts with hash-keyed paths                             | E15 keeps old-version rows valid while E3/E4 add language and template to the hash. Old rows never pick up the fixes, and new hash-keyed files pile up as orphans on every edit                                                                                                                                                                                                | Add an explicit `hash_version` column and rule in the claim RPC. Copy old paths verbatim. Ship the orphan sweep (E6) in the same release. Add a `superseded` job state                |
| D6  | Cutover of `term_narrations` and `stories.narration_*` is not zero-downtime | The old build and the cron-kicked old worker keep writing the old tables during rollout. Rows created then are missing from `audio_jobs` and get regenerated. The `term_narrations` RLS policy calls `has_narration_access` directly                                                                                                                                           | Dual-write or a trigger during the transition. Keep `has_narration_access(uuid)` with the same name and signature, re-pointed at the new tables                                       |
| D7  | Editable model ids in the DB bypass code review                             | A typo bricks production, the class of incident behind commit `5619d35`                                                                                                                                                                                                                                                                                                        | Keep an allowlist of model ids in the registry and validate on write                                                                                                                  |
| D8  | F2-A's hash-skip ignores the model and rubric                               | `computeTermEvalHash` covers term fields only. Changing `rubric.ts`, `FIT_WEIGHT`, `PLAIN_THRESHOLD` or `MODEL` still matches the stored hash and serves an outdated score. `plain` has the threshold baked in                                                                                                                                                                 | Add a rubric and model version to the hash. Store the raw probability, not only the boolean                                                                                           |
| D9  | A per-user `daily_cap` for term narration does not fit shared audio         | One file per term is shared. A cache hit costs nothing and must not count                                                                                                                                                                                                                                                                                                      | Count generations, not plays, attributed to the user who triggered them. Decide once whether failures count (E22)                                                                     |
| D10 | Secret rollout has no signal                                                | The cron header is edited by hand in the Dashboard or Vault, and the app's self-kick and the Telegram Edge Functions also depend on the secret. A 401 cron is silent                                                                                                                                                                                                           | Accept both secrets for one release. Add a health signal on the last successful tick, shown in the hub                                                                                |
| D11 | Consumers to update                                                         | Narration access is wired in the Read, Review and Collection setup actions and `/admin/narration`. Telegram and the widget do not use narration or credits, so no change there                                                                                                                                                                                                 | Regenerate `database.types.ts`, expect knip to flag leftovers in `lib/narration/`, and update `docs/ai-credits.md` and `AGENTS.md`                                                    |

### 6.2 Issues the first pass missed (verified)

| #   | Issue                                                                                                                                                                                                                     | Evidence                                                                                   | Impact                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ |
| M1  | `user_settings` is user-writable and the ciphertext readable (see F12)                                                                                                                                                    | `20260730220000_rename_user_llm_settings.sql:7-13`                                         | Medium                               |
| M2  | `Cache-Control: private, max-age=86400` defeats the ETag design. After a term edit, users hear stale audio for up to 24 hours, not only after allowlist removal (E13)                                                     | `app/api/narration/[termId]/route.ts:13`                                                   | Medium. Hash-keyed URLs fix it       |
| M3  | `claim_term_narration` re-claims every `failed` row on every request. With F4's preload, a persistent failure (quota, bad voice) means a failing paid call on every card view. F6 is dropped, but this raises F4's weight | `20260904190000_narration.sql`                                                             | Medium                               |
| M4  | The quiz has no `maxDuration` and no abort signal. A platform kill after the charge leaves credits spent                                                                                                                  | `app/(private)/jargon/quiz/` has none; only Read, Stories and the narration routes set one | Medium                               |
| M5  | `saveLlmSettingsAction` returns raw `err.message`, which can be "Missing LLM_SETTINGS_ENCRYPTION_KEY" or a Postgres error                                                                                                 | `app/(private)/jargon/settings/actions.ts:159`                                             | Low to medium. Same leak class as F8 |
| M6  | `narration_sync_jobs.started_by ... on delete restrict` blocks deleting any admin who started a sync                                                                                                                      | `20260920120000_narration_sync_jobs.sql`                                                   | Low. Relevant to E6                  |
| M7  | Each request that loses the narration claim holds a function open up to 30 s polling                                                                                                                                      | `lib/narration/service.ts:14`                                                              | Low                                  |
| M8  | The internal secret is compared with `!==`, not constant time, and one secret gates Telegram and narration                                                                                                                | `lib/auth/internal-api.ts:18`                                                              | Low                                  |
| M9  | Story cap check and claim are not atomic, so parallel requests for different stories can exceed 20                                                                                                                        | `lib/stories/narration.ts:79-89`                                                           | Low                                  |
| M10 | `term_narrations` RLS lets any allowlisted user select every row and `storage_path`                                                                                                                                       | `20260904190000_narration.sql`                                                             | Low                                  |

### 6.3 Priority changes from the review

- Raise **F12** to Medium (done above). Put **F4's Review preload fix first** in the cheap step: it costs the most for the least work.
- Add to the cheap step: the E1 fix, a `maxDuration` on the term narration route and the quiz, M2 (hash-keyed or shorter-cache URLs) and M5.
- F5 stays Medium, after F4, F2 and F8.
- Split the main build into **expand migration, code release, contract migration** (D1, D6). Do **F14-A after F1-A**, not together.
- E15 and E16 are the real bill and outage risks and need their dry-run checks (5.3). E20 (secret change) is low risk by comparison.

- Phase 4 (audio jobs expand): in progress, split into 4a migration and 4b app (second secret, heartbeat, versioned hash).
