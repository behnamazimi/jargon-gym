# Admin phase 8 plan: Collections redesign (branch `admin-phase-8-collections`)

One PR, app only, no migration. Report 5.3 with the decisions in section 10: built-in collections first, an
"All collections" view that includes other people's private ones (read-only), one status control, a proper
slug editor. Reuses the phase 7 blocks (`AdminSearchBar`, `AdminPagination`, `AdminTabs`, list params).

## Views and data

- `/admin/collections?view=builtin|all&q=&page=` (default `builtin`: built-in collections, published first,
  then by name). `all`: every collection, by name. Search matches name, owner email and slug
  (case-insensitive, literal `%`/`_`). 25 a page, page clamped.
- Data still comes from `admin_list_collections()` (one read, at most 1000 rows, phase 5 note). Filtering,
  searching, ordering and paging are a pure `queryCollections(rows, params)` in `lib/admin/collections-query.ts`
  (tested), because the function returns everything already and the sizes are small. `AdminCollectionRow`
  gains `updatedAt`.
- `parseCollectionParams` next to `parsePeopleParams` in `lib/admin/list-params.ts` (same clamp and clean rules);
  `collectionsHref(params)` builds addresses.

## One status control

Replace the Built-in and Public switches with a single **Status** select per row: `Not built-in`, `Built-in`,
`Published`. Derived from `isBuiltin`/`isPublic` (Published implies built-in). New action
`setCollectionStatus(domainId, status)` (ownership-checked with `findActable`, like every collection action)
maps each move onto the existing safe operations: to Not built-in (clears public), to Built-in (clears public
if it was published), to Published (marks built-in first when needed, then the publish function). Moves that
take a public page offline (Published to anything else, or Not built-in from Published) ask first and say the
public page goes offline. The rule "Publish needs Built-in" is stated inline as the select's help text.
`setBuiltin`/`setPublic` stay exported only if still used elsewhere; otherwise removed (knip).
Read-only rows (other people's private) show the status as text, as today.

## Slug editor

An **Edit URL** button opens a dialog with the public address (`/j/<slug>`) as you type, the normalized slug,
a **check** (server action `checkDomainSlug(domainId, raw)` returns `{ slug, taken }` using the same list and
`generateUniqueSlug` rules, so "taken" shows the next free slug instead), and an explicit **Save**. When the
collection is published the dialog warns that the old address stops working and names it. The action is the
existing `updateDomainSlug` (unchanged rules, revalidating old and new pages). No save-on-blur anywhere.
Only shown for collections that have (or can have) a slug: built-in ones.

## Columns

Name (link to the public page when published), Owner, Terms, Status, URL (`/j/slug` + Edit URL), Updated
(`formatAdminDate`). Visibility (Shared/Private) shows as a small badge next to the name.

## Rollout / rollback

App only, URL unchanged. Rollback is a revert.

## Tests

`queryCollections` (built-in view ordering: published first; all view; search over name/owner/slug with
escaping; paging and clamp), `parseCollectionParams`, `setCollectionStatus` (each transition; ownership refusal;
published to built-in refreshes the public page and sitemap; publishing a not-built-in collection marks it
built-in first; partial failure between the two steps leaves a consistent, reported state), `checkDomainSlug`
(free, taken with suggestion, own current slug counts as free, invalid text), status derivation helper.
`pnpm check`, `pnpm test`.

## Edge cases

- Status changes while another admin edits: last write wins, and the row follows server data after refresh.
- A collection whose terms the admin can't read (someone else's private): read-only, so unreachable.
- The two-step "mark built-in, then publish" is not atomic: if publishing fails, the collection stays built-in
  and the error says so.
- Empty result pages; page past the end clamps.

## Review amendments (applied)

- **Explicit transition table** (`lib/jargon/admin/collection-status.ts`, pure and tested: `statusOf`,
  `transitionOf`, `needsOfflineConfirm`). In terms of `{is_builtin, is_public}`:
  Not built-in to Built-in: `is_builtin = true`. Not built-in to Published: `is_builtin = true`, then the publish
  function. Built-in to Not built-in: one update `{is_builtin:false, is_public:false}`. Built-in to Published:
  the publish function. Published to Built-in: `is_public = false` only (`setBuiltin(true)` would not do this).
  Published to Not built-in: one update `{is_builtin:false, is_public:false}`. Never two updates that unbuild then
  unpublish (the `domains_public_requires_builtin` check would fail the first). "From" is computed on the server
  from the list, not sent by the browser; an idempotent target is a no-op success (Published to Published skips
  the publish call). The action lists collections **once** and passes the result down (it does not call the old
  `setBuiltin`/`setPublic`, which are deleted with their exports; `actions.test.ts` is rewritten). A failed
  publish after marking built-in leaves it built-in and says so. `/j` is revalidated too (its listing is cached
  for an hour). Audit rows come in phase 9.
- **1000-row cap made visible:** when the list returns 1000 rows the page shows a notice that it is truncated,
  and a test covers it. (A real fix needs a migration and is out of scope.)
- **Slug editor, checked for real:** pure `resolveSlug(raw, taken)` in `lib/jargon/admin/slug-check.ts` returns
  `{ slug, taken, suggestion, valid }` (text that slugifies to nothing is invalid, not "item"; a cut over-long
  slug is reported). `checkDomainSlug` is an explicit **Check** button (one server read; the preview address is
  computed client-side as you type), Enter checks, never saves; **Save** is disabled until a check of the
  current text passed and any edit clears the result; late check responses are ignored with a request counter
  (no effects). `updateDomainSlug(domainId, raw, expected)` re-resolves and **refuses with "That address is
  taken" if the result differs from what was checked**, instead of quietly suffixing. The dialog is not
  dismissable while saving and warns, before Save, that the old public address (and its term pages) stop working.
  The server also requires the collection to be built-in or already have a slug. Editing is allowed whenever a
  slug exists, so an unpublished collection can free its old slug.
- **Status control:** a native DaisyUI `select select-sm`, controlled by the server status with
  `useOptimistic` and `aria-disabled` while saving (focus stays), a success toast (the row may leave the current
  view), confirm state copied from `AdminSwitch`. Help text: "Publishing also marks it built-in."
- **Search and paging are plain TypeScript:** no SQL escaping; case-insensitive `includes` over name, owner
  email (nullable) and slug; stable order (name, then id); reuses `PAGE_SIZE`, `cleanSearch`, `clampPage`,
  `pageBounds`. `parseCollectionParams`/`collectionsHref` go in `lib/admin/collections-params.ts`.
- **Files:** `components/admin/collections/{collections-table,collection-row,status-select,edit-url-dialog}.tsx`,
  a server `page.tsx` like the people page (awaits `searchParams`), pure modules above. Deviations from the
  report, stated: an "Updated" column instead of "published date" (the database has no such column), owner
  search instead of an owner filter, visibility as a badge next to a three-value status.
- **Tests:** the harness gets a per-call update failure queue to assert the ordered updates and the
  partial-failure state; ownership refusal, `/j` revalidation and the truncation notice are covered.
