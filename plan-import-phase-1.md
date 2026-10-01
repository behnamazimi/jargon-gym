# Import flow, phase 1: Paste importer and chooser

Planning only: no code has been changed. Written 2026-10-01.

## Context

Phase 0 shipped (#144, `c76ce27`): plain errors, name guard, empty collections, the two-field Add-term sheet. Phase 1 is the big one. It makes **only `term` required** (`terms.category` and `terms.definition` become nullable), adds "unfinished terms" that stay out of every study and delivery surface, and replaces the JSON box with the chooser and **Paste → Check → Add**, committed by one idempotent transaction (no undo).

Because it is large and touches data that every reader depends on, it ships as **four releases**, each independently reviewable and revertable (section 11): 1a data hardening (invisible), 1b unfinished terms and one-term capture, 1c the paste importer and chooser, 1d guides, files, export and polish. Phase 2 (requests) still ships separately and later.

### Verified against the code (2026-10-01, `import-flow-phase-1` branch, clean at `c76ce27`)

| Finding                                                                                                                                                                                                                                                                                                                                                                                                                                           | Effect on the plan                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 pieces exist and are reused: `lib/jargon/like-escape.ts`, `lib/jargon/import/similar-name.ts`, `lib/jargon/term-duplicates.ts`, `components/jargon/add-term-dialog.tsx`, `create-collection-dialog.tsx`, `createOwnedDomain` (`collection-mutations.ts`), `describeZodIssues` (`issue-messages.ts`).                                                                                                                                      | Build on them; don't re-create.                                                                                                                       |
| `terms.category` and `terms.definition` are still `not null`. The unique index `terms_domain_term_idx (domain_id, lower(term))` stands.                                                                                                                                                                                                                                                                                                           | Migration in 1a.                                                                                                                                      |
| **One SQL function feeds every per-collection count:** `progress_state_by_domain` / `my_progress_state_by_domain` (latest in `20260906120000_marked_known_at.sql`). Header progress %, sidebar, Mastery, widget `totalCount`, pace, Read/Review/Quiz "N available" and Triage all derive from it or from `get_trace_candidates`.                                                                                                                  | Filtering unfinished terms in these two RPCs fixes every denominator and every study pool in one place.                                               |
| `get_trace_candidates` feeds Read, Review, Quiz, Stories, widget, Telegram and Mastery rows (`lib/trace-queue/repository.ts`). Latest definition: `20260906120000_marked_known_at.sql`.                                                                                                                                                                                                                                                           | Re-create with `definition is not null` (signature unchanged, so `create or replace`).                                                                |
| Triage and the Library list both come from `loadJargonPageData` (`lib/jargon/load-jargon-page-data.ts`), via `fetchTermsByDomain`.                                                                                                                                                                                                                                                                                                                | Split the loader's output into finished `terms` and `unfinishedTerms`; Triage, mark-known and filters then ignore unfinished terms for free.          |
| `terms` RLS: authenticated read is `can_read_domain(domain_id)`; anon read is "public domain". Browse counts (`terms(count)`), public pages, `listPublicDomains` and the sitemap all go through these policies.                                                                                                                                                                                                                                   | One policy change hides unfinished terms from every non-owner and from the public site.                                                               |
| **Leaks that bypass RLS:** `my_term_relationships_by_domain` is `security definer` and joins `terms` directly; `get_term_card(s)` build `relationships` from raw joins.                                                                                                                                                                                                                                                                           | Patch all three so a hidden term's name never appears.                                                                                                |
| Service-role / admin-client readers also bypass RLS: `lib/narration/sync-missing.ts` (`fetchAllTermsForDomain(s)`), `lib/ai/speech/subjects.ts` (`loadTermSubject`), `app/api/narration/[termId]/route.ts`, `lib/stories/repository.ts` (`getStoryTerms`, ids come from the queue), `lib/telegram/*` (queue-fed). Session readers that see the owner's own unfinished terms: `lib/quiz/distractors.ts`, `lib/jargon/import/owned-collections.ts`. | Explicit `definition is not null` filters in TypeScript (task 1a.6).                                                                                  |
| About 58 files read `category` or `definition`. Content hashes use `term.category.trim()` (`lib/jargon/term-eval/content-hash.ts`) and the narration hashes.                                                                                                                                                                                                                                                                                      | Null-safety sweep. **Existing hashes must not change**, or every cached narration is superseded (golden test).                                        |
| `widget/jargon-gym.widget/index.jsx` and the narration templates don't read `category`. `WidgetTerm.category` is a string.                                                                                                                                                                                                                                                                                                                        | Normalise at `lib/jargon/widget-projection.ts` (`?? ""`). No widget logic change, so **no `widget/version.json` bump**.                               |
| No sliced activation exists (re-checked: no table, column, migration or code).                                                                                                                                                                                                                                                                                                                                                                    | Import marks the collection active, as phase 0 does.                                                                                                  |
| No analytics or event-log infrastructure exists.                                                                                                                                                                                                                                                                                                                                                                                                  | The import record table doubles as the log (counts, format, entry), with no term text. Chooser-tap and "finished within 7 days" metrics are deferred. |
| `listOwnedCollectionsForImport` selects **every** term of every owned collection in one query. PostgREST caps responses at 1000 rows (`lib/supabase/fetch-all-rows.ts` documents this).                                                                                                                                                                                                                                                           | Don't use it for Check. Add a light list, and fetch destination terms with `fetchAllRows`. Keep the old function only for the developer prompt card.  |
| Server Actions cap the body at 1 MB (Next 16 `serverActions.bodySizeLimit`).                                                                                                                                                                                                                                                                                                                                                                      | 500-term cap plus per-field length caps keep a commit well under it.                                                                                  |
| `entities` is already a dependency (HTML decoding). `papaparse` is not installed.                                                                                                                                                                                                                                                                                                                                                                 | Add `papaparse` (+ `@types/papaparse`), as the brief names. Use `entities` for Anki HTML.                                                             |
| `use-shared-domains-browse.ts`, `jargon-page.tsx`, `imported-banner.tsx` use direct `useEffect`. Existing sanctioned helper: `hooks/use-mount-effect.ts`.                                                                                                                                                                                                                                                                                         | New code uses event handlers, refs, `useSyncExternalStore`; I only touch the effects in files I rewrite.                                              |
| `components/ui/*` are DaisyUI wrappers over React Aria (`Dialog`, `Collapsible`, `Select`, `ToggleGroup`, `Alert`, `DropdownMenu`, `AlertDialog`, `Sheet`, `Field`, `Input`, `Textarea`). `LanguageToggle` exists.                                                                                                                                                                                                                                | Reuse.                                                                                                                                                |
| Legacy Telegram RPCs (`pick_random_unknown_term`, `pick_multiple_*`, `count_*`) are not called from TypeScript.                                                                                                                                                                                                                                                                                                                                   | Left alone; re-confirm with a grep during 1a.                                                                                                         |

Read: `docs/trace.md` (done; phase 1 touches the candidate RPCs and "what Read, Review and Quiz see") and Next 16 `server-actions.md` / `serverActions` config. `docs/admin.md` not needed: phase 1 adds no admin surface.

---

## 1. Goal and scope

**Goal:** anyone with a list or another app's export can build or grow a collection on a phone, without writing JSON.

**In**

1. **Schema relaxation:** only `term` required. `category` and `definition` nullable in the DB, zod schemas, edit form, capture sheet and every reader.
2. **Unfinished terms:** terms with no definition are saved, listed to the owner with a "N terms to finish" prompt and a quick fill-in sheet, and are excluded from Read, Review, Quiz, Stories, Triage, widget, Telegram, narration, evaluation, mastery counts, Browse/shared views, public pages and the sitemap.
3. **Chooser** at `/jargon/import` (search-first, three rows, new empty collection, More import options).
4. **Paste → Check → Add:** the deterministic detection pipeline, chips, cards, destination, language, name guard, Skip/Update duplicates, category field, 500-term cap, local draft.
5. **One idempotent transaction** (`my_import_terms`) and an `import_batches` record. No undo.
6. **Files:** TXT/CSV/TSV/JSON upload with sniffing and encoding fallback.
7. **Deck guides** (Quizlet, Anki, Google Translate, Noji, Mochi, Brainscape, Duolingo, Memrise, Something else).
8. **Add term:** multi-line paste offers "Add N terms"; destination chip; definition optional.
9. Optional `language` in the JSON payload; "Copy as text" and CSV export; the done banner.
10. Tour retarget and entry-point copy; `docs/import.md`, `docs/trace.md`, `AGENTS.md`, user-guide lines.

**Out (deferred)**

- Request rows, "Request definitions for these words", quota and statuses (phase 2). The chooser ships without a Request row.
- Global "+", `/capture`, share target, push (phase 3). `.apkg`, `.xlsx`, dictionary suggestions, Apple Shortcut, offline queue (phase 4).
- Chooser-tap analytics and "finished within 7 days" (no analytics infra). Virtualising the card list (only if the 200-card device test fails; `content-visibility: auto` first).
- A bulk "delete this import" action. Surfacing unfinished counts in the admin collection list.
- Updating the external generator skills to emit `language` (they live outside this repo; owner follow-up).

## 2. User stories (phone first)

1. _I have my words in Notes._ I tap "I have a list", paste, and see 48 cards. I tap Add. I land in my new collection with "Added 48 terms".
2. _I copied a list from WhatsApp._ Date-and-name prefixes are gone and each line is split into a word and its meaning.
3. _I exported a Quizlet set._ The Quizlet guide tells me where Export is. Pasting it just works, including my custom separators.
4. _I only have words, no meanings._ They import as terms to finish. I'm told they stay out of study, and I can fill them in later from one list.
5. _I made a typo in the collection name._ I'm asked whether I meant the one I already have.
6. _Some of my list is already in the collection._ I choose Skip (default) or Update, and for Update I see old and new side by side. My progress is kept either way.
7. _The split is wrong._ I tap a different separator, or Swap, and every card updates.
8. _I switch to Notes to copy more._ When I come back, my list is still there. If my signal drops while I add, I see a clear message and nothing is half-added.
9. _I just heard a word._ I type it, Save, and the sheet is ready for the next one. I don't have to know the meaning yet.
10. _I paste a list into the Term box by accident._ I'm offered "Add 12 terms" or "Keep as one".
11. _I'm in another app's export that has no export._ The guide says so and points me at paste or Browse. It never pretends.

## 3. Screens

Artifact: https://claude.ai/artifact/KDHErTpsHzPQvWjPe2YAsE. Where it conflicts with the brief, the brief wins (no Undo, no "left out", no AI strings, no Request row yet).

| Screen                                    | Route / component                                                        | Artifact source                                                                         | States                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Add a collection** (chooser)            | `/jargon/import` (`page.tsx`, `import-chooser.tsx`)                      | "Add a collection" + "Request a topic · Step 1" (search part only)                      | _Empty:_ search box + three rows. _Loading:_ results skeleton. _Results:_ cards with **Add**. _No match:_ one-line message. _Error:_ inline alert + retry. _Success:_ **Add** becomes "Added" with an Open link.                                                                                              |
| **Paste a list**                          | `/jargon/import/paste?to=<domainId>` (`paste-step.tsx`)                  | "Paste a list · Step 1"                                                                 | _Empty:_ placeholder, Paste, Choose a file. _Draft restored:_ text prefilled + "Check N terms". _Error:_ plain message under the box (nothing found, empty file, too many terms, unreadable file, JSON that isn't JSON).                                                                                      |
| **Check**                                 | same route, step 2 (`check-step.tsx`)                                    | "Paste a list · Step 2" and "Variant"                                                   | _Ready (1-click):_ compact "48 terms ready" + Add + "Review all". _Needs a look:_ summary + filter chips + cards. _Checking duplicates:_ inline spinner on the summary. _Committing:_ button "Adding…", fields disabled. _Error:_ destructive alert, list kept. _Name guard / near-name / added-shared hint._ |
| **Edit card**                             | sheet on Check (`edit-term-sheet.tsx`)                                   | "Check" (tap a card)                                                                    | Term, Definition, Category; Save / Cancel.                                                                                                                                                                                                                                                                    |
| **Done**                                  | `/jargon?domain=<id>&added=<batchId>` (`imported-banner.tsx`, rewritten) | "Paste a list · Step 3" without Undo                                                    | Counts line; Start reading / Mark what you know / Finish N terms.                                                                                                                                                                                                                                             |
| **App picker**                            | `/jargon/import/apps`                                                    | "Other apps · Step 1"                                                                   | Static list.                                                                                                                                                                                                                                                                                                  |
| **App guide**                             | `/jargon/import/apps/[app]`                                              | "Other apps · Step 2"                                                                   | Static steps; ends on Paste.                                                                                                                                                                                                                                                                                  |
| **More import options**                   | `/jargon/import/more`                                                    | not drawn                                                                               | Choose a JSON file, the JSON format, the developer AI-skill card (moved here from the current page).                                                                                                                                                                                                          |
| **Add a term** (capture)                  | `AddTermDialog` (existing)                                               | "One term" first two phones                                                             | Term only is enough. Destination chip. Duplicate alert. Multi-line paste dialog.                                                                                                                                                                                                                              |
| **Terms to finish**                       | banner on the collection + `finish-terms-dialog.tsx`                     | "Capture · finish later" (the artifact marks it phase 3; the brief moves it to phase 1) | _Empty:_ "All terms finished." _Saving:_ row spinner. _Error:_ inline.                                                                                                                                                                                                                                        |
| **Collection with only unfinished terms** | Library                                                                  | not drawn                                                                               | Banner + the unfinished list; header shows no progress.                                                                                                                                                                                                                                                       |

## 4. Data model and migrations

Two migrations, one per release. Names are placeholders sorted after `20260930150000`.

### 4.1 `20261001120000_unfinished_terms.sql` (release 1a)

1. `alter table public.terms alter column category drop not null, alter column definition drop not null;`
2. Normalise blanks, then forbid them: `update public.terms set category = null where btrim(category) = ''` (same for definition); `add constraint terms_category_not_blank check (category is null or btrim(category) <> '')`, same for definition. One representation of "none": `null`.
3. **Invariant trigger** `terms_keep_definition` (`before update of definition`): if `old.definition is not null and new.definition is null` raise `check_violation` "A term needs a definition once it has one." A finished term never goes back, so any `review_state` row always belongs to a finished term. (Decision for plan section 8.5 "clearing a definition": **block it**. See open question 1.)
4. Partial index `terms_unfinished_idx on terms (domain_id) where definition is null`.
5. **RLS.** Replace "Users read visible terms" with `can_read_domain(domain_id) and (definition is not null or owns_domain(domain_id))`, and add `and terms.definition is not null` to the anon policy "Anyone can read public terms". The owner still sees their own unfinished terms; nobody else sees them. Writes are unchanged.
6. **Re-create (same signatures, `create or replace`)** with `t.definition is not null` / the visibility rule:
   - `get_trace_candidates` (service role path; `my_get_trace_candidates` wraps it unchanged);
   - `progress_state_by_domain`;
   - `my_term_relationships_by_domain` (security definer: skip rows where either end is unfinished and the caller doesn't own that domain);
   - `get_term_card` and `get_term_cards`: return nothing for an unfinished term, and drop relationship rows whose other end is unfinished.
7. New `my_unfinished_term_counts(p_domain_ids uuid[])` (security invoker, so RLS limits it to the owner): `domain_id, unfinished_count`.
8. Regenerate `lib/supabase/database.types.ts` (`pnpm supabase:types`).

**Backfill:** only the blank-to-null update; expected 0 rows. **Rollback:** forward-only. Do not re-add `NOT NULL` once unfinished terms exist, and never delete terms to "clean up" (section 11).

### 4.2 `20261001130000_import_batches.sql` (release 1c)

```
import_batches(
  id uuid primary key,                        -- the client-generated import id
  user_id uuid not null references users on delete cascade,
  domain_id uuid references domains on delete set null,
  entry text,       -- 'chooser' | 'collection' | 'capture'
  source text,      -- 'paste' | 'file' | 'json'
  format text,      -- 'json' | 'html_table' | 'anki' | 'tsv' | 'csv' | 'lines' | 'pairs' | 'words'
  result jsonb not null,                      -- counts only
  created_at timestamptz not null default now())
index (user_id, created_at desc)
```

No term text is ever stored. RLS: owner `select` only; no insert/update policy (the RPC writes).

**`my_import_terms` RPC** (security definer, `set search_path = public`, `auth.uid()` required, `revoke all from public; grant execute to authenticated`, same pattern as the other `my_*` RPCs). Inputs: `p_import_id uuid`, `p_destination jsonb` (`{"domain_id": uuid}` or `{"name": text, "language": "en"|"nl"}`), `p_terms jsonb` (array: `term`, optional `definition`, `category`, `example`, `mental_model`, `discussion`, `anti_example`, `controversy`, `note`, optional `on_duplicate`), `p_relationships jsonb`, `p_policy text` (`skip`|`update`), `p_entry`, `p_source`, `p_format`. Steps, all in one transaction:

1. Reject `jsonb_array_length(p_terms) > 500` or `= 0`.
2. `insert into import_batches (...) on conflict (id) do nothing`. If it already existed: if it belongs to another user, raise `import_id_conflict`; otherwise return the stored `result` with `already_applied: true`. The primary key serialises a concurrent double submit.
3. Resolve the destination. Existing: must be owned by `auth.uid()` (else `destination_not_found`). New: insert a private domain with the language; a unique violation on `domains_owner_name_idx` raises `collection_name_taken`. It **never merges by name** (today's silent merge is gone).
4. For each term (first occurrence wins on repeated keys): match an existing term by `lower(btrim(term))` in the destination.
   - No match: insert, trimmed; blank `definition` and `category` stored as `null`.
   - Match and policy/override is `skip`: count as skipped.
   - Match and `update`: **update in place by id**, so learning history survives. `definition`, `category` and the optional fields use `coalesce(nullif(btrim(new), ''), old)`: an update **never replaces a value with an empty one**.
5. Relationships: keep only those whose two endpoints were created or updated in this batch (plan 8.2: others are dropped quietly and counted). `on conflict (term_relationships_unique_pair)` updates the description.
6. `insert into user_active_domains ... on conflict do nothing` (same as phase 0).
7. Update the batch row's `result` and return `{domain_id, domain_name, created, updated, skipped, unfinished, relationships_created, relationships_updated, relationships_dropped, already_applied}`.

Errors are `raise exception` with stable messages (`import_too_large`, `empty_import`, `collection_name_taken`, `destination_not_found`, `import_id_conflict`) that TypeScript maps to plain copy. Any failure rolls back everything. Nothing here generates audio or evaluations.

**RLS summary:** `terms` read policies change as in 4.1; `import_batches` owner-select only; the RPC checks ownership itself. SQL checks prove it (section 9).

## 5. Server side

All actions use `requireAuthenticatedClient` / `getSessionUser`.

**Rewritten: `app/(private)/jargon/import/actions.ts`** (the JSON-only `validateImportJson` / `confirmImport` and `execute-import.ts` are removed; JSON goes through the new path)

- `getImportSetupData()` → `{ collections: { id, name, language, termCount }[], addedNames: string[] }` (owned collections for destinations and the name guard; names of shared collections the user only added).
- `checkImportAgainstDestination({ domainId, terms: string[] })` → `{ matches: { name, definition: string | null }[] } | { error }`. Fetches the destination's terms with `fetchAllRows`, matches by trim + lowercase, returns only the matches (small payload, includes the old definition for the side-by-side view).
- `commitImport(input)` → `{ ok: true, batchId, domainId } | { ok: false, failure }`. Validates with a zod `commitImportSchema` (≤ 500 terms; `term` ≤ 200 chars, other fields ≤ 4000; destination union; policy enum), calls `my_import_terms`, `revalidatePath("/jargon")`, redirects to `/jargon?domain=<id>&added=<batchId>`. Failures: not signed in, too large, collection name taken, destination missing, id conflict, anything else ("We couldn't add your terms. Nothing was added.").
- `searchSharedDomains` (existing, `browse/actions.ts`) powers the chooser search. The one-tap Add reuses `addToCollection` (`actions-collections.ts`).

**Changed**

- `app/(private)/jargon/actions-terms.ts` and `lib/jargon/terms.ts`: `createTerm` / `updateTerm` accept a missing definition and category. `updateTerm` maps the trigger's `check_violation` to "A term needs a definition once it has one."
- New `finishTerm(termId, { definition, category? })` (narrow in-place update) and reuse `deleteTerm` (an unfinished term has no history, so deleting it loses nothing).
- `lib/jargon/load-jargon-page-data.ts`: returns `terms` (finished) and `unfinishedTerms` (owner only). `Domain` gains `unfinishedCount` from `my_unfinished_term_counts`.
- `app/(private)/jargon/(collection)/page.tsx`: reads `?added=<batchId>`, loads the `import_batches` row under RLS, passes the counts to the banner.
- `lib/jargon/export/build-import-payload.ts`: includes unfinished terms with no `definition`, omits null categories, emits `language`. Export → import round-trips.
- Schemas: `lib/jargon/term-schema.ts` and `lib/jargon/import/schema.ts` make `category` and `definition` optional (blank → null) and add optional `language`. `lib/jargon/import/sample-payload.ts` updated.
- `lib/jargon/widget-projection.ts`: `category ?? ""`.
- Filters added in TypeScript for RLS-bypassing readers: `lib/narration/sync-missing.ts`, `lib/ai/speech/subjects.ts`, `app/api/narration/[termId]/route.ts`, `lib/quiz/distractors.ts` (both related and random), `app/api/jargon/terms/[termId]/evaluate/route.ts`.

**New pure modules (no I/O, fully unit-tested), `lib/jargon/import/parse/`**

- `normalize.ts` (CRLF, NBSP, zero-width, BOM; keep smart quotes), `decode.ts` (sniff `{`/`[`, `PK`, else text; UTF-8 → UTF-16 on BOM → Windows-1252), `html-table.ts` (rows/cells from clipboard HTML by a small string parser, decoded with `entities`; no DOMParser, so it runs in Node tests), `anki.ts` (`#separator`, `#html`, `#… column`, strip tags and entities, drop `[sound:…]` and `<img>`, flatten cloze `{{c1::…}}`), `delimited.ts` (Papa Parse wrapper with an **explicit** delimiter chosen by our rules, so quoted multi-line cells survive), `lines.ts` (bullets, numbering, checkbox marks, WhatsApp prefixes, without eating "5G", "3D printing", "401(k)", "24/7"), `split.ts` (separator scoring: the separator covering the most lines, split at the **first** occurrence; tab, " – ", " — ", " - ", ": ", " = ", comma last; never a bare hyphen; ignore colons in times, URLs, ratios), `pairs.ts` (alternating short/long lines, words-only), `heading.ts` (term/word/definition/meaning/translation/front/back, woord/betekenis/begrip/vertaling), `detect.ts` (the ordered pipeline, returns the format, rows and the options in play), `build-terms.ts` (apply separator override, swap, heading, column map; collapse identical rows; flag same-term-different-definition; flag the "very long term, short definition" swap hint), `dutch-hint.ts` (small stop-word ratio, hint only).
- `lib/jargon/import/draft-store.ts`: localStorage draft behind `useSyncExternalStore`, every access in try/catch, cleared on success and on sign-out.
- JSON input reuses `parseImportJson`'s schema and `describeZodIssues`. Structural problems still block (not JSON, no terms, wrong types). Duplicate terms go through the collapse/"keep which?" flow. Links to terms that aren't in the list are **dropped and counted**, not errors.

## 6. UI components

DaisyUI via `components/ui/*`; mobile first; inputs ≥ 16px; primary buttons stay in the page flow (no fixed bar while a field has focus); no direct `useEffect`. Add `interactiveWidget: "resizes-content"` to the `viewport` export in `app/layout.tsx` (verify the field name in the Next 16 `generate-viewport` doc).

- **`components/jargon/import/import-chooser.tsx`** (replaces `import-page.tsx`): search input whose `onChange` starts a debounced call from an event handler (timer in a ref, stale responses dropped by a request id, as `use-shared-domains-browse.ts` does but without its effects). Result rows reuse `SharedDomainCard`'s pieces. Three `ImportCard`-style rows (`import-ui.tsx`), the existing `CreateCollectionDialog`, a ghost link to More import options. `data-tour` ids move here.
- **`paste-step.tsx` / `check-step.tsx` / `import-flow.tsx`:** one client component owns both steps and a reducer (`check-state.ts`, pure and testable): drafts, removals with restore, edits, policy, per-card override, destination, chips. Focus moves to each step's heading. The Paste button calls `navigator.clipboard.readText()` inside the tap and quietly focuses the field on rejection. The `paste` event reads `text/plain`, and `text/html` when it holds a `<table>`.
- **Check pieces:** `destination-block.tsx` (`ToggleGroup` New/Existing, name `Input`, existing-collection `Select`, `LanguageToggle`, near-name `Alert` using `findSimilarName`, added-shared hint), `separator-chips.tsx` (chips, Other…, Swap, heading toggle, per-column picker for 3+ columns in 1d), `term-card.tsx` (term, 2–3 line definition, status line, visible remove button; swipe only a shortcut), `duplicate-policy.tsx`, `edit-term-sheet.tsx` (`Sheet`), `check-summary.tsx` (`role="status"`, filter chips), `commit-bar.tsx` (in-flow button). Cards use `content-visibility: auto`.
- **Reused:** `ImportFailurePanel`/`import-errors.tsx` for failures, `useToast` for the Restore snackbar, `LanguageToggle`, `findSimilarName`, `findDuplicateTerm`.
- **`imported-banner.tsx`:** rewritten for batch counts; drops the `?added=` param with `useMountEffect` (the sanctioned hook).
- **Unfinished:** `unfinished-banner.tsx` and `finish-terms-dialog.tsx` on the collection page; a "N to finish" badge in `domain-sidebar.tsx` for owned collections; unfinished rows (status "No definition yet · Add one") listed above the finished list and filtered by the same search; `jargon-domain-header.tsx` shows progress only for finished terms and "Add terms" becomes a `DropdownMenu` (One term / Paste a list, destination preset).
- **`add-term-dialog.tsx`:** only `term` required; destination chip (`Select`, remembered per device with try/catch, falls back if the collection was deleted); duplicate check also covers unfinished terms (pass `[...terms, ...unfinishedTerms]`); multi-line paste dialog; two-line paste with prose on line two fills Definition; category pre-fill stays most-used but no longer falls back to "General" (open question 2).
- **Edit form** (`term-form-dialog*.tsx`, `term-form-fields.tsx`): definition and category optional; when a definition exists, clearing it is blocked client-side with the trigger as the backstop.
- **Null-category sweep:** `term-card.tsx`, `term-card-header.tsx`, `read-term-card.tsx`, `review-card.tsx`, `mastery-term-row.tsx`, `domain-terms-list.tsx`, `app/j/[domainSlug]/[termSlug]/page.tsx`, `jargon-filters.tsx` / `category-chips.tsx` (the filter shows only with 2+ categories; sort puts uncategorised last), `lib/jargon/filter-terms.ts`, Telegram `presentation-{term,review,quiz}.ts`, `lib/narration/*` and `term-eval/content-hash.ts` (golden test: unchanged hashes for non-null input).
- **Guides:** `lib/jargon/import/guides.ts` (plain data) rendered by server components; `apps/[app]` uses `generateStaticParams`.
- **Entry points:** `empty-collection.tsx`, `domain-sidebar.tsx`, `account-nav.ts`, Read/Review/Mastery empty states, `shared-domains-empty-states.tsx` and Browse no-results get a "Add your own" link, `before-you-sign-up-page.tsx` (read, edit only if wrong).
- **Tour:** `lib/tour/chapters/more.ts` `import` chapter retargeted to `import-search` and `import-routes` (drop `import-json` and `import-validate`, which no longer exist), update `lib/tour/targets.ts` and `targets.test.ts`, and the `welcome` step in `library.ts`.

## 7. Copy

Checked against plan section 6: phase 1 contains **no request strings**. Nothing says "AI", "generating", "automatically" or "instantly" outside the developer-only skill card inside More import options. No percentages, no progress bars (the commit button just reads "Adding…"). The Duolingo guide does not mention requests (phase 2 adds that). Strings marked † depend on the device checks.

**Chooser.** Title "Add a collection". Search placeholder "What do you want to learn?"; helper "Search shared collections." Result button "Add" / "Adding…" / "Added" + "Open". No match `Nothing shared matches "{query}". Try a list, or start an empty collection.` Error "Couldn't search right now. Try again." Section label "Or start from what you have". Rows: "I have a list" / "Notes, a spreadsheet, a doc or a chat message"; "A deck from another app" / "Quizlet, Anki, Google Translate and more"; "Just one term" / "Save a word you just came across". "Start empty and add terms later" + "New empty collection". "More import options".

**Paste.** Title "Paste a list". Placeholder "Put each term on its own line, with a dash or colon before its definition." + blank line + "For example:" + "API – a way for programs to talk to each other". Buttons "Paste", "Choose a file", "Check {N} terms" / "Check 1 term". Note† "Works with lists from Notes, Google Sheets, Excel, Docs and WhatsApp, and with exports from Quizlet and Anki." Clipboard blocked: "Paste isn't available here. Tap the box and choose Paste." Errors: "Nothing to check yet. Paste a list or choose a file." · "We couldn't find any terms. Put each term on its own line, with a dash or colon before its definition. For example: API – a way for programs to talk to each other." · `That's {N} terms. One import adds up to 500, so split your list and add it in parts.` · "The file must be a text, CSV or JSON file." · `"{file}" is empty.` · `We couldn't read "{file}". Try another file or paste the contents.` · "That file looks like a package from Anki or a spreadsheet app. Export it as text or CSV, or copy the cells and paste them here." · JSON that isn't JSON: "This looks like JSON, but we couldn't read it." + button "Treat it as a list".

**Check.** Title "Check {N} terms" / "Check 1 term". Toggle "New collection" / "Add to existing". Labels "Name", "Collection", "Language" (English / Dutch). Existing: "Language: {Dutch} (set by this collection)". Name guard `You already have "{X}". Add to it instead?` + "Add to it". Added-shared hint `You added a shared collection called "{X}". This creates your own.` Dutch hint "These terms look Dutch, but this collection is set to English." / "This list looks Dutch. Choose Dutch above if that's right." Chips "Split at" Tab · – · : · = · , · Other…; "Swap term and definition"; "First line is a heading"; custom field label "Split at this text" (placeholder `e.g. ::`); column picker "Term, Definition, Example, Note, Category, Ignore". Category field "Category for these terms (optional)". Summary `{N} terms ready · {U} without a definition · {D} already in this collection`; filters "All", "Needs a look", "Already there". Card: "No definition yet · Add one"; remove `Remove "{term}"`; snackbar `Removed "{term}"` + "Restore". Edit sheet "Edit term". Duplicates: `{N} terms are already in {collection}` with "Skip them" / "Update their definitions" and per card "Skip" / "Update", "Now" / "New", "Updating keeps your progress and never replaces a definition with an empty one." In-paste: `Combined {N} repeated rows.` · `"{term}" appears twice with different definitions. Keep which?` · "Keep this one". Hint `Different meaning? Add a qualifier, like "SLA (legal)".` Compact ready state: "{N} terms ready" + "Review all". Buttons "Add {N} terms" / "Add {N} terms · {U} to finish later" / "Adding…"; none to add: "Add terms" disabled + "Every term is already in this collection." Links dropped: `{R} links point to terms that won't be added, so they're left out.` JSON language conflict: "The file says Dutch, you chose English. We'll use your choice."

**Commit failures** (list kept, nothing half-added): "We couldn't add your terms. Nothing was added, and your list is still here. Try again." · "You're offline. Connect and try again. Your list is saved on this phone." · `You already have a collection named "{X}". Pick another name, or add to it.` · "That collection isn't available any more. Choose another." · "Sign in to add terms."

**Done.** `Added {A} terms to {Name}` (or `Updated {U} terms in {Name}` when A = 0) + a second line from `{F} to finish later` · `Skipped {S} already in this collection` · `Updated {U}` · `{R} links left out`, joined with " · ". Buttons "Start reading", "Mark what you know", "Finish {F} terms" (Start reading hidden when nothing finished was added).

**Unfinished.** Banner `{N} terms to finish` / "They stay out of Read, Review and Quiz until they have a definition." Button "Finish {N} terms". Sheet "Finish terms"; placeholder "What does it mean?"; buttons "Save", "Remove"; confirm `Remove "{term}"?` / "It has no progress yet, so nothing else is lost." Toast `Saved "{term}"`. Done: "All terms finished." Sidebar "{N} to finish". Collection with only unfinished terms: "Nothing to study yet. Add a definition to start." Add-term toast after saving a bare term: `Saved "{term}". It stays out of study until you add a definition.` Definition helper "Leave it empty to finish later." Edit block "A term needs a definition once it has one. Change the text instead."

**App picker** (subtitles): Quizlet "Sets you made · from the website", Anki "Notes in Plain Text export", Google Translate "Saved phrases via Google Sheets", Noji "CSV export of your decks", Mochi "CSV export", Brainscape "Export or copy from the editor"†, Duolingo "No export · type the words you want", Memrise "Copy from the course page", Something else "Any CSV or text file". Each guide is 3–4 numbered steps ending "Come back here and paste." (Quizlet†: browser not app, ••• → Export → Copy text, only sets you created, "Used your own separators? Pick them on the next screen."). Duolingo: "Duolingo doesn't offer an export. Type or paste the words you want to learn, or browse shared collections." Memrise: copy from the course page in a browser.

**More import options.** Title "More import options"; "Choose a JSON file"; "The JSON format" (existing example); card "Generate JSON with an AI skill (for developers)" (existing text, only on this page). Export dialog: "Copy as text", "Download CSV", "Download JSON".

**Tour.** `welcome` step 2: title "Add your own", body "Paste a list, bring a deck from another app, or start empty." `import` chapter: "Search first" / "Shared collections you can add in one tap." and "Or start from what you have" / "Paste a list from Notes or a spreadsheet, or bring a deck from another app."

**Docs/user guide:** `/how-terms-work` gets one paragraph on unfinished terms; `before-you-sign-up-page.tsx` checked.

## 8. Edge cases

Plan section 8, phase 1 handling.

**8.1 Parsing** (every item is a row in the table-driven tests, section 9)

- Empty / whitespace-only / header-only paste → "Nothing to check yet." / header row only → no terms message.
- Mixed separators: the separator covering the most lines wins; lines that don't contain it become words-only cards (no definition) rather than blocking.
- Separator inside the definition, and "API: Application Programming Interface: a way…": split at the first occurrence.
- Hyphenated terms ("follow-up", "e-mail", "end-to-end"): only a spaced dash or an en/em dash splits. Colons in "10:30", "https://", ratios don't split.
- Leading numbers that belong to the term ("5G", "3D printing", "401(k)", "24/7") are kept; only list numbering ("1.", "1)", "a.") with a space after is stripped.
- Bullets (•, -, *, ◦), checkboxes (☐, ☑, `- [ ]`), WhatsApp `[dd/mm/yyyy, hh:mm] Name:` and `[hh:mm, dd/mm/yyyy]` (iOS/Android, EN/NL).
- Quizlet custom separators (`##`, `::`, `####` between cards) via "Other…" and auto-detect of the common ones.
- Anki plain text: headers, HTML tags/entities, `[sound:…]`, `<img>`, cloze.
- NBSP, zero-width, BOM, CRLF, trailing spaces normalised; smart quotes and apostrophes ("zzp'er") kept.
- Excel/Sheets: quoted multi-line cells, trailing empty cells, empty last line (Papa Parse with an explicit delimiter).
- Dutch-locale `;` CSV, UTF-16 files, Windows-1252 accents.
- A definition with no term → card with an empty term is dropped and counted ("{N} lines had no term and were left out").
- Term line followed by definition on the next line → pairs rule (alternating short/long).
- Very long "term" and short "definition" → "Swap?" hint.
- A real first term called "Definition": heading only if the **second** column also looks like a heading word (or the user toggles it).
- Starts with `{` but isn't JSON → plain message + "Treat it as a list".
- Over 500 → blocked with the plain message, never truncated.
- Emoji, RTL, mixed scripts pass through untouched (test rows).

**8.2 Duplicates**

- Matching = trim + lowercase, accents differ, Dutch articles differ ("de vergadering" ≠ "vergadering"). Destination only; the same term in another collection is fine.
- Identical rows collapse and are counted; same term with two definitions asks "keep which?".
- Default Skip; Update shows Now/New; never overwrites with empty; in place by id so history survives. "Keep both" is never offered; the qualifier hint is.
- Relationships whose endpoint was skipped or isn't in the list are dropped and counted.
- Capture and edit follow the same rule (already enforced; unfinished terms now included).

**8.3 Destination and names**

- Near-duplicate names → guard. A name equal to an **added** (not owned) shared collection → create the user's own and say so. Only owned collections are destinations (built-in and public can't receive). Existing destination's language wins; the Dutch/English hint is soft. New collection language defaults to the last used on this device. The import activates the collection (as phase 0; no sliced activation exists). Redirect goes to the collection that received the terms.
- JSON whose `domain` equals an owned name exactly: Check opens with "Add to existing" preselected (generator re-import workflow keeps working), still switchable.

**8.4 Commit (no undo)**

- Double tap or retry: button disabled in flight, and the RPC is idempotent on `import_id`. The id is regenerated whenever the list, destination, policy or any card changes, so a retry of an unchanged list returns the stored result.
- Network failure or expired session: the draft stays in localStorage; re-auth and resume. Cleared on success and sign-out (lists can be private).
- Mid-commit failure rolls back; copy says "Nothing was added" (now true).
- Consequences visible before saving: destination, language, Skip/Update with Now/New, unfinished count on the button.
- Way back from a wrong import: new collection → existing "Delete collection"; existing collection → Skip default means only new terms were added. No bulk delete (deferred).
- No audio or evaluation work at import; never for unfinished terms. A definition update supersedes narration via the existing hash behaviour (PR #112).
- Slow phones: single request, button state only, no fake progress.

**8.5 Schema relaxations**

- Nullable category: every reader in section 6 handled; the filter shows only with 2+ categories; export omits null.
- Unfinished exclusions, all verified in the surface matrix (section 9): TRACE RPCs and hydrate, Stories, quiz distractors, Triage (via the loader split), mark-known, widget and Telegram (queue-fed), public pages and sitemap (anon RLS), Browse and shared views (authenticated RLS), narration (`sync-missing`, `subjects`, route), term evaluation, mastery denominators and counts (`progress_state_by_domain`), streak credit (nothing to credit: the term never reaches a session).
- **Unfinished-only collection:** treated as a collection with 0 studyable terms everywhere (counts exclude them, Read/Review/Quiz show their existing "no terms" states, phase 0 already proved zero-term safety). The Library shows the banner and the unfinished list instead of an empty state.
- **Finishing** a term makes it eligible from that moment with no history. **Clearing** is blocked (DB trigger + form).
- **Export:** unfinished terms included with no definition; round-trips.
- Public/shared: hidden by RLS; if the owner finishes a term it appears for subscribers and counts update on next load.

**8.8 Platform and accessibility**

- Primary button in the flow, not fixed while a field has focus; `interactive-widget=resizes-content`; inputs ≥ 16px; no `accept` on the file input; Paste callout fallback; `role="status"` on summaries; visible remove button for every swipe; focus to each step heading; labelled controls; offline note ("a commit needs a connection").
- 200–500 cards: `content-visibility: auto`; virtualise only if the device test fails.

**8.9 Tour, analytics, docs:** tour retarget; `import_batches` carries entry, source, format and counts; `docs/import.md` (new), `docs/trace.md` (unfinished-term section), `AGENTS.md` (import section, short), `/how-terms-work`.

**New edge cases found**

1. **Hidden-term leaks through `security definer` RPCs** (`my_term_relationships_by_domain`, `get_term_card(s)`). Patched in 4.1; SQL test proves a shared viewer never gets an unfinished term's name.
2. **Narration hashes must not change** for existing terms when category becomes nullable (golden test).
3. **PostgREST 1000-row cap** on destination terms (use `fetchAllRows`; the old owned-collections helper breaks beyond 1000 terms).
4. Papa Parse's own delimiter guess disagrees with our rules → always pass an explicit delimiter.
5. Server Action body limit (1 MB): 500-term and per-field caps.
6. Draft in localStorage holds private data: clear on success and sign-out; all access in try/catch (private mode).
7. A term typed in capture that matches an **unfinished** term: alert says it needs a definition, with "Open it".
8. Two tabs finishing/deleting the same unfinished term: the update is by id and idempotent; a missing row returns a plain error and the list refreshes.
9. The invariant "finished never reverts" also protects `review_state` consistency: no RPC needs a guard for `record_review_event`.
10. Evaluation with a null category: pass `""` and verify the rubric scores sensibly; evaluation is skipped for unfinished terms.
11. A guide for an app we can't verify (Quizlet export on phones, Brainscape tier) is not shipped until checked on a device.
12. `?imported=N` links from before the release: ignore the old param (no banner).

## 9. Tests

`pnpm test` (Vitest, node, `**/*.test.ts`) and `pnpm check` must pass at every release. Table-driven.

**Vitest**

- `parse/normalize.test.ts`, `decode.test.ts` (UTF-8, UTF-16 LE/BE with BOM, Windows-1252 "é", `{`/`[` JSON, `PK` zip, empty), `lines.test.ts` (bullets, checkboxes, numbering; "5G", "3D printing", "401(k)", "24/7" kept; WhatsApp iOS and Android, EN and NL), `split.test.ts` (each separator; first-occurrence; "API: Application Programming Interface: a way…"; "follow-up"; "10:30"; URLs; ratios; mixed separators), `delimited.test.ts` (quoted multi-line cells, trailing empties, `;`), `html-table.test.ts` (Sheets and Docs fragments), `anki.test.ts` (headers, HTML, entities, sound, img, cloze), `pairs.test.ts`, `heading.test.ts` (EN and NL; real first term "Definition"), `detect.test.ts` (one fixture per pipeline rule plus ordering conflicts, emoji, RTL), `build-terms.test.ts` (swap, heading, column map, collapse, keep-which, swap hint, 500 cap), `dutch-hint.test.ts`, `check-state.test.ts` (remove/restore, edit, policy and override, import-id regeneration), `draft-store.test.ts` (throwing storage).
- `lib/jargon/term-schema.test.ts`, `import/schema.test.ts` (optional fields, blank → null, `language`), `import/commit-schema.test.ts` (caps, destination union), `import/failure-copy.test.ts` (RPC error → plain copy), `import/guides.test.ts` (every app has steps and ends on Paste; no never-use string; no "request" in phase 1 guides), `export/build-import-payload.test.ts` (unfinished round-trip, null category, `language`).
- Hash golden tests for `term-eval/content-hash.ts` and `narration/content-hash*.ts`: existing inputs give the same output as before; null category is stable.
- `lib/jargon/filter-terms.test.ts`, `library-filters.test.ts`: null categories, filter hidden below 2 categories, uncategorised sort last. `lib/tour/targets.test.ts` updated.

**SQL (hand-run, like `supabase/tests/empty_collection.sql`)**

- `supabase/tests/unfinished_terms.sql`: nullable columns; blank rejected; trigger blocks clearing but allows setting; owner sees unfinished, a shared viewer and anon don't (`terms` and `terms(count)`); `get_trace_candidates` and `progress_state_by_domain` exclude them; `my_term_relationships_by_domain` and `get_term_cards` don't leak their names; `my_unfinished_term_counts`.
- `supabase/tests/import_terms.sql`: creates a new collection (language, private, active) and unfinished rows; skip leaves rows untouched; update changes in place by id and **keeps `review_state`/`user_progress` rows**; update never blanks a value; first-occurrence wins on repeated keys; relationships dropped when an endpoint was skipped; 500 cap and empty rejected; **a failing row rolls back the whole batch** (force a constraint error on the last term and assert zero rows and no batch row); same `import_id` twice returns `already_applied`; another user's `import_id` or destination is refused; `collection_name_taken`.
- `supabase/tests/import_terms_concurrency.sh` (pattern of the existing `*_concurrency.sh`): two parallel calls with one id import once.

**Surface matrix (browser + SQL, section 10 flow):** an unfinished term never appears in Read, Review, Quiz (question and distractors), Stories, Triage, the widget API, Telegram payloads, public pages, sitemap, Browse counts, Mastery, narration sync, evaluation, or progress and denominators.

**Browser (preview tools, 375px and desktop, light and dim):** the full flow, plus 200 cards.

## 10. Device checklist

From plan section 10, only what phase 1 depends on. Record `clipboardData.types` and raw `text/plain` into the parser fixtures.

- Paste sources: Apple Notes (bullets, checklists), Google Sheets and Excel apps and Numbers, Google Docs (list and table), Word, WhatsApp (one and several messages, EN and NL), Telegram. In the iOS Safari tab, iOS Home Screen app, Android tab, installed Android app.
- The Paste button's prompt on iOS and Android.
- Keyboard vs the Add button on iPhone (iOS 26/27) and Android; `interactive-widget`.
- Scrolling 200 cards on a mid-range Android and an older iPhone.
- The draft surviving an app switch in the iOS Home Screen app.
- The file picker without `accept` (iCloud, Downloads, Drive).
- Dutch-locale Excel CSV and Windows-1252 files.
- Quizlet export in a phone browser (forces the app? free? creator-only?), which gates the Quizlet guide copy. Brainscape export tier gates its guide.
- Not applicable: Android share target, push, email deliverability.

Flow to run: new account → Browse search → one-tap Add → "I have a list" with a Notes bullet list → Check → Swap → near-name guard → Add → banner. Then a bare word list → "3 to finish" → Finish dialog → term enters Read. Then a Quizlet export and an Anki plain-text file. Then paste into Add term (12 lines) → Add 12 terms. Then a deliberate failure (airplane mode) and retry; reload mid-Check (draft restored).

## 11. Rollout and back-out

**No runtime flag.** The risk is data shape, not UI, so the safety is staging:

| Release                           | Contents                                                                                                                                       | Visible? | Back-out                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| **1a Data hardening**             | Migration 4.1, types, null-safety sweep, TS filters, schema relaxation in code only (nothing creates a null yet), golden hash tests, SQL tests | No       | Revert the PR; the migration is additive and old code works while no nulls exist.         |
| **1b Unfinished terms + capture** | Library banner/list, finish sheet, sidebar badge, Add-term with optional definition and destination chip, edit rules, export                   | Yes      | Revert the PR. Leftover unfinished terms are safe because 1a (readers and filters) stays. |
| **1c Paste importer**             | Migration 4.2, parser, Check UI, `my_import_terms`, chooser, banner, entry points, tour                                                        | Yes      | Revert the PR; `import_batches` and the RPC are inert without callers.                    |
| **1d Guides and polish**          | Guides, file upload and sniffing, column picker, language hints, "Copy as text"/CSV, multi-line paste in Add term, docs                        | Yes      | Revert the PR.                                                                            |

Order matters: **1a ships and soaks first.** Never ship 1b with 1a reverted.

**Cascade caution:** deleting a term wipes its `user_progress`, `review_state`, `review_events`, `term_narrations`, term evaluations, `term_relationships` and `triage_not_yet`. A bad import is **never** cleaned up with SQL deletes. Cleanup is limited to (a) collections that were created by the bad import and have no history yet, via the normal "Delete collection", or (b) unfinished terms, which have no history by construction. Updating an existing term during import is in place and keeps history. Do not re-add `NOT NULL` to `category` or `definition`.

Release each part with one PR, then run the device flow on production.

## 12. Task breakdown

Each step is independently reviewable. Run `pnpm test` after logic steps and `pnpm check` after each group.

**Release 1a: data hardening**

1. Migration `unfinished_terms` (4.1) + `supabase/tests/unfinished_terms.sql`; `pnpm supabase:types`. Files: `supabase/migrations/…`, `supabase/tests/…`, `lib/supabase/database.types.ts`.
2. Types and schemas: `lib/jargon/types.ts` (`Term.category: string | null`, `UnfinishedTerm`), `mappers.ts`, `term-schema.ts`, `import/schema.ts` (+ `language`), `import/types.ts`, `sample-payload.ts` + tests.
3. Null-safety sweep (section 6 list) and `widget-projection.ts`. Golden hash tests first (`term-eval/content-hash.ts`, `narration/content-hash*.ts`).
4. TS filters for bypass readers: `narration/sync-missing.ts`, `ai/speech/subjects.ts`, `api/narration/[termId]/route.ts`, `quiz/distractors.ts`, `api/jargon/terms/[termId]/evaluate/route.ts`.
5. `load-jargon-page-data.ts`, `fetchTermsByDomain` consumers, `lib/jargon/collections.ts` (`unfinishedCount`), filters and chips (2+ categories rule).
6. Surface matrix pass (SQL + browser). Read `docs/trace.md` section "How each tier decides" again before touching any RPC.

**Release 1b: unfinished terms and capture** 7. Actions: `finishTerm`, relaxed `createTerm`/`updateTerm`, trigger-error mapping (`actions-terms.ts`, `lib/jargon/terms.ts`). 8. `unfinished-banner.tsx`, `finish-terms-dialog.tsx`, sidebar badge, unfinished rows, header progress, `jargon-page.tsx`. 9. `add-term-dialog.tsx` (definition optional, destination chip, duplicate check incl. unfinished, `mostUsedCategory` change) and the edit form rules. 10. Export includes unfinished (`build-import-payload.ts`, `domain-export-dialog.tsx`).

**Release 1c: paste importer** 11. Migration `import_batches` + `my_import_terms` + `supabase/tests/import_terms.sql` and the concurrency script. 12. Parser A: `normalize`, `decode`, `lines` + tests. 13. Parser B: `delimited` (add `papaparse`), `html-table`, `anki` + tests. 14. Parser C: `split`, `pairs`, `heading`, `detect`, `build-terms` + the full fixture table. 15. `draft-store.ts`, `check-state.ts` + tests. 16. Actions: `getImportSetupData`, `checkImportAgainstDestination`, `commitImport`, `commit-schema`, failure mapping; delete `execute-import.ts`, `validate-import.ts` (keep the schema and `describeZodIssues`); `import-relationships.ts` retired with it. 17. Paste step and Check step components, destination block, chips, cards, edit sheet, duplicate policy, commit bar. 18. Chooser (`import-chooser.tsx`, `page.tsx`, `layout.tsx`), `/more` page (move `import-llm-prompt*` here), retire `import-page.tsx`, `import-form*.tsx`, `import-preview.tsx`. 19. Done banner (`imported-banner.tsx`, collection `page.tsx`, `jargon-page-helpers.ts`), "Add terms" dropdown in the header, entry points, `app/layout.tsx` viewport. 20. Tour retarget (`more.ts`, `library.ts`, `targets.ts`, `targets.test.ts`).

**Release 1d: guides and polish** 21. Guides data + routes (`guides.ts`, `apps/page.tsx`, `apps/[app]/page.tsx`), gated on the Quizlet/Brainscape device checks. 22. File upload and sniffing in the Paste step; per-column picker for 3+ columns; Dutch hint and last-used language. 23. Multi-line paste dialog and two-line paste in `add-term-dialog.tsx`. 24. "Copy as text" and CSV export; `language` in export. 25. Docs: `docs/import.md` (new), `docs/trace.md`, `AGENTS.md`, `/how-terms-work`, `before-you-sign-up-page.tsx`. Use the `docs-writer` skill for `.md` files in `docs/`. 26. Verify: `pnpm check`, `pnpm test`, browser flow at 375px and desktop in light and dim, device pass.

## 13. Open questions for the owner

Decided defaults, change any you disagree with:

1. **Clearing a definition:** blocked for any term that has one (form + DB trigger). Finished terms never revert to unfinished. The alternative (allow and hide, keep history) would create hidden terms with history and shifting denominators.
2. **Category pre-fill in Add term:** most-used category, but **no "General" fallback** now that category is optional (phase 0 used "General" because it was required). A collection with no categories stays uncategorised, so the filter stays hidden.
3. **JSON re-import to an existing name:** Check preselects "Add to existing" when the file's `domain` exactly matches an owned collection, so generator re-imports keep working. It's still one tap to switch to "New collection".
4. **JSON links to terms that aren't in the list:** dropped and counted, no longer a blocking error ("no line blocks the rest").
5. **The chooser ships without a Request row** (phase 2 adds it). Its no-match message points to paste and empty collections.
6. **Four releases (1a–1d)** instead of one, so the nullable-column change soaks before anything creates a null. Say if you'd rather ship 1b–1d together.
7. **`import_batches` is also the only logging.** It records entry, source, format and counts, never term text. Chooser-tap and "unfinished finished within 7 days" metrics wait for real analytics.
8. **Unfinished counts in the admin collection list** are not adjusted (they count all terms).
9. **Generator skills** (outside this repo) need to start emitting `language`; that's an owner step after 1d.

No question blocks starting 1a.
