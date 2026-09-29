# Admin phase 5 plan: app release using the phase 4 functions (branch `admin-phase-5-rpc-release`)

One PR, app only, no migration. **Merges only after the "Deploy Supabase migrations" run for phase 4
(#119) has succeeded**, since it calls functions that migration creates. Covers R4, R7, R11 and the
"admins can't see private collections" finding.

## Changes

- **Collections list (R7):** `listAllCollectionsForAdmin` calls `admin_list_collections()` (owner email and
  term counts come back grouped; the fetch-every-term-row read goes away). It now includes other people's
  private collections. Each row gets `ownerId`, and the page passes the signed-in admin's id so rows that
  are private and owned by someone else are **read-only** (no built-in, public or slug controls, just
  the facts). Shared, built-in, public and the admin's own rows behave as before. Phase 8 builds the
  full "All collections" view on this.
- **Publish (R4):** `setPublic(true)` builds the slugs in TypeScript from the RPC's list (all domain
  slugs, including private collections' that a session read cannot see) and the domain's terms, then
  calls `admin_publish_collection` once. A `23505` (a slug was taken meanwhile) or the "Some terms have no
  slug yet" error re-reads and retries once; a second failure is a plain message. `setPublic(false)` stays a
  direct update. `ensureDomainSlug` / `ensureTermSlugs` and their per-term update loop are deleted.
  `updateDomainSlug` takes the taken slugs from the same list, so it can no longer pick a slug an invisible
  private collection owns.
- **Settings (R11):** `setNarrationEnabled`, `setNarrationCaps` and `saveAiCreditSettings` call
  `admin_set_narration_enabled`, `admin_set_narration_caps`, `admin_set_ai_credit_settings`. Zod validation
  stays in the action for friendly messages; database exceptions are unexpected (generic message). The
  two-write comments and the row-count checks go away. `grantAiCredits` and `resetAiCredits` already
  use RPCs and now also leave audit rows without any app change.
- Error mapping stays in `runAdminAction` (only `AdminError`s show).

## Rollout / rollback

Order: phase 4 merged, its deploy run green, then merge this. Rolling back the app is a revert; the
database keeps the functions, which the older app ignores.

## Tests

Update the collections, narration and ai-credits action tests to the RPC calls (arguments asserted, retry
on 23505 once, second failure message, read-only rows filtered in the list mapper); add a test for the list
mapper (counts default to 0, owner email, read-only flag). `pnpm check`, `pnpm test`. Run the collections
page against the local database with the phase 4 migration applied if an admin session is available;
otherwise say in the PR that it was not browser-verified.

## Edge cases

- Publishing a collection whose terms were added between the read and the RPC: the retry covers it.
- Slug collisions against collections the admin can't read: covered by taking slugs from the RPC list.
- A domain with terms but where the admin can't read terms (private, someone else's): the row is
  read-only, so the action is unreachable from the UI; the RPC would still refuse it cleanly.

## Review amendments (applied)

- **Narration page (found by the reviewer):** it feeds `listAllCollectionsForAdmin` into a service-role
  coverage read, and `startNarrationSync(domainId)` has no owner guard, so after this change it would list
  and could narrate other people's private collections. The narration page filters the list to collections an
  admin may act on (`shared`, own, built-in or public) via one shared `canActOn(row, adminId)` helper, and
  `startNarrationSync` and `getNarrationSyncCoverage` re-check the ids server-side against the same rule
  (an admin can't pass an arbitrary domain id). Tests for the filter and the guard.
- **Read-only rule, defined once:** the mapper returns `readOnly: boolean` (`private` and `ownerId !== adminId`)
  from `listAllCollectionsForAdmin(supabase, adminId)`. Rows that are read-only render plain text ("Built-in:
  yes/no", "Private") instead of switches; a private, someone else's collection that is built-in and public
  is shown read-only with its live status. `requireAdminPage()` already returns `user`. The test wording is
  "marked read-only", not "filtered". `updateDomainSlug` and `setBuiltin` add `.select("id").single()` so an
  update that touches no row is an error, not a silent success.
- **Retry and errors:** phase 4 (still unmerged) changes the "Some terms have no slug yet" exception to
  SQLSTATE `40001` (`serialization_failure`) so the app matches a code. The app retries once, **re-reading
  the domain list and the terms**, when `code` is `23505` or `40001`; a second failure is
  `AdminError("Couldn't publish. Try again.")`. Other RPC errors are generic. `updateDomainSlug` maps `23505`
  to `AdminError("That slug is taken. Try another.")` (no retry). Tests mock `{ code, message }` shaped errors.
- **Slug generation:** the term read is paginated with `.range()` (PostgREST `max_rows` is 1000, so a large
  collection would never finish slugging); only terms without a slug are sent; the root is truncated to 100
  characters before the `-N` suffix (the function's limit is 200); the domain slug parameter is the
  domain's own slug when it has one (the taken set excludes the domain itself); revalidation uses the slug
  the RPC returns; the list mapper coalesces nullable `slug` and `owner_email` (typed non-null by the
  generator). `admin_list_collections` is also capped at 1000 rows by PostgREST: accepted, noted in the PR.
- **Types:** `p_term_cap` is typed `number` although null means no cap; a cast with a one-line comment.
- **Ordering:** merge only after the migration workflow run triggered by phase 4's merge has finished green,
  not merely after the merge. Grant and reset audit rows start at the phase 4 deploy, not here.
- **Deferred:** audit rows for the direct writes (`setBuiltin`, unpublish, slug change) come in phase 9 with
  `admin_write_audit`. `setAiCreditsEnabled` and `setAiFeatureEnabled` stay direct updates on purpose.
- Delete the unused imports left behind (`requireAdminClient` type, `AdminClient`); knip must stay green.

## PR review amendments (applied)

- **Every collection action re-checks ownership** (`findActable`): the publish function bypasses row level
  security, so publishing someone else's private collection (its terms unreadable, all already slugged)
  would have made it public. `setBuiltin`, publish, unpublish and slug change all answer "Collection not
  found." for another person's private collection. Tests cover each.
- **Narration allows more than editing does:** `canNarrateCollection` = actable or public (main could read
  public collections). Publish and edit use the stricter rule only.
- `updateDomainSlug` refreshes the old and new public pages when the collection is public.
- Accepted and noted: `admin_list_collections` is capped by PostgREST at 1000 rows, so past that many
  collections the taken-slug set is incomplete and publish/slug can fail with "Couldn't publish. Try again."
  The list would need paging (or a service-role read) to lift that.
