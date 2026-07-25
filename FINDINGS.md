# Architecture Review — jargon-gym

Date: 2026-07-25
Scope: hot spot from the last three commits (`Add telegram interation`, `Add Ubersicht widget`, `Pivot toward user collections`) — the telegram integration and the settings refactor. No `CONTEXT.md` or `docs/adr/` exist yet, so this review isn't yet grounded in a shared domain glossary or prior decisions.

Full visual report (Mermaid + before/after diagrams) was generated at review time; this file is the durable, text-only record of the findings.

## Conventions going forward

- **Any component that can be built with shadcn/ui on a React Aria base must be.** Applies from now on to new components and to existing components when they're touched. Rationale: consistency and clarity across user flows — one set of interaction/accessibility primitives instead of ad hoc UI (e.g. `components/jargon/settings/ui.tsx`'s hand-rolled primitives are a candidate for migration under this rule).

## Candidates

### 1. Give "mark term known" one interface — Strong

**Files:** `app/(private)/jargon/actions.ts`, `app/api/widget/mark-known/route.ts`, `supabase/functions/telegram-webhook/index.ts`, `supabase/migrations/20260725200000_telegram.sql` (`mark_term_known`), `lib/jargon/queries.ts` (`upsertTermKnown`)

The same user action — "I know this term" — has three implementations with two different postconditions:

| Channel | Pool check? | Clears `all_caught_up_at`? |
|---|---|---|
| Web UI (`setTermKnown` → `upsertTermKnown`) | No | No |
| Widget API (`isTermInReviewPool` then `upsertTermKnown`) | Yes (TS) | No |
| Telegram (`mark_term_known` RPC) | Yes (SQL) | Yes |

**Problem:** nothing enforces that the three implementations agree; this is a live data-integrity risk, not a hypothetical one.

**Solution:** one deep `markTermKnown` module owning the pool check and the postconditions. Web, widget, and bot become thin adapters that call it.

**Wins:** locality (bug lives in one place), leverage (one interface, three call sites), interface shrinks to a single call.

### 2. Stop defining the review pool twice — Strong

**Files:** `lib/jargon/queries.ts` (`resolveReviewDomainIds`), `supabase/migrations/20260725200000_telegram.sql` (`telegram_review_domain_ids`)

"What is my review pool" is answered by a TypeScript predicate (`owned ∪ collection`, intersected with active) and a Postgres predicate (`active AND (owned OR in collection)`) independently. They agree today by coincidence, not by construction.

**Solution:** pick one seam — either the SQL function becomes the single source of truth and Next calls it, or vice versa with SQL wrapping the same predicate via RPC.

**Wins:** one definition instead of two that can silently drift.

### 3. Collapse the Telegram send flow into term-service — Worth exploring

**Files:** `supabase/functions/_shared/term-service.ts`, `supabase/functions/telegram-send-due/index.ts`, `supabase/functions/telegram-webhook/index.ts`

`term-service.ts` exists as the shared seam (`sendTermOrCaughtUp`, `sendTermCard`) and the webhook uses it, but the cron handler (`telegram-send-due`) bypasses it and hand-rolls the same policy inline (count → caught-up message → pick → clear flag → send → record), plus extra skip-if-already-caught-up logic the shared helper doesn't have.

**Solution:** extend `sendTermOrCaughtUp` to cover the skip-if-already-caught-up case; have `telegram-send-due` call it exclusively.

**Wins:** deletion test passes properly (deleting term-service today would only break the webhook — it should break both); removes ~40 duplicated lines.

### 4. Telegram link module has no locality — Worth exploring

**Files:** `lib/telegram/links.ts`, `supabase/functions/_shared/token.ts`, `supabase/functions/telegram-webhook/index.ts` (`handleStart`), SQL `complete_telegram_link`

Understanding "how does linking Telegram work" means opening the settings UI, a server action, `lib/telegram/links.ts`, the webhook, `_shared/token.ts`, and a SQL RPC. The hashing algorithm is duplicated (Node `crypto` vs Web Crypto) because the two runtimes can't share the module.

**Note:** this duplication is partly justified — two real adapters (Node, Deno) is a legitimate seam. The friction is that the contract between them is implicit rather than named.

**Solution:** don't merge the runtimes; name the shared hash contract explicitly (doc comment or type) so both sides are visibly satisfying the same spec.

### 5. Settings is six shallow layers for two actions — Worth exploring

**Files:** `app/(private)/jargon/settings/{page.tsx,actions.ts}`, `components/jargon/settings/{settings-page,telegram-panel,widget-panel,ui}.tsx`

`actions.ts` mostly mirrors `lib/telegram/links.ts` and `lib/jargon/queries.ts` 1:1, adding a try/catch layer without adding a rule. `loadWidgetTokens` / `loadTelegramStatus` are exported but never called — `page.tsx` already loads server-side.

**Solution:** delete the dead loaders; trim `actions.ts` to only the actions that add real behavior (revalidation, auth), and let panels call thin wrappers directly.

**Wins:** interface shrinks without implementation growing; removes ~30 lines of pure passthrough.

### 6. DomainActionsMenu is a mutation hub, not a menu — Worth exploring

**Files:** `components/jargon/domain-actions-menu.tsx` (192 LOC), `app/(private)/jargon/actions.ts`

A presentational menu directly imports five server actions (`deleteOwnedDomain`, `removeFromCollection`, `shareDomain`, `toggleActiveForReview`, `unshareDomain`) and owns refresh/navigation after each. There's no "collection" module boundary — changing collection semantics means touching SQL RLS, `queries.ts`, the actions, this menu, the tabs, and the browse page.

**Solution:** deepen a `useCollectionActions` (or equivalent) module owning the five mutations plus their post-mutation refresh. The menu becomes a dumb dispatcher.

**Wins:** menu becomes testable without mocking five actions; module reusable from tabs/browse too.

### 7. `queries.ts` is one file playing four modules — Strong

**Files:** `lib/jargon/queries.ts` (438 LOC), `supabase/functions/_shared/term-service.ts` (92 LOC)

Collection CRUD, known-state, shared-domain browse, and widget projection are all interleaved in one file — interface is nearly as wide as the implementation. The Edge `term-service.ts` is a parallel, non-sharing module for the same domain (picks unknown terms via RPC while Next reads tables directly). No single module owns "what does the user know."

**Solution:** split by concept — collections / known-state / browse / widget projection. The known-state module becomes the natural home for candidate 1's `markTermKnown` and candidate 2's review-pool predicate.

**Wins:** locality (a known-state bug has one file to check, not 438 mixed-concern lines); this split is the prerequisite for candidates 1 and 2, not an alternative to them.

## Top recommendation

Start with **candidate 7** (split `queries.ts`), then **candidate 1** (deepen `markTermKnown`). Candidate 1 is the highest-stakes friction — three implementations of "mark known" with two different postconditions — but `queries.ts` needs to be split first to give that module a clean home. Candidate 2 (review-pool duplication) falls out of the same work almost for free.
