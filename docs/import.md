# Import

This is the map of how terms get into a collection: the chooser, the paste
importer, the commit, and unfinished terms. Read it before changing any of
them.

## The routes

`/jargon/import` is the chooser. It searches shared collections first (one-tap
Add), then offers three starting points: a pasted list, a deck from another
app, or one term. Everything else lives under it:

| Route                  | What it does                                           |
| ---------------------- | ------------------------------------------------------ |
| `/jargon/import/paste` | Paste, Check, Add. `?to=<id>` presets the destination. |
| `/jargon/import/apps`  | Per-app export guides (`lib/jargon/import/guides.ts`). |
| `/jargon/import/more`  | The JSON format and the developer AI-skill card.       |

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
