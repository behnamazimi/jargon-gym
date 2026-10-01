# Import flow, phase 0: Unblock

Planning only: no code has been changed. Written 2026-10-01.

## Context

Today a phone user can only create a collection by hand-writing JSON, the only help is a terminal command, errors cite paths like `terms[3].category`, a typo in the JSON `domain` silently forks a collection, and there is no language choice. Phase 0 removes the worst of this _without_ the paste importer (phase 1). It adds no migration and no new dependency.

### Verified against the code (2026-10-01, `main` + `import-flow-phase-0` branch, clean)

All paths, tables and functions the brief names for phase 0 exist. Differences and new findings:

| Finding                                                                                                                                                                                                                                                                                                                              | Effect on the plan                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `createOrGetOwnedDomain` is defined in `lib/jargon/collection-mutations.ts` and re-exported by `lib/jargon/collections.ts`; callers import the latter. It's only used by `execute-import.ts`, so import is the only way to create a collection.                                                                                      | Add a strict `createOwnedDomain` beside it; reuse the get-or-create for import.                     |
| **Latent bug:** `.ilike("name", x)` / `.ilike("term", x)` in `createOrGetOwnedDomain`, `domainExisted`, `buildImportPreview`, `upsertImportTerm`, `updateOwnedDomain` treat `%` and `_` in user text as wildcards. Importing the term `a_b` updates an existing `axb`, and the preview (plain JS compare) disagrees with the commit. | Fix in phase 0 with one escape helper (task 1). Real data-corruption risk in the flow being edited. |
| `domains` already has an insert RLS policy (`owner_id = auth.uid()`), a `language` column (no check constraint) and `domains_owner_name_idx (owner_id, lower(name))`.                                                                                                                                                                | Empty-collection creation needs **no migration and no RLS change**.                                 |
| A collection with 0 terms renders the filters plus "No terms match your filters." (`term-list.tsx`). The header already hides progress at 0.                                                                                                                                                                                         | Needs a real empty state, or empty collections look broken.                                         |
| `TermFormDialog` already receives `domainTerms`, so the as-you-type duplicate check is an in-memory lookup. `createTerm` already maps `23505` to a friendly message.                                                                                                                                                                 | No new query for the duplicate check.                                                               |
| `term-form-dialog.tsx`, `domain-form-dialog.tsx`, `import-page.tsx` and `jargon-page.tsx` use direct `useEffect`.                                                                                                                                                                                                                    | New code avoids it (see section 6). I only remove the ones in files I rewrite.                      |
| Vitest is node-only, `**/*.test.ts`. No component tests. RPC/RLS checks are hand-run SQL in `supabase/tests/`.                                                                                                                                                                                                                       | Keep logic in pure `lib/` functions. UI is checked in the browser.                                  |
| Sliced activation: no table, column or migration found.                                                                                                                                                                                                                                                                              | Irrelevant to phase 0. Empty collections are marked active like imports.                            |
| `components/ui/*` are DaisyUI-class wrappers over React Aria (`Dialog`, `Collapsible`, `Select`, `ToggleGroup`, `Alert`).                                                                                                                                                                                                            | Reuse them.                                                                                         |
| The JSON commit has **no transaction** until phase 1.                                                                                                                                                                                                                                                                                | Phase 0's failure copy must not claim "nothing was imported" (section 7, 8).                        |

Not read: `docs/trace.md`. Phase 0 changes nothing Read, Review or Quiz select. The one touch point is an active, empty, owned collection, which gets a verification task.

---

## 1. Goal and scope

**Goal:** a non-developer on a phone can start a collection and add terms, understands every message, can't silently fork a collection by typo, and can pick Dutch.

**In:**

1. "More import options" disclosure holds the AI-skill card (`npx`, slash command). Nothing developer-facing in the default view.
2. Plain-language import errors that name the term, never a path. Honest commit-failure copy.
3. Today's preview gains an editable collection name, a "did you mean…?" guard, and an English/Dutch choice.
4. Create an empty named collection (name and language).
5. The Add-term dialog becomes Term and Definition, with "More details", "Save and add another", and a duplicate check as you type.
6. Tour copy, entry-point labels and the two user-guide lines that mention import.
7. The `ilike` wildcard fix.

**Out (deferred):**

- The chooser, search-first, the paste box, detection, file sniffing, Papa Parse, the app guides (phase 1).
- Nullable category or definition, unfinished terms, the transactional commit RPC, Skip/Update, the 500-term cap, the draft in local storage, destination presets, optional `language` in the JSON payload, "Copy as text"/CSV export, multi-line paste in Add term (phase 1).
- Remembered last-used language or collection, the Dutch-content hint, "you added a shared collection with this name" notice (phase 1).
- Logging and analytics.
- Requests, push, share target (phases 2–3).

## 2. User stories (phone first)

1. _As someone who just signed up with no collections_, I tap "Start an empty collection", type a name, choose Dutch, and land in a collection that tells me to add my first term.
2. _As someone adding words I just heard_, I type a term and what it means, tap "Save and add another", and the sheet stays open and ready. I never see eight other fields unless I ask.
3. _As someone who typed a word I already have_, I'm told as I type, and can open it, before I hit save.
4. _As someone importing a JSON file a friend sent_, a mistake reads "'Churn' needs a category." and I know what to fix.
5. _As someone who mistyped "Startup finanse"_, I'm asked whether I meant my existing "Startup Finance" before anything is created.
6. _As a Dutch learner importing a list_, I can choose Dutch for the new collection on the preview.
7. _As a non-developer_, I never see `npx` or a terminal command unless I open "More import options".

## 3. Screens

Artifact reference: https://claude.ai/artifact/KDHErTpsHzPQvWjPe2YAsE (sections "Today", "Add a collection", "Paste a list", "One term").

| Screen                                                | Artifact source                                | Phase 0 shape                                                                                                                                                                                              |
| ----------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Add a collection** (`/jargon/import`, retitled)     | "Add a collection" chooser, partly             | Not the chooser. Order: _Start an empty collection_ card (opens dialog), then the JSON import card (existing, copy simplified), then a quiet **More import options** disclosure holding the AI-skill card. |
| **Create collection** dialog                          | chooser's "New empty collection"               | Name, Language (English/Dutch), Create / Cancel.                                                                                                                                                           |
| **Preview** (today's "Review & import")               | "Paste a list · Step 2 · Check", top part only | Destination card: name input, near-duplicate guard, language, then today's overwrite block and button.                                                                                                     |
| **Empty collection** (new)                            | "Capture · finish later" layout, adapted       | Empty state with **Add a term** and **Import terms**.                                                                                                                                                      |
| **Add a term**                                        | "Capture · now · Nine fields become two"       | Term, Definition, duplicate alert, "More details", Save and add another / Save.                                                                                                                            |
| Library empty state, Read/Review/Mastery empty states | "Add a collection" entry points                | Label and copy only.                                                                                                                                                                                       |

States:

- **Create dialog**
  - Empty: Create is disabled until a name exists.
  - Loading: button reads "Creating…", fields disabled.
  - Error: inline destructive alert (`You already have a collection named "X".`, or a generic retry line).
  - Success: dialog closes and navigates to `/jargon?domain=<id>`.
- **Preview**
  - Loading: re-validation after a name change disables the button.
  - Error: same failure panel as today.
  - Success: redirect with the existing `?imported=N` banner.
  - The guard shows only when a near match exists.
- **Empty collection state**
  - Owner: Add a term / Import terms.
  - Non-owner: the existing "No terms" copy.
- **Add-term sheet**
  - Empty: Term empty, Save disabled.
  - Loading: "Saving…".
  - Error: inline alert above the footer.
  - Success: "Save" closes. "Save and add another" toasts `Added "Churn"`, clears Term and Definition, keeps the category, refocuses Term.
  - Duplicate: alert with **Open it**, and Save disabled.

## 4. Data model and migrations

**No migration.** The `domains` table already has every column. The RLS policy "Owners manage domains" (insert, `owner_id = auth.uid()`) already allows a user to create an empty collection. The `domains_owner_name_idx (owner_id, lower(name))` unique index backs the duplicate-name rule.

- **RLS:** unchanged. The new SQL test (task 12) proves that a user can insert an own-owned domain with `language = 'nl'`, can't insert one owned by another user, and gets `23505` on a case-variant name.
- **Backfill:** none.
- **Rollback:** nothing to roll back in the DB. See section 11 for the cascade reasoning.

## 5. Server side

All actions verify the session with `requireAuthenticatedClient` / `getSessionUser`, as the existing ones do.

**New**

- `lib/jargon/like-escape.ts`: `escapeLike(value)` escapes `\`, `%`, `_`. Used at every `ilike` that takes user text (`createOrGetOwnedDomain`, `domainExisted`, `buildImportPreview`, `upsertImportTerm`, `updateOwnedDomain`). Grep for any other `.ilike(` with user input and cover it.
- `lib/jargon/collection-mutations.ts`: `createOwnedDomain(client, ownerId, { name, description?, language })`.
  - Looks for an existing owned name (escaped, case-insensitive). If found, throws `DomainMutationError('You already have a collection named "X".')`.
  - Inserts it as private, with the language. A `23505` race maps to the same error.
  - Then `setDomainActiveForReview(…, true)`, best effort: if that fails, log it and still succeed, because the collection exists and the user can toggle it.
- `app/(private)/jargon/actions-collections.ts`: `createEmptyCollection(input: { name: string; language: DomainLanguage })` returns `{ error?: string; domainId?: string }`.
  - Validates with a new `newCollectionSchema` in `lib/jargon/domain-schema.ts`: trimmed name, 1–100 characters, language enum.
  - Calls `createOwnedDomain`, then `revalidatePath("/jargon")`.
  - Failures: not signed in, invalid input (message from the schema), duplicate name, anything else (`Couldn't create that collection. Try again.`).
- `hooks/use-collection-actions.ts`: `createEmptyCollection(input, onSuccess)` via `run`.
- `lib/jargon/import/similar-name.ts`: `findSimilarName(input, existingNames): { kind: "exact" | "near"; name: string } | null`.
  - Normalise: trim, collapse whitespace, strip zero-width characters, lowercase.
  - Exact when normalised values are equal.
  - Near when the Damerau-Levenshtein distance is ≤ `min(2, max(1, floor(len × 0.15)))` and both names are at least 4 characters.
  - Never near when the only differences are digits ("Biology 1" vs "Biology 2").
  - Picks the closest. No new dependency (about 20 lines).
- `lib/jargon/term-duplicates.ts`: `findDuplicateTerm(input, terms)` (trim and lowercase, accents differ, Dutch articles differ) and `mostUsedCategory(terms)` (ties go alphabetical, fallback `"General"`).
- `lib/jargon/import/issue-messages.ts`: `describeIssues(zodIssues, rawParsed)` and `jsonSyntaxMessage(error, raw)`. See section 7 for the rule table.

**Changed**

- `validateImportJson(raw, overrides?)` and `confirmImport(raw, options?)` in `app/(private)/jargon/import/actions.ts` take `ImportOverrides = { domainName?: string; language?: DomainLanguage }`, validated server-side (enum, non-empty trimmed name). The override replaces `payload.domain` before `buildImportPreview` and `executeImport`. The UI wins. The server always recomputes `isMerge` and conflicts, so the client never decides.
- `ImportPreview` gains `domainLanguage: DomainLanguage | null` (the existing collection's, when merging) and `termCount` etc. stay.
- `createOrGetOwnedDomain(client, ownerId, name, description?, language?)`: language applies **only on insert**. An existing collection keeps its language.
- `ImportValidationIssue` becomes `{ message: string }` (plain sentence). `path`, `expected` and `received` are dropped, and `JargonErrorIssue` in `components/jargon/shared/error-alert.tsx` makes `path` optional and renders it only when present.
- `formatImportFailure` / `supabaseFailure`: no raw Postgres text, no "Error code" for users. Known codes map to plain lines; unknown ones to a generic line. Keep the term in `context`.

**Failure results** (all returned, none thrown to the UI): not signed in, empty input, bad JSON, issues list, duplicate collection name, conflicts need confirmation (unchanged), step failure with the term it stopped at.

## 6. UI components

DaisyUI via `components/ui/*`. No new direct `useEffect`. Inputs and textareas ≥16px on phones (check that `Input`/`Textarea` already use `text-base` below `sm`).

- `components/jargon/create-collection-dialog.tsx` (new). `Dialog` + `Field` + `Input` + `Select`. Props: `isOpen`, `onOpenChange`, `existingNames`. Live guard: `findSimilarName` as a derived value, shown as an info `Alert` ("You already have "Startup Finance". Open it instead?" with a link to it). The user can still continue on a near match. An exact match disables Create. On success, `router.push(/jargon?domain=id)`. Form state lives in an inner component that mounts when the dialog opens, so it resets without an effect.
- `components/jargon/add-term-dialog.tsx` (new, create only).
  - Inner `AddTermForm` mounts per open, so state resets by `key` instead of an effect.
  - Core: Term (autofocus) and Definition.
  - Duplicate alert from `findDuplicateTerm` over a `useMemo` Map of `domainTerms`, which is cheap and needs no debounce. "Open it" closes the sheet and sets the Library search to that term via a new `onOpenTerm` prop (`jargon-page.tsx` already owns `setSearchQuery`).
  - "More details" is a `Collapsible`: Category (pre-filled with `mostUsedCategory`, per the owner's answer), Example, Mental model, In practice, Anti-example, Debated, Note, and the existing `TermRelationshipsEditor`.
  - Footer: Cancel, **Save and add another**, **Save**, in the page flow, not a fixed bar (iOS keyboard).
  - Save-and-add-another bumps a `key` counter to clear the fields while keeping the dialog open, and toasts via the existing `useToast`.
- `components/jargon/term-form-fields.tsx`: extract `TermDetailFields` (category through note) so the add and edit forms share it. `term-form-dialog.tsx` becomes **edit only** (the `mode` prop goes away, so `jargon-page.tsx` swaps to `AddTermDialog` and `term-actions-menu.tsx` keeps editing). The edit form keeps the nine fields.
- `components/jargon/jargon-page.tsx`: when `isOwner && terms.length === 0`, render `EmptyState` (`components/jargon/empty-state.tsx`) with **Add a term** and **Import terms** instead of the filters and list.
- `components/jargon/import/import-preview.tsx`: destination block (name `Input` with blur/Enter re-validate through a transition, guard `Alert` with "Use "X"" / "Keep my name", language `ToggleGroup` for new collections, read-only language line when merging), `role="status"` summary, then the existing overwrite block with new copy.
- `components/jargon/import/import-page.tsx`: pass overrides, hold `ImportOverrides`, replace the scroll-into-view `useEffect` with a ref callback on the preview container (scroll and move focus to its heading on mount).
- `components/jargon/import/import-llm-prompt.tsx` / `import-page.tsx`: the skill card moves into a "More import options" `Collapsible` at the bottom, closed by default. The content is only mounted when open (render conditionally), so it isn't read by assistive tech either.
- `components/jargon/empty-collection.tsx`: third button **Start an empty collection** (opens the dialog).
- `app/(private)/jargon/import/layout.tsx`: title and description updated.

## 7. Copy

Section 6 of the plan (request-flow use / never-use) has nothing to check: phase 0 has no request strings. I checked every string below anyway. Nothing says "AI", "instantly" or "generating" outside the developer-only skill card that sits inside "More import options".

**Page.** Title "Add a collection". Description "Start an empty collection, or import terms from a JSON file."

**Empty-collection card.** Title "Start an empty collection". Body "Name it, pick a language, then add terms one at a time." Button "Start an empty collection".

**Create dialog.** Title "New collection". Fields "Name" (placeholder `e.g. Startup finance`) and "Language". Buttons "Create collection" / "Creating…" / "Cancel". Guard "You already have "{name}". Open it instead?" Errors `You already have a collection named "{name}".`, "Enter a name for your collection.", "Keep the name under 100 characters.", "Couldn't create that collection. Try again."

**Empty collection state.** Title "No terms yet". Body "Add your first term, or import a list." Buttons "Add a term", "Import terms".

**Add term.** Title "Add a term". Fields "Term" (placeholder `e.g. Idempotent`) and "Definition" (placeholder `What does it mean?`). Disclosure "More details" with the hint "Category, example, notes and links to other terms". Buttons "Save and add another", "Save", "Saving…", "Cancel". Duplicate: `"{term}" is already in this collection.` + "Open it" + hint `Different meaning? Add a qualifier, like "SLA (legal)".` Toast `Added "{term}"`. Existing server message kept: `A term named "{term}" already exists in this collection.`

**Import card.** Title "Import from JSON". Description "Paste JSON or choose a .json file. Nothing is saved until you check it and confirm." Button "Check terms" / "Checking…". Disclosure "More import options" with its card title "Generate JSON with an AI skill (for developers)". Also: "Choose a .json file" and the empty message below.

**Preview.** Title "Check before adding". Summary `{N} terms and {M} links` then either `Creating a new collection` or `Adding to your existing "{name}"`. Language label "Language", options English / Dutch, read-only `Language: Dutch (set by this collection)`. Name label "Collection name". Guard `You already have "{existing}". Add to it instead?` with buttons `Use "{existing}"` and "Keep my name". Overwrite block title `{N} terms are already in this collection`, body "Importing replaces their definitions and details. Your progress on them is kept.", checkbox `Replace {N} terms with the imported ones`. Button "Add {N} terms" / "Add {N} terms and replace {K}" / "Adding…".

**Errors (replacing path-style text).** Items cap at 10, then "and {n} more".

| Situation                                       | New message                                                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty paste                                     | "Nothing to check yet. Paste JSON or choose a .json file."                                                                                                                |
| Not JSON at all (doesn't start with `{` or `[`) | "This doesn't look like JSON. It should start with { and list your terms."                                                                                                |
| Syntax error                                    | "We couldn't read this as JSON. Look near line {L}, column {C} for a missing comma, quote or bracket."                                                                    |
| Missing collection name                         | `Add a collection name, like "domain": "Startup finance".`                                                                                                                |
| No terms                                        | "There are no terms in this file. Add at least one."                                                                                                                      |
| Term without a name                             | "Term {N} has no name."                                                                                                                                                   |
| Missing category / definition                   | `"{term}" needs a category.` / `"{term}" needs a definition.`                                                                                                             |
| Wrong type                                      | `"{term}": {field} should be text.`                                                                                                                                       |
| Same term twice                                 | `"{term}" appears twice. Keep one of them.`                                                                                                                               |
| Link to a missing term                          | `The link from "{a}" to "{b}" points to a term that isn't in your list: "{b}".`                                                                                           |
| Duplicate link                                  | `The link from "{a}" to "{b}" ({type}) is listed twice.`                                                                                                                  |
| Term linked to itself                           | `"{term}" can't be linked to itself.`                                                                                                                                     |
| Title / hint for the list                       | "Fix these first" / "Fix the items below, then check again."                                                                                                              |
| Unsupported file                                | `"{file}" isn't a JSON file. Choose a .json file or paste its contents.`                                                                                                  |
| Empty file                                      | `"{file}" is empty.`                                                                                                                                                      |
| Unreadable file                                 | `We couldn't read "{file}". Try another file or paste the contents.`                                                                                                      |
| Commit stopped (no transaction yet)             | `The import stopped at "{term}". Some terms before it may already be added. Check the collection, then try again. Terms that were added will be updated, not duplicated.` |
| Commit stopped, unknown term                    | "The import stopped part way. Some terms may already be added. Check the collection, then try again."                                                                     |
| Not signed in                                   | "Sign in to add terms." (replaces "Log in to import jargon.")                                                                                                             |

**Entry points.** Buttons that say "Import jargon" (empty-collection, mastery, read caught-up, review empty, collection error page) become "Add your own terms". Account nav "Import" becomes "Add collection". The sidebar already says "Add collection".

**Tour (interim, true for phase 0).**

- `welcome` step 2: title "Or bring your own", body "Start an empty collection and add terms one by one, or import a JSON file."
- `import` chapter step 1 (`import-json`): title "Import from JSON", body "Paste JSON or choose a .json file with your terms."
- `import` chapter step 2 (`import-validate`): title "Check before adding", body "See what will be added first. Nothing saves until you confirm."
- `app-account` step body: "Browse collections, add your own, check Mastery, and open Settings."
- The phase 1 rewrite ("Paste a list from Notes…") and target retargeting are deferred. **No change to `lib/tour/targets.ts` or its tests**, because `import-json` and `import-validate` stay on the same elements. Add a check that both are still in the DOM.

**User guide.** `components/content/how-terms-work-page.tsx` line ~106 ("You can import a JSON list, paste…") and `before-you-sign-up-page.tsx` line ~113: read both, and edit only if they now overstate or understate. Copy-only.

## 8. Edge cases

From section 8 of the plan, phase 0 handling:

- **8.2 Duplicates**
  - Case and whitespace: the Add-term check uses trim and lowercase, the same rule as the index. `escapeLike` makes the import preview and commit agree.
  - Accent variants ("café" / "cafe") and Dutch articles ("de vergadering" / "vergadering") are different terms, and each gets a test row.
  - The same term twice in one JSON file keeps today's block, with plain wording (collapsing is phase 1).
  - Matching runs against the destination collection only.
  - "Keep both" isn't offered. The qualifier hint is in the duplicate alert.
  - Update (replace) stays in place by term id, so learning history survives, and the overwrite copy now says so.
- **8.3 Destination and names**
  - Near-duplicate names get the guard, in the preview and in the create dialog.
  - Only owned collections are matched (the preview already queries `owner_id`).
  - An existing destination's language wins, shown read-only.
  - The collection is marked active after import (existing) and after empty creation.
  - The redirect after import goes to the collection that received the terms (existing).
  - Deferred to phase 1: the notice when the typed name matches a shared collection the user only added, and the Dutch/English content hint.
- **8.4 Commit (the parts that apply before phase 1)**
  - Still no transaction, so the failure copy says some terms may have been added and a retry won't duplicate (upsert by name).
  - Double tap: the button is disabled while the transition runs. A retry is safe for the same reason.
  - The draft stays in memory only; local-storage draft and one-transaction commit are phase 1.
  - No audio or evaluation work at import, and nothing changes there.
- **8.7 Quick capture**
  - The Add-term sheet only exists inside an owned collection, so "no collection yet" is solved by the new Start-an-empty-collection button in the empty state.
  - The duplicate check is an in-memory lookup, so there's nothing to debounce.
  - Remembered destination and multi-line paste are phase 1.
- **8.8 Platform and accessibility**
  - Inputs ≥16px so iOS doesn't zoom. Primary buttons stay in the flow, not fixed.
  - `role="status"` on the preview summary and on the duplicate alert.
  - Focus moves to the preview heading after Check. Every control has a label.
  - Offline: the commit needs the network. A failed action shows the generic retry line.
- **8.9 Tour and docs:** tour copy above. `AGENTS.md` and `/how-terms-work` get checked, not assumed.

**New edge cases found:**

1. `ilike` wildcard bug (task 1), including a unit-test table with `a_b`, `100%`, `back\slash`.
2. Zero-term owned collection: header, filters, list, Read, Review, Triage, Mastery, Quiz and Stories must not divide by zero or crash. Task 9 verifies each, and fixes only what breaks. The same state arises when an owner deletes their last term, so the empty state must also cover that case.
3. An active empty collection must not trip the TRACE queue (`lib/trace-queue/`). Read `docs/trace.md` when doing task 9.
4. Name race: two tabs create the same name, so the `23505` from the index maps to the duplicate message.
5. Names with zero-width characters or only punctuation; names over 100 characters.
6. A collection name that already exists in a different case: exact match, not near, create is blocked with the same message the server gives.
7. The "Open it" target is deleted or filtered out between render and click: set the search anyway and show the normal result.
8. A JSON file that carries a `language` key is accepted and the key is ignored today (zod strips unknown keys). Phase 1 adds it.
9. The skill card's command text must not appear in the page text until "More import options" is opened.
10. Stale `domainTerms` after another tab adds the same term: the server's `23505` message covers it.

## 9. Tests

`pnpm test` (Vitest, node) and `pnpm check` must pass. All table-driven:

| File                                       | Cases                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/jargon/like-escape.test.ts`           | `%`, `_`, `\`, mixed, empty, plain text unchanged.                                                                                                                                                                                                                                                                                                                                               |
| `lib/jargon/import/similar-name.test.ts`   | `Startup finanse` near `Startup Finance`; `startup finance` exact; trailing NBSP and zero-width; `Dutch at word` near `Dutch at work`; `Go`/`Gu` no (too short); `Rust`/`Ruby` no; `Biology 1`/`Biology 2` no; several candidates pick the closest; empty list null.                                                                                                                             |
| `lib/jargon/import/issue-messages.test.ts` | Through `parseImportJson` with real JSON strings: missing category, missing definition, empty term, wrong type, no terms, no domain, duplicate term, relationship to missing term, duplicate and self relationship, cap at 10 and "and N more", `{` that isn't JSON, trailing comma (line and column), empty input. Also asserts **no message contains `terms[`, `terms.` or `relationships[`**. |
| `lib/jargon/import/failure-copy.test.ts`   | `formatImportFailure` for `23505`, `23503`, `42501`, plain `Error` and unknown, with and without a term; no raw DB text and no "Error code".                                                                                                                                                                                                                                                     |
| `lib/jargon/term-duplicates.test.ts`       | Case, padding, accent, Dutch article, qualifier `SLA (legal)` vs `SLA`, `mostUsedCategory` (empty list `General`, tie alphabetical, one category).                                                                                                                                                                                                                                               |
| `lib/jargon/domain-schema.test.ts`         | `newCollectionSchema`: blank, 100/101 characters, bad language, trims.                                                                                                                                                                                                                                                                                                                           |

**RPC and RLS integration (hand-run, like the existing ones):** `supabase/tests/empty_collection.sql`. As a user: insert a private domain with `language = 'nl'`, check the active row shape, get `23505` on `lower(name)` case variants, and be refused when inserting with another user's `owner_id`. Run with `psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/empty_collection.sql`.

**Browser checks** (preview tools, 375px and desktop, light and dim): the full flow in section 10.

## 10. Device checklist

From section 10 of the plan, only what phase 0 depends on:

- iPhone Safari tab and Home Screen app: no zoom when focusing Name, Term, Definition or the JSON box; the primary button stays reachable with the keyboard open (create dialog, Add-term sheet, preview name field). Same on an Android tab.
- "Save and add another": focus returns to Term and the keyboard stays up.
- 200-card scroll and clipboard items are phase 1; not needed.
- Not applicable in phase 0: paste sources, file picker, Quizlet, Excel CSV, Android share target, push, email deliverability.

Flow to run: sign up with no collections → Start an empty collection (Dutch) → empty state → add three terms in a row → duplicate warning → open it → import a JSON with a missing category (plain error) → fix → preview with a near-duplicate name → "Use existing" → confirm → banner → `npx` not visible until "More import options" is opened.

## 11. Rollout and back-out

**No feature flag.** The change is additive: no migration, no new table, no changed read path. A flag would double the surface for little safety.

**Release:** one PR. Merge, then run the device flow above on production.

**Back-out:** revert the PR. Nothing in the database needs undoing.

- Empty collections created in the meantime are valid owned collections, and the old code renders them (with "No terms match your filters." in the old UI).
- Collections imported as Dutch keep `language = 'nl'`, which the old code already reads.
- **Cascade caution:** deleting a term wipes its `user_progress`, `review_state`, `review_events`, `term_narrations`, term evaluations, `term_relationships` and `triage_not_yet`. Do **not** "clean up" a bad release by deleting terms or collections with SQL. If cleanup is ever needed, restrict it to collections with `not exists (select 1 from terms where domain_id = d.id)`, which have no history. Replacing a term during import is an in-place update, which keeps history.

## 12. Task breakdown

Each step is independently reviewable. Run `pnpm test` after 1–5, and `pnpm check` after each group.

1. **`escapeLike` and the ilike fix.** New `lib/jargon/like-escape.ts` + test. Touch `lib/jargon/collection-mutations.ts`, `lib/jargon/import/execute-import.ts`, `lib/jargon/import/validate-import.ts`. Grep `.ilike(` for others.
2. **Name similarity.** New `lib/jargon/import/similar-name.ts` + test.
3. **Plain-language validation.** New `lib/jargon/import/issue-messages.ts` + test. Touch `lib/jargon/import/errors.ts`, `validate-import.ts`, `validate-import-issues.ts`, `types.ts`, `components/jargon/shared/error-alert.tsx`, `lib/jargon/import/json-helpers.ts`.
4. **Honest commit-failure copy.** `lib/jargon/import/errors.ts`, `execute-import.ts` (term in context), `failure-copy.test.ts`.
5. **Overrides and language plumbing.** `app/(private)/jargon/import/actions.ts`, `lib/jargon/import/types.ts`, `validate-import.ts`, `execute-import.ts`, `lib/jargon/collection-mutations.ts` (`createOrGetOwnedDomain` language param).
6. **Preview: name, guard, language, copy.** `components/jargon/import/import-preview.tsx`, `import-page.tsx` (remove the effect).
7. **Import page layout.** Retitle, simplify the JSON card, the "More import options" disclosure, `import-llm-prompt.tsx`, `import-form.tsx`, `app/(private)/jargon/import/layout.tsx`, plain file errors.
8. **Empty collection creation.** `lib/jargon/domain-schema.ts` (+ test), `collection-mutations.ts` (`createOwnedDomain`), `actions-collections.ts`, `hooks/use-collection-actions.ts`, new `components/jargon/create-collection-dialog.tsx`, `empty-collection.tsx`, the import page card.
9. **Empty-collection state.** `components/jargon/jargon-page.tsx`, `term-list.tsx` if needed; run through Read, Review, Triage, Mastery, Quiz and Stories with a zero-term active collection, and read `docs/trace.md` before touching anything TRACE-related.
10. **Add-term sheet.** New `lib/jargon/term-duplicates.ts` + test, new `components/jargon/add-term-dialog.tsx`, `term-form-fields.tsx` (extract `TermDetailFields`), `term-form-dialog.tsx` (edit only), `term-form-dialog-helpers.tsx`, `jargon-page.tsx`, `term-actions-menu.tsx`.
11. **Copy sweep.** `lib/tour/chapters/library.ts` and `more.ts`; entry labels in `components/jargon/empty-collection.tsx`, `app/(private)/jargon/mastery/page.tsx`, `components/jargon/read/read-page-content.tsx`, `components/jargon/review/review-page.tsx`, `app/(private)/jargon/(collection)/page.tsx`, `components/jargon/shared-domains-empty-states.tsx`, `components/app/account-nav.ts`; the two user-guide lines.
12. **SQL check.** `supabase/tests/empty_collection.sql`.
13. **Verify.** `pnpm check`, `pnpm test`, the browser flow at 375px and desktop, light and dim, then the device pass.

## 13. Open questions for the owner

Settled in this session: category in the Add-term sheet is pre-filled with the collection's most-used category (else "General") and sits under "More details".

Decided defaults, change any you disagree with:

1. Retitle the page "Add a collection" now, and rename the nav item to "Add collection". Phase 1 reuses both.
2. An empty collection is marked active for review when created, like an imported one.
3. New collections default to English in phase 0; "remember the last-used language" waits for phase 1.
4. Collection names are capped at 100 characters for new collections only.
5. The `ilike` wildcard fix ships in phase 0. Any existing data hit by it would already be wrong, and the fix doesn't touch rows.

Genuinely open: none that block starting.
