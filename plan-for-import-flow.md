# Plan for the new import flow

This is the context pack for planning the replacement of Jargon Gym's JSON-only import. A phase planner should be able to read it cold and plan any phase without re-doing the research. It states what the owner decided, what the code does today, what each route should become, how the work splits into phases, and the edge cases each phase has to handle.

Written 2026-10-01. Paths were checked against `main` at commit `5c1d8da`; confirm them again before planning, because the code moves.

## Sources

- **Research report:** [reports/Jargon Gym import alternatives.md](reports/Jargon%20Gym%20import%20alternatives.md). It has the evidence, citations, risk register and device test matrix behind every recommendation here.
- **Research notes:** `research_notes/Jargon Gym import alternatives/`, six files:
  - flashcard apps
  - vocabulary apps and capture
  - cross-app formats
  - import UX patterns
  - PWA capture and notifications
  - request/concierge flow
- **Prototypes:** https://claude.ai/artifact/KDHErTpsHzPQvWjPe2YAsE. It's a Claude Code canvas artifact of the prototypes: 17 phone screens plus the admin request desk, drawn in the app's own light and dim themes. Use it as the visual reference for every screen named below. It's private to the owner's account, so read it with the Artifact tool's `read` action, not WebFetch. Its sections are:
  - Today
  - Add a collection
  - Paste a list
  - Other apps
  - Request a topic
  - One term
  - Copy rules
  - Rollout

  The prototypes predate the owner's final decisions. Where they disagree, this document wins:
  - **Undo:** the "Undo" button on the import result banner is gone.
  - **Admin desk:** the "generator command" step and "Also publish a copy to Browse" on the Fulfil panel are gone.
  - **Missing definitions:** cards without a definition are saved as unfinished terms, not "left out".
  - **Copy:** strings mentioning AI tools are gone.

## 1. Owner decisions (hard constraints)

Treat these as fixed. Don't re-propose anything that contradicts them.

1. **PWA, web app and mobile web only.** No native wrapper, no Telegram capture channel, no browser extension. Phones come first, desktop browsers second.
2. **The self-serve import path is free and runs no AI in the app.** All parsing and detection is deterministic. AI credits (`lib/ai-credits/`, `lib/llm/`) stay for Quiz and Stories.
3. **"Request a collection" for people who only have a topic.**
   - The request lands in the admin panel.
   - The admin builds the collection **manually** and delivers it into the requester's library. There is no automation and no AI generation pipeline in the app for now.
   - The delivered collection is **owned by the requester and private**. It is not published to Browse; the requester can share it later through the normal sharing flow if they want.
   - The UI presents it as being prepared. It must never mention the admin and must never imply automation (see section 6).
4. **Starting points to serve:**
   - just a topic;
   - a list somewhere (Notes, a spreadsheet, a Google Doc, a chat message);
   - another app's deck (Quizlet, Anki, Memrise, Duolingo and similar).

   Photos, PDFs and pulling terms out of source material are out of scope.

5. **Scope covers bulk import and quick single-term capture.** Capture means "I just heard this word, save it". Telegram capture stays dropped, as decided in August 2026.
6. **Only the term name is required.** Definition and category are optional everywhere: import, capture and the edit form. A user can import a bare word list and fill in the rest later in the app. A term without a definition is "unfinished" and stays out of study until it has one (section 8.5).
7. **No duplicate terms in a collection.** The unique `(domain_id, lower(term))` rule stays. One term can't have several senses; users who need that write a qualifier into the name, e.g. "SLA (legal)".
8. **No Undo for imports.** It's overkill. The Check screen is the safety net, and a new collection can be deleted as a whole. The commit is still one transaction, so a failure never leaves a half-imported collection.
9. **Phases 1 and 2 ship separately.** The request flow (phase 2) doesn't ship alongside the paste importer (phase 1).
10. **Repo rules that apply to every phase:**

- DaisyUI components.
- No direct `useEffect` (the project's `no-use-effect` rule).
- Comments only when needed.
- `pnpm check` must pass.
- Read `node_modules/next/dist/docs/` before Next.js code (Next 16 has breaking changes).
- Read `docs/trace.md` before touching anything that feeds Read, Review or Quiz, and `docs/admin.md` before any admin page or action.
- Bump `widget/version.json` if widget logic changes.
- Tour changes follow the "Guided tour" section of `AGENTS.md`.

## 2. Current state

### The import flow

| Piece                  | Where                                                                                     | What it does today                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route                  | `app/(private)/jargon/import/` (`page.tsx`, `actions.ts`, `layout.tsx`)                   | `getImportSetupData`, `validateImportJson`, `confirmImport`. It redirects to `/jargon?domain=…&imported=N`                                                                                                                                                                                                                   |
| Page UI                | `components/jargon/import/`                                                               | `import-page.tsx` (state), `import-form.tsx` (monospace JSON textarea, Upload .json, Load example/minimal, Format, Clear), `import-preview.tsx` (summary and the overwrite checkbox), `import-llm-prompt*.tsx` + `import-llm-prompt-helpers.ts` (the "Generate with an AI skill" card, `INSTALL_COMMAND`, `buildRunCommand`) |
| Schema                 | `lib/jargon/import/schema.ts`, `lib/jargon/term-schema.ts`                                | zod. `term`, `category` and `definition` are required. `relationships` is optional                                                                                                                                                                                                                                           |
| Validation and preview | `lib/jargon/import/validate-import.ts`, `validate-import-issues.ts`, `errors.ts`          | JSON parse, then zod, then duplicate and relationship checks. Errors cite paths such as `terms[3].category`. The preview finds the domain by case-insensitive name and lists conflicting term names                                                                                                                          |
| Commit                 | `lib/jargon/import/execute-import.ts`, `import-relationships.ts`                          | `createOrGetOwnedDomain`, then **one select plus an insert or update per term, with no transaction and no batch record**, then relationships, then `markDomainActive` (`user_active_domains` upsert)                                                                                                                         |
| Collections            | `lib/jargon/collection-mutations.ts` (`createOrGetOwnedDomain`)                           | Matches an owned domain by `ilike(name)`, otherwise inserts a private one. **Import is the only way to create a collection**                                                                                                                                                                                                 |
| Export                 | `lib/jargon/export/build-import-payload.ts`, `components/jargon/domain-export-dialog.tsx` | JSON only, in the same shape as import                                                                                                                                                                                                                                                                                       |
| Banner                 | `components/jargon/imported-banner.tsx`                                                   | "Imported N terms into X" with Start reading and Mark what you know                                                                                                                                                                                                                                                          |
| Manual add             | `components/jargon/term-form-dialog*.tsx`, `term-form-fields.tsx`                         | A 9-field dialog plus a relationships editor. Owner only, inside an existing collection                                                                                                                                                                                                                                      |
| Language               | `lib/jargon/languages.ts` (`en`, `nl`)                                                    | `domains.language` defaults to `'en'` (migration `20260904200000_domain_language.sql`) and **is not in the import payload**. It drives narration templates, voices and term labels                                                                                                                                           |

### Data constraints that shape the design

- `terms.category text not null` (`supabase/migrations/20260725115506_schema.sql`). Category is only a browse filter.
- `create unique index terms_domain_term_idx on public.terms (domain_id, lower(term))`. A term name is unique per collection, case-insensitively, so "keep both" isn't possible.
- **Every learning table cascades on term delete:**
  - `user_progress`, `term_relationships` (schema migration);
  - `review_state` (`20260801140059`);
  - `review_events` (`20260901140000`);
  - `term_narrations` (`20260904190000`);
  - term evaluations (`20260924220000`);
  - `triage_not_yet` (`20260930130000`).

  Deleting a term therefore wipes its learning history. Updating a term in place keeps it. This matters for duplicates (Update, not delete-and-recreate) and for any cleanup tooling.

### Who reads `category` and `definition`

Any phase that makes either field nullable or optional must audit these readers. About 25 files read `.category` and about 32 read `.definition`. Representative ones:

- **UI:** `components/jargon/term-card*.tsx`, `category-chips.tsx`, `jargon-filters.tsx`, `read/read-term-card.tsx`, `review/review-card.tsx`, `mastery/mastery-term-row.tsx`, `public/domain-terms-list.tsx`.
- **lib:**
  - `lib/jargon/mappers.ts`, `filter-terms.ts`, `mastery.ts`, `widget-projection.ts`;
  - `term-eval/content-hash.ts`;
  - `lib/jargon/public/public-terms.ts`, `lib/review/mappers.ts`;
  - `lib/trace-queue/hydrate.ts`;
  - `lib/telegram/presentation-{term,review,quiz}.ts`.
- **Routes:** `app/j/[domainSlug]/[termSlug]/page.tsx`, `app/api/jargon/terms/[termId]/evaluate/route.ts`.
- **Study pools:** the SQL RPCs `get_trace_candidates` / `my_get_trace_candidates` (latest definition in `20260906120000_marked_known_at.sql`, called from `lib/trace-queue/repository.ts`). Also `lib/stories/repository.ts` and `lib/quiz/distractors.ts`.

### Entry points that link to import

- `components/jargon/empty-collection.tsx` (tour target `library-import`)
- `components/jargon/domain-sidebar.tsx`
- `components/app/account-nav.ts` (overflow nav "Import")
- the Read, Review and Mastery empty states
- `components/jargon/shared-domains-empty-states.tsx`
- `components/content/before-you-sign-up-page.tsx`
- tour chapters in `lib/tour/chapters/library.ts` ("Import them as JSON") and `more.ts` (targets `import-json`, `import-validate`), with target ids in `lib/tour/targets.ts`

### Infrastructure available

- **Admin:**
  - `requireAdminPage` (`lib/admin/page-guard.ts`), `runAdminAction` (`lib/admin/action.ts`), `writeAudit` (`lib/admin/audit.ts`);
  - the nav config in `components/admin/admin-sections.ts`;
  - shared blocks in `components/admin/`.
  - The waitlist queue in `app/(private)/admin/people/actions.ts` (approve, bulk approve, resend invite, with email) is the nearest precedent for a request queue.
- **Email:** `lib/email/resend.ts` (Resend).
- **Push:** none exists. The service worker is `app/sw.ts` (Serwist). The manifest is `app/manifest.ts`, which has no `share_target`; its shortcuts are Read, Review and Quiz.
- **Browse:** `app/(private)/jargon/browse/actions.ts` (`searchSharedDomains`) and `lib/jargon/browse.ts`. Shared collections are added in one tap.
- **Sliced activation:** the August 2026 pivot brief accepted "sliced activation" (about 15 terms unlocked at a time). No migration for it was found on 2026-10-01. Check whether it exists before deciding how a new or imported collection is activated.

## 3. Problems the redesign must fix

| Problem                                                                                                                   | Fix                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| The only help is `npx skills add …` in a terminal plus a slash command in Cursor or Claude, which doesn't work on a phone | Move it out of the user path, behind "More import options". Requests cover "just a topic"      |
| Hand-written JSON is the only way in                                                                                      | A paste box that accepts any list, with JSON detected automatically                            |
| Errors cite `terms[3].category`                                                                                           | Plain messages that name the term, with fixes made on the preview card                         |
| The name inside the payload decides merge vs create, so a typo silently forks                                             | An explicit "New collection / Add to existing" choice plus a near-duplicate name guard         |
| No language field                                                                                                         | English/Dutch on the same screen                                                               |
| Category is required, though no importer studied asks for it                                                              | Make it nullable, show the filter only with 2+ categories                                      |
| Definition is required, so a bare word list fails                                                                         | Make it nullable; terms without one are saved as unfinished and kept out of study              |
| Per-term writes, no transaction; a checkbox guards overwrites                                                             | One transactional commit, a clear Skip/Update choice on the Check screen, and a result summary |
| A collection can only be created by importing                                                                             | The chooser, empty collections, the request flow                                               |

## 4. Target experience by route

Screen names match the artifact sections.

### 4.1 Add a collection (chooser) [artifact: "Add a collection"]

- Keep the `/jargon/import` URL, but retitle it "Add a collection".
- **Search first.** "What do you want to learn?" queries Browse as you type (`searchSharedDomains`). Matches get a one-tap **Add**. The last row is always **Request "…"**.
- **Three rows:**
  - **I have a list** opens Paste.
  - **A deck from another app** opens the app guides.
  - **Just one term** opens the capture sheet.
- **Other actions:**
  - **New empty collection**: name and language only.
  - **More import options**: the JSON documentation, the file picker, and the AI-skill instructions for developers who generate JSON themselves.
- **Where it opens from:**
  - the Library empty state;
  - a "+ New" button in the Library header;
  - Browse when a search finds nothing;
  - an "Add terms" menu inside an owned collection (One term / Paste a list), with that collection preset as the destination.
- **Tour:** "Import them as JSON" becomes "Add your own: paste a list, bring a deck from another app, or request a topic". Retarget the steps and update `lib/tour/targets.ts` and its tests.

### 4.2 Paste a list: Paste → Check → Add [artifact: "Paste a list"]

**Screen 1, Paste.** Full-screen, not a sheet.

- A large textarea with text of at least 16px, so iOS doesn't zoom.
- A one-line example as placeholder.
- A secondary **Paste** button that calls `navigator.clipboard.readText()` inside the tap; if access is rejected, it focuses the field instead.
- **Choose a file**, and **More import options**.
- Input arrives through the field's `paste` event, which needs no permission. Read `text/plain`, and read `text/html` when it contains a `<table>`.
- Parse right away and move to Check.
- Keep the draft in local storage so switching apps loses nothing, and clear it after a successful commit.

**Files.**

- `<input type="file">` with **no `accept` filter**, because iOS greys out valid files.
- Identify the file by its first bytes: `{` or `[` means JSON, `PK` means a zip (future `.apkg`/`.xlsx`), anything else is text.
- Decode as UTF-8, then fall back to UTF-16 when there's a BOM, otherwise Windows-1252.
- Parse CSV/TSV with Papa Parse (MIT, about 7 KB gzipped).

**Detection pipeline.** Deterministic, pure, and unit-testable.

- Normalise first:
  - unify line endings;
  - turn NBSP into a space;
  - strip zero-width characters and BOM;
  - keep smart quotes.
- Then the first matching rule wins:

| #   | Input looks like                                | Handling                                                                                                                                                                                                                                                      |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Starts with `{` or `[`                          | JSON path, same Check screen, schema errors translated to term names                                                                                                                                                                                          |
| 2   | Clipboard HTML with `<table>`                   | Rows and cells from the table                                                                                                                                                                                                                                 |
| 3   | `#separator:` / `#html:` / `#… column:` headers | Anki "Notes in Plain Text". Apply the headers, strip HTML, drop `[sound:…]` and `<img>`                                                                                                                                                                       |
| 4   | Tabs on most lines                              | Spreadsheet copy (Excel and Sheets quote multi-line cells)                                                                                                                                                                                                    |
| 5   | Consistent `;` or `,` field counts              | CSV. Dutch-locale Excel uses `;`                                                                                                                                                                                                                              |
| 6   | One item per line                               | Strip bullets, numbering, checkbox marks and WhatsApp `[date, time] Name:` prefixes. Split at the **first** occurrence of the separator that covers the most lines: tab, " – ", " — ", " - ", ": ", " = ", comma last. Prefer the one that leaves short terms |
| 7   | No separator, lines alternate short and long    | Term line followed by definition line                                                                                                                                                                                                                         |
| 8   | No separator on most lines                      | Words only: every row is a term with no definition (saved as unfinished)                                                                                                                                                                                      |

- **Header row:** treat row one as a heading when it matches term/word/definition/meaning/translation/front/back, or the Dutch woord/betekenis/begrip/vertaling.
- **Don't copy Anki's guesser**, which defaults to Space.

**Screen 2, Check.**

- **Destination.** "New collection" with a name, or "Add to existing" with a picker of owned collections only. It's preset when the user arrives from inside a collection.
- **Name guard.** If the typed name equals or nearly equals an owned collection, show "You already have 'X'. Add to it instead?"
- **Language.** English/Dutch. New collections default to the last-used language; an existing collection keeps its own.
- **Chips.**
  - "Split at": Tab · – · : · = · , · Other…, where Other takes custom strings such as Quizlet's `##`.
  - **Swap term and definition.**
  - **First line is a heading**, shown only when a heading was detected.
  - A per-column picker for 3+ columns (Term / Definition / Example / Note / Category / Ignore), auto-filled from header names.
- **Cards.**
  - One card per term: the term bold, the definition clamped to 2–3 lines, and a status line.
  - A summary at the top with `role="status"`, e.g. "45 terms · 3 without a definition · 2 already in this collection", with filter chips.
  - Tapping a card edits it in a sheet.
  - A visible remove button (with a local "Restore" snackbar on the Check screen; this is not an import undo); swipe is only a shortcut.
- **Add N terms.**
  - The button sits in the page flow, or sticks to the bottom only while no field has focus (the iOS keyboard hides fixed bars).
  - Add `interactive-widget=resizes-content` for Android.
  - When nothing needs attention, show a compact "48 terms ready" with **Add 48 terms** and a "Review all" link.
- **Missing definitions.** Never an error. Cards without a definition show a neutral "No definition yet · Add one" line and are saved as **unfinished terms**. The summary and button say so: "Add 48 terms · 3 to finish later". Word-only lists in **language** collections also get **Request definitions for these words**, which opens the request form with the words prefilled and counts against the quota.
- **Duplicates.** A collection never holds the same term twice.
  - Inside the paste: collapse identical rows and report the count. When the same term has two definitions, ask "appears twice, keep which?".
  - Against the destination: match ignoring case and surrounding whitespace, the same rule as the index. Show one policy only when matches exist: **Skip them** (default) or **Update their definitions**, with a per-card override. "Update" shows the old and new definition side by side on the card, because there is no undo.
  - Update happens in place by term id, so learning history survives. An update never replaces an existing definition with an empty one.
  - The duplicate message carries the hint: "If it's a different meaning, add it with a qualifier, like 'SLA (legal)'."
- **Category.** Optional. There's one optional "Category for these terms" field, plus a Category column when the paste has one.

**Commit.**

- Cap one import at about 500 terms, with a friendly message.
- A single RPC transaction writes all terms or none. It's idempotent on a client-generated import id, so a double tap or retry can't import twice. A small record of the id and counts is enough; there's no stored before-state, because there's no undo.

**Done.**

- Redirect to the collection.
- The banner reads "Added 45 · 3 to finish later · Skipped 2 already in this collection", with Start reading, Mark what you know, and "Finish 3 terms" when there are unfinished ones.
- No undo. If the import created a new collection, the existing "Delete collection" action is the way back.

**Copy rewrites.**

| Today                          | New                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validate & preview             | Check 48 terms                                                                                                                                                      |
| `terms[3].definition` required | (no error; "No definition yet · Add one" on the card)                                                                                                               |
| `terms[3].category` required   | (no error; optional "Category for these terms")                                                                                                                     |
| Invalid JSON at position 812   | We couldn't find any terms. Put each term on its own line, with a dash or colon before its definition. For example: API – a way for programs to talk to each other. |
| Overwrite checkbox             | 2 terms are already in this collection: **Skip them** · Update their definitions                                                                                    |
| Tour: Import them as JSON      | Paste a list from Notes, a spreadsheet or another app                                                                                                               |
| Wrong or empty file            | The file must be a text, CSV or JSON file · The file is empty                                                                                                       |

### 4.3 A deck from another app [artifact: "Other apps"]

- An app picker leads to a short, honest guide for each app. Every guide ends on the Paste screen. There are no connectors.

| Source                                           | User steps on a phone                                                                                                                                                                                     | Phase         |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Quizlet                                          | quizlet.com in the browser (export isn't in the app) → ••• → Export → Copy text. Only sets the user created; copied sets can't be exported. Default separators are Tab and New line; custom ones work too | 1             |
| Anki (desktop)                                   | Export → Notes in Plain Text                                                                                                                                                                              | 1             |
| Google Translate Saved                           | Saved → Export to Google Sheets (on a computer), then copy the columns                                                                                                                                    | 1             |
| Noji                                             | Deck → Settings → Export deck → CSV                                                                                                                                                                       | 1             |
| Mochi, Brainscape                                | Mochi CSV; Brainscape export may need Pro, otherwise copy from the edit view                                                                                                                              | 1             |
| Duolingo                                         | No export. The guide says so and points to paste or request                                                                                                                                               | 1 (copy only) |
| Memrise                                          | No official export. Copy from the course page in a browser                                                                                                                                                | 1 (copy only) |
| AnkiWeb shared decks, AnkiDroid, RemNote `.apkg` | Needs a package reader                                                                                                                                                                                    | 4, on demand  |
| Kindle, Reverso, Knowt                           | Skip                                                                                                                                                                                                      | —             |

- **Rejected: Quizlet link import.** Quizlet returns a Cloudflare challenge, its ToS bans scraping, and it has no public API.
- **Deferred: Anki `.apkg`/`.colpkg`.**
  - Libraries: fflate, fzstd and sql.js, about 340 KB gzipped, lazy-loaded in a worker.
  - About 200–300 lines of glue code.
  - The importer must ignore the dummy "please update Anki" note in new-format packages.
  - Fields need HTML stripped, cloze handled and media dropped.
- **Deferred: `.xlsx`.** Use read-excel-file (MIT, about 14 KB), not npm `xlsx` 0.18.5, which is stale and has High CVEs.

### 4.4 JSON and the AI-skill card

- The universal paste box detects JSON, so generator output and exports keep working through the same Check screen.
- "More import options" documents the rich format: example, mental model, in practice, anti-example, debated, note, relationships. Relationships remain JSON-only.
- Add an optional `language` field (`en`/`nl`) to the JSON payload, and update the generator skills and export to emit it. The UI choice wins when they conflict, and the conflict is shown.
- Remove the "Generate with an AI skill" card from the default page and put it inside "More import options" for developers.
- The JSON schema follows the same rule as the UI: only `term` is required; `definition` and `category` are optional.
- Add "Copy as text" and CSV export next to the JSON export.

### 4.5 Request a collection [artifact: "Request a topic"]

**Entry.** Browse or the chooser search with no good match shows "Request '…'". The quota appears **before** the form ("You can have 1 request open at a time").

**Form.**

- **Required:**
  - Topic (one line), which keeps showing Browse matches as the user types;
  - Kind: "A field's jargon" or "Language vocabulary";
  - Language: English or Dutch.
- **Optional, collapsed:**
  - Level: new to it / know the basics / brushing up, or A1–A2 / B1+ for languages;
  - Size: about 20 / 50 / 100;
  - "Terms you've come across", one per line.
- Helper text: "Please leave out confidential company details and personal information."

**Confirmation.**

- "Request sent. We'll prepare 'X' and add it to your Library, usually within 2 days."
- "How should we tell you?":
  - Email is on by default.
  - "Notification on this phone" appears only where push works (phase 3).
  - An iOS Safari tab shows "Add Jargon Gym to your Home Screen to get notifications" instead.

**Library request card.** It sits at the top of the Library, separate from collections, with the status, an estimated date and Cancel.

**Statuses.**

| Internal state | User sees                                                                    | When it's set                                                 |
| -------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `requested`    | In the queue · usually ready by {date}                                       | On submit                                                     |
| `in_progress`  | Being prepared · choosing the key terms and writing definitions and examples | **Only when the admin accepts, meaning work actually starts** |
| `needs_input`  | We have a quick question about your request (with a reply box)               | The admin asks. The delivery clock pauses                     |
| `ready`        | Ready · N terms added to your Library [Start reading]                        | On delivery                                                   |
| `declined`     | We couldn't prepare this one, with a reason and a self-serve alternative     | The admin declines                                            |
| `cancelled`    | Cancelled                                                                    | The user cancels                                              |
| `merged`       | Shows the linked request's status                                            | The admin links duplicates                                    |

**Expectations.**

- Promise a window the admin reliably beats; the suggested default is "usually within 2 days".
- Stretch the estimate when the admin is away (a pause switch with an honest banner).
- If a request runs late, say so **once** with a new date. Never repeat "soon".

**Notifications.**

- Email (Resend) first: on Ready, on Needs input, on a delay, and on a decline.
- Push comes in phase 3, for Ready and Needs input only, as a Declarative Web Push payload (`web_push: 8030`, title, `navigate` URL, optional `app_badge`). iOS 18.4+ shows it natively; the Serwist service worker parses the same JSON elsewhere.
- Permission is asked only from the "Notify me" tap.
- On iOS, push works only in the Home Screen app.

**Admin desk: `/admin/requests`.**

- Built on `requireAdminPage`, `runAdminAction` and `writeAudit`, and added to `components/admin/admin-sections.ts`.
- **Queue:** oldest first, with a due badge, topic, kind, language, size, and suggested duplicates or similar Browse collections.
- **Actions:**
  - **Accept** moves the request to `in_progress`.
  - **Ask** moves it to `needs_input`.
  - **Merge** links it to an open job or an existing collection, which delivers at once.
  - **Decline** takes a template reason.
- **Fulfil screen:** the admin builds the collection by hand. There's no generator step and no AI pipeline.
  1. Paste a list or JSON the admin prepared. It runs through **the same parser, validator and Check logic** as the user import (phase 1), with the request's language preset and "terms you've come across" shown for reference.
  2. **Deliver to requester.** This creates a **requester-owned, private** collection, marks it active, sets the request to Ready, sends notifications and writes an audit row. It also delivers a separate copy to every merged requester.
  3. Nothing is published to Browse. The requester can share their collection later through the normal sharing flow.
- **Decline templates:**
  - too broad;
  - too niche;
  - not jargon or vocabulary;
  - language not supported yet;
  - already in Browse (added for you);
  - **team-internal jargon we can't know** (point to paste).
- **Data handling:** request text stays inside the app and is only read by the admin. There's no AI account or retention job to build now. If the admin ever starts pasting request text into an AI tool, revisit the privacy notice (section 6) first.
- **Metrics to log:**
  - deflection (request attempts that ended in a one-tap Add);
  - time to first touch, and time to Ready vs the promise;
  - delivered collections opened within 7 days and studied within 14;
  - admin minutes per request.

### 4.6 Quick capture [artifact: "One term"]

- **Now (phase 0/1).**
  - Shrink the 9-field dialog to **Term** and **Definition**, with "More details" for the other seven fields.
  - Add a destination chip (the current collection, else the last used, remembered per device).
  - **Save** and **Save and add another**; the destination sticks between saves.
  - Check for duplicates in owned collections as the user types: "Already in X. Open it?"
  - A multi-line paste into Term offers **Add N terms** (opens Check with the destination preset) or **Keep as one**.
  - A two-line paste with prose on the second line fills Term and Definition.
- **Unfinished terms (phase 1, together with the importer).**
  - The definition is optional in the capture sheet too: "Save" works with just the term.
  - Unfinished terms live in a real collection and are excluded from every study and delivery surface (see 8.5) until they get a definition.
  - The Library and the collection show "N terms to finish", which opens a quick fill-in list.
- **Phase 3:** a global "+" and a `/capture` route.
- **Phase 3: Android installed app.**
  - A manifest `share_target` (GET; title/text/url; absolute `action` URL) pointing at `/capture`.
  - A shared sentence shows its words as chips so the user taps the term, and the sentence becomes the example.
  - Long-press icon shortcuts: "Add a term" and "Paste a list".
- **iOS.** There's no share target or icon shortcuts through Safari 27, so capture stays in the app. An optional Apple Shortcut that POSTs `{text, token}` with a revocable, capture-only token is deferred to phase 4. It must POST rather than open a URL, because Safari and the Home Screen app don't share cookies.
- **Offline (phase 4).** Queue captures in IndexedDB with client ids. Flush when the app opens or regains connection; Background Sync is Chromium-only.

## 5. Platform facts (as of iOS/Safari 27, Chrome 154)

| Capability                        | iOS Safari tab                | iOS Home Screen app           | Android tab            | Android installed      | Desktop                             |
| --------------------------------- | ----------------------------- | ----------------------------- | ---------------------- | ---------------------- | ----------------------------------- |
| Paste event in a textarea         | yes                           | yes                           | yes                    | yes                    | yes                                 |
| `clipboard.readText()` from a tap | "Paste" callout on every read | same                          | one-time permission    | same                   | Chromium permission; Safari callout |
| Web Share Target                  | no                            | no                            | no (needs install)     | yes                    | Chromium unclear                    |
| Manifest shortcuts                | no                            | no                            | no                     | yes                    | Chromium, macOS Safari 17.4+        |
| Web Push                          | no                            | yes (16.4+, asked from a tap) | yes                    | yes                    | yes                                 |
| Declarative Web Push              | no                            | 18.4+                         | via the service worker | via the service worker | macOS Safari 18.4+                  |
| Background Sync                   | no                            | no                            | yes                    | yes                    | Chromium only                       |

## 6. Copy rules for the request flow

The design is an undisclosed concierge: a person does the work and the UI doesn't say who. That's defensible. False claims of automation are not.

- **Use:**
  - "We'll prepare it and add it to your Library"
  - "Usually ready within 2 days"
  - "Being prepared" (only once work starts)
  - "Choosing the key terms and writing definitions and examples"
  - "Taking a little longer than usual · new estimate {date}" (once)
  - "We couldn't prepare this one", with a reason and an alternative
  - "Please leave out confidential company details"
- **Never use:**
  - "Generating…", "AI-built", "created automatically", "instantly"
  - percentages, progress bars, "scanning sources" animations
  - "no one sees your request", "100% private"
  - "Being prepared" set the moment a request arrives
- **FAQ answer, ready if asked:** "Our team prepares each requested collection and adds it to your Library."
- **Privacy notice:** one plain line that the team reads collection requests to prepare them. Nothing about AI, since none is involved. If that changes, the AI provider must be named there (GDPR transparency; get it reviewed).
- **Review discipline:** add the never-use list to PR review for request-flow strings.

## 7. Phases

Ordered by impact over effort. Each phase ships on its own; phase 2 doesn't ship together with phase 1.

### Phase 0: Unblock (small)

- **Goal:** remove the worst friction without the new importer.
- **Scope:**
  - Move the AI-skill card behind "More import options".
  - Rewrite JSON validation errors in plain language, naming terms instead of paths.
  - Add a language choice and a "did you mean…?" name guard to today's preview.
  - Allow creating an empty named collection (name and language).
  - Replace the 9-field Add-term dialog with a two-field sheet plus "More details", "Save and add another" and a duplicate check as the user types. Both fields stay required until phase 1 makes definition and category nullable.
  - Update the tour copy.
- **Likely touched:**
  - `components/jargon/import/*`, `lib/jargon/import/errors.ts`, `validate-import.ts`;
  - `app/(private)/jargon/import/actions.ts`;
  - `lib/jargon/collection-mutations.ts`;
  - `components/jargon/term-form-*`;
  - `lib/tour/chapters/*`, `lib/tour/targets.ts`.
- **DB:** none, unless empty-collection creation needs an RLS check.
- **Acceptance criteria:**
  - A non-developer on a phone never sees `npx` or a path-style error.
  - A Dutch import can be created as Dutch.
  - A mistyped name triggers the guard.
  - A user with no collections can create one without importing.
  - Adding a term needs two fields.

### Phase 1: Paste importer and chooser (medium to large; highest impact)

- **Goal:** anyone with a list or another app's export can build or grow a collection on a phone.
- **Scope:**
  - The chooser with search first (4.1).
  - Paste → Check → Add with the detection pipeline (4.2).
  - **Only `term` required:** `terms.category` and `terms.definition` become nullable (migration, zod schemas, edit form, capture sheet), with a full audit of their readers (section 2).
  - **Unfinished terms:** terms without a definition are excluded from every study and delivery surface (8.5), and a "N terms to finish" prompt with a quick fill-in list.
  - The one-transaction, idempotent commit RPC (no undo).
  - TXT/CSV/TSV/JSON upload with encoding fallback.
  - App guides (4.3).
  - Multi-line paste in Add term.
  - Optional `language` in the JSON payload.
  - "Copy as text"/CSV export.
  - Logging of the chooser route and detected format.
- **Likely touched:**
  - a new parser module under `lib/jargon/import/` (pure functions, heavy unit tests);
  - new Check components under `components/jargon/import/`;
  - a migration (`terms.category` and `terms.definition` nullable, a small import-id table for idempotency, the commit RPC, and the TRACE candidate RPCs updated to skip unfinished terms);
  - every reader of `.category` and `.definition` (section 2), including Stories, quiz distractors, the widget, Telegram and public pages;
  - `imported-banner.tsx`;
  - the entry points listed in section 2.
- **Depends on:** read `docs/trace.md` before touching the candidate RPCs. Phase 0 is helpful but not required.
- **Acceptance criteria:**
  - Lists pasted from Notes, Sheets, Excel, Docs, WhatsApp, Quizlet's export and Anki's plain-text export become correct cards with no manual formatting.
  - A bare word list imports as unfinished terms.
  - No line ever blocks the rest.
  - Duplicates default to Skip, and a collection never ends up with the same term twice.
  - A failed commit leaves nothing behind, and a double submit imports once.
  - An unfinished term never appears in Read, Review, Quiz, Stories, the widget, Telegram or public pages, and never counts toward mastery or progress.
  - Generator JSON still imports, with relationships.
  - `pnpm check` passes, and the parser has table-driven tests for every rule and edge case in section 8.1.

### Phase 2: Request a collection (medium)

- **Goal:** people with only a topic get a collection without any tooling.
- **Scope:**
  - The `collection_requests` table (RLS: owner reads their own, admin reads all).
  - The request form and quota, the Library request card and statuses, cancel.
  - The `/admin/requests` queue with Accept / Ask / Merge / Decline.
  - The Fulfil screen, where the admin pastes a hand-built list or JSON through the phase 1 parser and Check logic, with delivery into the requester's account (private, requester-owned) through a security-definer RPC that writes an audit row.
  - Status emails through Resend.
  - Decline templates, the pause switch, the privacy notice line and FAQ.
- **Depends on:** phase 1 (parser, Check logic, commit RPC). Ships after phase 1, not alongside it.
- **Acceptance criteria:**
  - A request goes requested → in_progress (only on Accept) → ready, with an email at each user-facing change.
  - Merged requesters all get the collection.
  - Users can't read other users' requests.
  - No string from the never-use list ships.
  - The quota is enforced on the server.

### Phase 3: Capture and alerts (medium)

- **Goal:** save a word from anywhere in the app or from other Android apps; tell people when a request is ready.
- **Scope:**
  - A global "+" and the `/capture` route.
  - Android `share_target` and manifest shortcuts.
  - Web push for Ready and Needs input (subscription storage, Serwist handler, Declarative payload), and badges.
- **Depends on:** phase 1 (unfinished terms) and phase 2 (requests to notify about).
- **Acceptance criteria:**
  - Sharing text to the installed Android app opens a prefilled capture.
  - Push arrives on an iOS Home Screen app and on Android.

### Phase 4: On demand (medium each)

Build each item only once there's evidence people ask for it:

- the Anki package reader;
- `.xlsx` via read-excel-file;
- dictionary suggestions (tap-to-choose, self-hosted Wiktionary data with CC BY-SA attribution; poor fit for jargon senses);
- the iOS Shortcut with a capture token;
- the offline capture queue;
- a desktop bookmarklet.

## 8. Edge cases

Each phase plan must list which of these apply and how it handles them.

### 8.1 Parsing (phase 1)

- Empty or whitespace-only paste; a paste that's only a header row.
- Mixed separators across lines.
- The separator also inside the definition ("API: Application Programming Interface: a way…"): split at the first occurrence.
- Hyphenated terms ("follow-up", "e-mail", "end-to-end"): split only on a spaced dash or an en/em dash, never a bare hyphen.
- Colons that aren't separators: times ("10:30"), URLs ("https://…"), ratios.
- Leading numbers that belong to the term ("5G", "3D printing", "401(k)", "24/7"): don't strip them as list numbering.
- Bullets (•, -, *, ◦), checkboxes (☐, ☑, `- [ ]`), numbering ("1.", "1)", "a.").
- WhatsApp multi-message copies with `[dd/mm/yyyy, hh:mm] Name:` prefixes. The format differs between iOS and Android and between English and Dutch locales.
- Quizlet custom separators (`##` between cards, `::` between term and definition, and so on).
- Anki plain text: `#separator:`, `#html:true`, `#columns:` headers, HTML tags and entities, `[sound:…]`, `<img>`, cloze `{{c1::…}}`.
- NBSP, zero-width characters, a BOM, CRLF, trailing spaces. Keep smart quotes and apostrophes ("zzp'er").
- Excel/Sheets: quoted multi-line cells, trailing empty cells, an empty last line.
- Dutch-locale CSV with `;`. UTF-16 files (Excel "Unicode text"). Windows-1252 files (accents must survive).
- Lines with a definition but no term. A term line followed by its definition on the next line.
- A very long "term" with a short "definition", which suggests swapped columns: hint at Swap.
- Heading false positives, e.g. a real first term called "Definition".
- Text that starts with `{` but isn't valid JSON: show a plain message and offer to treat it as text.
- Over the 500-term cap: say so plainly, and don't truncate silently.
- Emoji, RTL text and mixed scripts should pass through untouched.

### 8.2 Duplicates (phases 0–2)

- Case and surrounding-whitespace differences count as the same term (matching `lower(term)`). Accent variants ("café" vs "cafe") count as different, matching the index.
- Dutch articles make different terms ("de vergadering" vs "vergadering"); don't merge them.
- The same term twice in one paste: identical rows collapse; different definitions trigger "keep which?".
- Matching runs against the destination collection only. The same term in another collection is allowed.
- "Keep both" is not offered: the owner decided a collection never holds the same term twice. Point to a qualifier in the name ("SLA (legal)") instead.
- **Update keeps learning history** (in place by id). Skip is the default. Because there's no undo, Update shows old vs new before saving, and never overwrites an existing definition or category with an empty value.
- Quick capture and the edit form follow the same rule: saving a name that already exists in the collection is blocked, with "Open it" and the qualifier hint.
- JSON relationships whose source or target was skipped or left out: drop them quietly and count them in the summary.

### 8.3 Destination and names (phases 0–1)

- Near-duplicate names ("Startup Finance" vs "Startup finance " vs "Startup finanse"): show the guard.
- A name that equals a shared or built-in collection the user only _added_, not owns: create the user's own collection and say so.
- Only owned collections are valid destinations. Built-in or public ones can't receive imports.
- An existing destination's language wins. A soft hint when the content looks Dutch but the destination is English, and the other way round.
- An imported collection's activation (`markDomainActive` / `user_active_domains`), and sliced activation if it exists.
- The banner and redirect when the import landed in a different collection from the one the user started in.

### 8.4 Commit (phase 1; no undo)

- Double tap or a retry submits twice: make it idempotent on the client import id.
- Network failure or session expiry on the Check screen: keep the draft locally, re-auth, resume. Clear the draft after success, since lists can be private.
- A failure mid-commit rolls back completely. No partial imports.
- There's no undo, so the Check screen must make consequences visible before saving: destination name and language, the Skip/Update choice with old vs new definitions, and how many terms will be unfinished.
- The way back from a wrong import into a **new** collection is "Delete collection". For an import into an **existing** collection, Skip as the default means only new terms were added. Planners may propose a lightweight bulk delete on the collection page if it's cheap, but it's not required.
- Changing a definition changes narration and evaluation content hashes, so audio jobs are superseded (the existing behaviour from PR #112). Don't generate audio during import, and never for unfinished terms.
- Long imports on slow phones: show progress for the single request and keep the UI responsive.

### 8.5 Schema relaxations (category and definition, both in phase 1)

- **Nullable category:** audit every reader in section 2:
  - filter chips (show only with 2+ categories);
  - term cards and headers;
  - public pages;
  - Telegram presentation, widget projection;
  - mastery rows, narration templates;
  - the term-evaluation content hash;
  - export (omit when null);
  - zod schemas in `term-schema.ts` and `import/schema.ts`.

  The generator skills keep sending categories.

- **Unfinished terms (no definition):** exclude them from:
  - the TRACE candidate RPCs (`get_trace_candidates`, `my_get_trace_candidates`) and `lib/trace-queue/hydrate.ts`;
  - Stories (`lib/stories/repository.ts`) and quiz distractors (`lib/quiz/distractors.ts`);
  - triage;
  - the widget (`lib/jargon/widget-projection.ts`, `app/api/widget/*`; bump `widget/version.json` if its logic changes) and Telegram;
  - public pages and sitemap;
  - narration and term evaluation;
  - mastery denominators, collection counts, progress percentages, streak credit;
  - export (decide whether to omit them or export with an empty definition, and document it).

  Also handle:
  - **Unfinished-only collections:** define what a collection holding **only** unfinished terms looks like in Read, Review, Quiz and Library. Suggest an empty state that points to "Finish N terms".
  - **Finishing a term** (adding its definition) makes it eligible for study from that moment. It starts with no history, like a newly imported term.
  - **Clearing a definition** on an already-studied term: either block it in the edit form, or allow it and keep history while hiding the term from study. Pick one and document it.
  - **Export** of unfinished terms: include them with no definition (the JSON schema now allows that), so export → import round-trips.
  - **Mark-known and triage** on an unfinished term: not offered until it has a definition.
  - **Shared and public collections** with unfinished terms: hide those terms from other people's views and from public pages.

### 8.6 Requests (phase 2)

- The same user re-requesting the same topic. Several users requesting the same topic (Merge; deliver to all).
- Quota exhausted: shown before the form and enforced on the server.
- A request that matches an existing Browse collection: deflect with Add; the admin can Merge to it.
- Vague ("tech"), huge ("all of medicine") or inappropriate topics: Decline with a template and a self-serve route.
- Team-internal jargon ("our team's acronyms"): the admin can't know it, so Decline with "paste your team's list", or accept only with must-include terms that come with definitions.
- Personal or confidential data in the free text: helper text on the form. Only the admin reads it; it never leaves the app.
- The user cancels after work started. The admin tries to deliver after a cancel: block delivery and tell the admin.
- The user deletes their account or is suspended while a request is open: cascade or close the request, and the admin desk shows it.
- The delivered name collides with an owned collection: deliver as "Name (2)" or ask; never merge silently.
- **Delivering into another user's account bypasses that user's RLS:** use a security-definer RPC (or service role) restricted to admins, with `writeAudit`.
- A Resend failure must not block delivery. Retry; the in-app status is the source of truth.
- A missed estimate: one delay email with a new date. The admin is away: the pause switch stretches estimates and shows a banner.
- Time zones: show estimates as dates in the user's local time.
- A `needs_input` reply from the user moves the request back into the queue and resumes the clock.
- The delivered collection is private and requester-owned. If the requester later shares it, the normal sharing rules apply. Nothing is auto-published.
- Merged requesters each get their **own** private copy, so one requester's edits never affect another's.
- A "Request definitions for these words" request is fulfilled by filling definitions into the requester's **existing** collection (matching their unfinished terms by name), not by creating a new collection.
- RLS: a user reads only their own requests; the admin reads all.
- Rate limiting and abuse: one open request plus N per 30 days, and server checks.
- Copy discipline (section 6) in every status, email and push.

### 8.7 Quick capture (phases 0, 1 and 3)

- The user owns no collection yet: prompt "Name your first collection" inside the sheet.
- The destination is remembered per device (local storage, wrapped in try/catch), and falls back when that collection was deleted.
- The duplicate check across owned collections while typing must be debounced and cheap.
- A multi-line paste into Term offers "Add N terms" or "Keep as one".
- Tokenising a shared sentence: keep apostrophes and hyphens inside words ("zzp'er", "SLA's", "follow-up"); allow multi-word selection.
- Share target: Android often puts the shared link in `text` instead of `url`. GET URL length limits apply. Reinstalling is needed after manifest changes.
- Capture while signed out: the iOS Home Screen app and Safari keep separate sessions.
- Offline captures: client ids for dedupe; flush on open or when the connection returns.

### 8.8 Platform and accessibility (all phases)

- On iOS the keyboard doesn't resize the page, so fixed bottom bars get hidden: keep the primary button in the flow.
- Input text of at least 16px so iOS doesn't zoom.
- The Paste button's callout or permission prompt; a quiet fallback to focusing the field.
- The file picker without `accept`; sniff the content instead.
- Push only from a user tap; iOS needs the Home Screen app.
- Offline: the PWA can show the screens, but a commit needs the network; say so plainly.
- `role="status"` on summaries, a visible tap alternative to every swipe, focus moved to each step's heading, and labelled controls.
- Reviewing 200 cards on a mid-range Android or an older iPhone: check scrolling performance and virtualise if needed.

### 8.9 Tour, analytics, docs

- Update the tour targets (`lib/tour/targets.ts` and its tests) and the chapters' copy.
- Log the chooser route chosen, the detected format, terms imported vs unfinished vs skipped, how many unfinished terms get finished within 7 days, and request funnel metrics.
- Update `AGENTS.md` and the user guide at `/how-terms-work` if import behaviour or term fields change. Add a `docs/import.md` once the parser and requests exist.

## 9. Owner decisions on the former open questions (2026-10-01)

All settled. Don't reopen them; ask the owner only about new questions.

| Question                                    | Decision                                                                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Category: nullable or a hidden default?     | **Nullable.** Filter shown only with 2+ categories                                                                                       |
| Which fields are required?                  | **Only the term name.** Definition and category are optional everywhere; terms without a definition are unfinished and stay out of study |
| Several senses per term?                    | **No.** No duplicate terms in a collection; the unique index stays. Suggest a qualifier in the name                                      |
| Undo for imports?                           | **No undo.** Keep the one-transaction commit; make the Check screen show consequences clearly                                            |
| Delivered request: who owns it?             | **The requester, private.** Not published to Browse; the requester can share it later                                                    |
| Share-to-Browse toggle on the request form  | **None** (follows from the above)                                                                                                        |
| How are requests fulfilled?                 | **Manually by the admin.** No automation and no AI pipeline in the app                                                                   |
| Admin AI account and request-text retention | **Not applicable** (no AI pipeline). Revisit if that changes                                                                             |
| Delivery estimate and quota                 | "Usually within 2 days"; 1 open request and 3 per 30 days (default accepted)                                                             |
| "Request definitions for these words" route | Language collections only, counted against the quota (default accepted)                                                                  |
| Dictionary suggestions later                | Only tap-to-choose, with visible attribution and self-hosted data (default accepted)                                                     |
| Ship phase 2 alongside phase 1?             | **No.** Separate releases                                                                                                                |

## 10. Verify on real devices before writing final copy

- What a paste delivers from these sources:
  - Apple Notes, including bullets and checklists;
  - the Google Sheets and Excel apps, and Numbers;
  - Google Docs (a list and a table), Word;
  - WhatsApp (one and several messages, English and Dutch);
  - Telegram.

  Test in the iOS Safari tab, the iOS Home Screen app, the Android tab and the installed Android app. Record `clipboardData.types` and the raw `text/plain`.

- The Paste button's prompts on iOS and Android.
- The keyboard vs the Add button on iPhone (iOS 26/27) and Android.
- Scrolling 200 cards.
- Whether the draft survives switching apps in the iOS Home Screen app.
- The file picker without `accept` (iCloud, Downloads, Drive).
- Dutch-locale Excel CSV and Windows-1252 files.
- Quizlet export in a phone browser: does it force the app, is it free, and is it really creator-only?
- The Android share target after install.
- Push from the "Notify me" tap (iOS 18.4+ Home Screen app, Android, desktop).
- Whether request emails land in the inbox (Gmail, iCloud, Outlook).

## 11. Rejected or out of scope

Don't plan these:

- Quizlet link import, and any scraping connector.
- Per-app API connectors.
- In-app AI import or "magic import".
- Native apps and browser-extension importers.
- Telegram capture.
- A public request wishlist with votes (requests can carry private context).
- Google Sheets link import (copy and paste already works).
- Auto-picking the first dictionary sense.
