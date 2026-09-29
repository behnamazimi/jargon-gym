# Admin phase 7 plan: People (branch `admin-phase-7-people`)

One PR, app only, no migration. The missing noun from report-admin.md 5.2: the same person is touched on
three pages today (invites, credits, narration access).

## Routes

- `/admin/people` with `?view=waitlist|members`, `?status=pending|invited|signed_up|all` (waitlist, default
  `pending`), `?q=` (email search), `?page=` (25 a page). Default view is the waitlist, since approving is the
  daily task.
- `/admin/invites` redirects (temporary, `lib/redirects.ts`) to `/admin/people?view=waitlist`. The sidebar's
  Manage group becomes Collections, People; the Overview's waitlist item points at the people page.

## Data (`lib/admin/people/`, server-side, RLS-readable by an admin)

- `lib/admin/list-params.ts`: `parseListParams(searchParams)` clamps page to at least 1, trims `q` to 100
  characters, validates `status`/`view` against the allowed sets; pure and tested. `containsPattern(q)` in
  `lib/admin/email-lookup.ts` (escapes `\`, `%`, `_`) for `ilike '%q%'`.
- `waitlist.ts` (moved from `lib/jargon/admin/list-waitlist-requests.ts`): `listWaitlist({status, q, page})`
  returns `{ rows, total }` with exact count and `.range()`. `signed_up` stays derived
  (`invited` and the referral code has `used_by`); because that status is derived, the `signed_up` and
  `invited` filters use the `referral_codes(used_by)` embed and filter in the query with `.not/.is` on it
  (embedded resource filter with `!inner` where needed), not in memory, so counts and pages are right.
- `members.ts`: `listMembers({q, page})` from `users` (`id, email, role, created_at`), newest first, count
  exact. Admins can read every user through the `users` select policy.
- `person.ts`: `getPerson(userId)` for the dialog: the user row, their credit line from
  `admin_ai_credit_usage` (limit 1000; shows "No credit use yet" when the person isn't in it), and their
  narration allowlist membership (`ai_feature_allowlist`, admin-readable). Read through a server action
  (`getPersonDetails`) when the dialog opens, not on page load.

## UI

- Shared blocks (first consumer, reused by phase 8): `AdminTable` (head, empty message, sticky header,
  wrapper), `AdminSearchBar` (a plain GET `<form>` that keeps the other params via hidden inputs, no client
  JS), `AdminPagination` (prev/next links, "Showing 26 to 50 of 132"), `AdminTabs` (real links with
  `aria-current`, for the two views and the status filter).
- Waitlist table: email, status badge, requested (`formatAdminDate`), select checkbox on pending rows,
  Approve (confirm names the address, as today) and Resend. **Bulk approve:** select up to the page,
  one confirm ("Email N people"), then `approveWaitlistRequests(ids)` runs the existing single approval for
  each (sequentially, at most 25) and returns `{ approved, emailFailed, failed: [{ email, error }] }`; the UI
  shows a summary and lists failures. The approval logic is the phase 1 function, extracted (not copied).
- Members table: email, role badge, joined, **Manage**. The Manage dialog (client, loads details when
  opened): role and joined date, credit line (spent/granted/remaining) with **Grant** (the existing grant dialog,
  prefilled) and **Reset** (existing confirm), narration access as a switch backed by the existing
  add/remove allowlist actions, and (if they are on the waitlist history) nothing else. No role changes,
  no user deletion (out of scope).
- Everything uses `useAdminAction` / `AdminSwitch` / `ConfirmDialog`.

## Rollout / rollback

App only. Old `/admin/invites` bookmarks redirect. Rollback is a revert.

## Tests

`parseListParams` (clamping, unknown values), `containsPattern` escaping, waitlist filter/paging query builder
(mocked client: correct range, count, status filters incl. derived `signed_up`), `approveWaitlistRequests`
(mixed success, email failed, already handled, cap of 25, non-admin), members list, redirects test extended,
pages-guarded (new page), `AdminTable`/pagination pure helpers (page window math). `pnpm check`, `pnpm test`.

## Edge cases

- Search with `%`/`_` characters; empty results; page beyond the last (clamped to the last page).
- A person who is both a member and on the waitlist history: shown in Members; the waitlist keeps its row.
- Bulk approve of 25 with a slow email provider: sequential and bounded; partial failures reported, no
  request approved twice (the single approval's compare-and-set).
- The credit line is only as complete as `admin_ai_credit_usage` (1000 most recently active people); others
  show "No credit use yet", which is accurate for people without ledger rows.
