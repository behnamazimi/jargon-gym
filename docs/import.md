# Import

This is the map of how terms get into a collection: the chooser, the paste
importer, the commit, and unfinished terms. Read it before changing any of
them.

## The routes

`/jargon/import` is the chooser. It searches shared collections first (one-tap
Add), then offers three starting points: a pasted list, a deck from another
app, or one term. Everything else lives under it:

| Route                  | What it does                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `/jargon/import/paste` | Paste, Check, Add. `?to=<id>` presets the destination; the Library's `+` menu "Paste a list" links here. |
| `/jargon/import/apps`  | Per-app export guides (`lib/jargon/import/guides.ts`).                                                   |
| `/jargon/import/more`  | The JSON format and the developer AI-skill card.                                                         |
| `/jargon/capture`      | Save one term. `?to=<id>` presets the collection.                                                        |

No AI runs anywhere in this path. Parsing is deterministic.

## Parsing

`lib/jargon/import/parse/` is pure: the same text and options always give the
same rows. `detect.ts` runs the rules in a fixed order and the first match wins:
clipboard HTML table, Anki plain-text headers, tabs, consistent `;` or `,`
fields, one item per line (split at the first occurrence of the separator that
covers most lines), alternating short and long lines, then bare words.
`build-terms.ts` turns rows into terms and folds repeats. JSON goes through
`json-input.ts` and the same Check screen. `read-input.ts` wraps both and
enforces the 500-term cap.

Papa Parse reads delimited text, always with an explicit delimiter chosen by
these rules, never its own guess.

## Check and commit

The Check screen's state is a reducer (`check-state.ts`). Duplicates are matched
against the destination by trimmed, lowercased name, the same rule as the
`terms_domain_term_idx` index. The default is Skip. Update changes terms in
place by id, so learning history survives, and never replaces a value with an
empty one.

`my_import_terms` commits everything in one transaction. The client creates the
import id, so a double tap or a retry returns the stored result instead of
importing twice. `import_batches` keeps counts, the detected format and the
entry point, never term text. A collection is never merged by name: the
destination is explicit. There is no undo. A wrong import into a new
collection is undone by deleting the collection.

The pasted list is kept in local storage while you work and cleared after a
successful commit.

## Capture

`/jargon/capture` saves one term in a few seconds: Term, an optional Definition
and a collection chip. "More details" holds the rest on demand: category (defaults
to the one most terms in the collection use), example, mental model, in practice,
anti-example, debated, note and links to other terms (`loadCaptureTerms` fetches the
collection's finished terms for the picker). The Library's `+` menu "One term" and the
empty-collection button link here with `?to=<id>`; there is no add-term dialog. The chip starts from `?to`, then the collection used last on
this device (`lib/jargon/capture/destination-pref.ts`), then the first one. Someone
with no collection is asked to name their first. It writes through the same
`createTerm` action as the term editor, so a term without a definition is
saved unfinished. While you type, `findCaptureDuplicate` checks the chosen
collection only (the unique index is per collection). Pasting several lines offers
"Add N terms", which hands off to the paste importer. Capture writes no
`import_batches` row. It lives under `/jargon` so it gets the app chrome and hides
the dock while you type.

On Android, the installed app is also a share target (`share_target` in
`app/manifest.ts`, GET to `/jargon/capture`). A shared sentence is parsed by
`parseSharedInput`: the link is dropped, a word or short phrase fills Term, several
lines offer the paste importer, and a longer sentence shows its words as chips
(`lib/jargon/capture/tokenize.ts`, `selection.ts`). The tapped words become the term
and the sentence the example. iOS has no share target. The manifest shortcuts are Add
a term, Paste a list, Read and Review (Android shows at most four). After a manifest
change Android may need a reinstall, or a day for the WebAPK to update.

## Unfinished terms

Only a term's name is required. A term with no definition (`definition is
null`) is unfinished. It is saved, and only its owner sees it. It stays out of
every study and delivery surface until it gets a definition:

- `get_trace_candidates` and `progress_state_by_domain` skip it, so Read,
  Review, Quiz, Stories, Triage, Mastery, the widget, Telegram and every count
  ignore it.
- Row-level security hides it from everyone but the owner, so shared views,
  public pages and the sitemap never show it.
- Readers that bypass row-level security filter it themselves: narration,
  quiz distractors and the evaluation route.

A finished term never goes back: a trigger rejects clearing a definition. That
keeps every `review_state` row attached to a finished term. Deleting an
unfinished term loses nothing, because it has no history.

Category is optional too. The category filter shows only with two or more.

## Requests

A person with only a topic can request a collection: `/jargon/import/request`,
reached from the last row of the chooser's search and from Browse when a search
finds nothing. The team builds the collection by hand and delivers it as a
private collection the requester owns. Nothing here runs an AI model, and no
screen says who does the work or implies automation.

Requests ship switched off. `collection_request_settings.enabled` (one row,
changed on `/admin/requests`) hides every entry point while off; open requests
keep their cards and emails. `paused` shows a banner and gives new requests the
longer estimate without touching the dates of requests already sent.

- **Quota.** One open request at a time (a unique index) and three in 30 days.
  Declined requests and requests cancelled before work started don't count.
  `my_create_collection_request` enforces it; the form shows it first.
- **States.** `requested` (shown as "In the queue"), `in_progress` ("Being
  prepared", set only when the admin accepts), `needs_input` (one question, one
  reply; the delivery clock pauses), `ready`, `declined`, `cancelled`, `merged`.
  A merged request shows its primary's progress through
  `my_list_collection_requests`. If a primary is cancelled or deleted, the oldest
  merged request takes its place.
- **Fulfil.** On `/admin/requests/[id]` the admin pastes the prepared list through
  the same parser and Check screen as everyone else (`ImportFlow` with an
  adapter). Every term needs a definition. `admin_deliver_request` runs
  `_import_terms_for` once for the requester and once for each merged request, so
  each person gets their own private, active copy; a taken name becomes
  "Name (2)". A request a Browse collection already answers goes through
  `admin_deliver_existing_collection`, which adds it to their Library.
- **Definitions.** The "Request definitions" button on a collection's "N terms to
  finish" banner (shown only while the person can send a request) opens
  `/jargon/import/request?definitions=<collection id>`. That request has kind
  `definitions` and a `target_domain_id`; it never creates a collection. The admin
  pastes definitions on the desk and `admin_fill_definitions` fills them into the
  requester's unfinished terms by name, in place by id, skipping everything else.
  `admin_request_unfinished_terms` is how the admin sees the waiting words, because
  they can't read a private collection. A trigger keeps the two ways of closing a
  request apart. These can't be merged. There is no "language collection" kind, so
  any owned collection with unfinished terms qualifies.
- **Email** (`lib/requests/email-copy.ts`, sent by `lib/admin/requests/notify.ts`):
  Ready, a question, one delay notice ("Set new date"), and a decline. A failed
  send never undoes the change; `email_failed` is set and the desk offers Resend.
  There is no email on Accept. Everything people wrote is HTML-escaped.
- **Copy rules.** `lib/requests/copy.ts` holds every user-facing string and
  `copy.test.ts` scans it for the never-use list. The privacy line and the FAQ
  answer (`REQUEST_COPY.public`) go into `before-you-sign-up` when requests are
  switched on, not before.
- **Metrics** come from request timestamps. For example, time to Ready against the
  promise: `select avg(ready_at - created_at), avg(ready_at - due_at) from
collection_requests where status = 'ready'`.

A bad delivery is never cleaned up with SQL deletes: deleting a term removes its
progress. The requester can delete a delivered collection they haven't used.
