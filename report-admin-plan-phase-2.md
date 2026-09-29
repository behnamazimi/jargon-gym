# Admin phase 2 plan: layout, navigation, Overview (branch `admin-phase-2-layout`)

One PR, no migration. Covers S1 to S4, S6 to S8 and the Overview from report-admin.md.

## Design correction to the report

The report said "guard once in the layout". Next's authentication guide (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`,
"Layouts and auth checks") says layouts do not re-render on client navigation, so a layout-only check
does not protect later navigations, and layout and page render in parallel. So:

- One helper, `requireAdminPage()` in `lib/admin/page-guard.ts` (cached per request): loads the session,
  checks the role, calls `notFound()`, returns `{ supabase, user }`.
- Every admin page and the layout call it. The copy-pasted three-line check disappears, forgetting it is
  still a one-line omission, and a test lists the pages to keep this honest (below).

## Changes

1. `app/(private)/admin/layout.tsx` (server): `await requireAdminPage()`, then the shell: a two-column
   layout, `max-w-7xl`, sidebar on `md+`, horizontally scrolling nav row on phones. Pages no longer
   render a wrapper or `<AdminNav />`.
2. `components/admin/admin-sections.ts`: the single nav config (group, label, icon, href, match rule).
   Groups: Overview; Manage (Collections, Invites); AI (AI credits, Narration); System (Queue debug, still
   at `/jargon/debug` until phase 6). Helper `isSectionActive(pathname, href)`: exact for `/admin`,
   segment-boundary prefix for the rest (`/admin/collections-x` does not match Collections).
3. `components/admin/admin-nav.tsx` (client, replaces `components/jargon/admin/admin-nav.tsx`): a real
   `<nav aria-label="Admin">` with DaisyUI `menu` (`menu-vertical` on md+, `menu-horizontal` scroller on
   phones), `aria-current="page"` on the active link, group titles on desktop only. Not a tablist (S6).
4. `components/app/account-nav.ts`: `ADMIN_NAV_ITEMS` becomes one entry, "Admin panel" -> `/admin`.
   Profile menu and phone "more" sheet keep rendering the list, so they cannot drift again (S4).
   Drop the "Admin" group label in the profile menu (one item).
5. Pages: replace the inline guard with `requireAdminPage()`; client page components drop `<AdminNav />`
   and the `mx-auto max-w-4xl px-4 py-8` wrapper (the layout owns width and padding). Page titles stay
   as they are (phase 3 replaces them with `AdminPageHeader`). `AdminPageSkeleton` loses its wrapper.
6. Overview page `app/(private)/admin/page.tsx` and `loading.tsx`:
   - "Needs attention" list, only unhealthy or non-zero items, each a link to where it is fixed:
     pending waitlist requests (count, `head: true`); narration worker note when `describeCron` says
     warning; refunds high (`refundsLookHigh`); AI features switched off (quiz, story, narration);
     narration sync running or stalled.
   - Key numbers: total people, people who used AI credits, credits spent, requests in 24 h, waitlist waiting.
   - A read that fails shows "Unknown" for that tile and an "Couldn't load" attention item instead of
     failing the page (each source wrapped; the page never throws for one bad read) (R14 in spirit).
   - Logic in `lib/admin/overview.ts`: `loadAdminOverview(supabase, admin)` gathers with per-source
     `settle` and `buildAttentionItems(input)` is pure and unit-tested.
7. Delete `components/jargon/admin/admin-nav.tsx`; `lib/chrome.ts` already treats `/admin` as an overflow
   path (no change).

## Rollout and rollback

App only. Revert the commit to roll back. URLs are unchanged, so nothing to redirect.

## Tests

- `components/admin/admin-sections.test.ts`: unique hrefs; `isSectionActive` (exact overview, nested
  paths, no false prefix match).
- `lib/admin/overview.test.ts`: `buildAttentionItems` for each condition, ordering (most urgent first) and
  the all-clear case; `loadAdminOverview` turns a failed source into unknown without throwing.
- `lib/admin/page-guard.test.ts`: non-admin and signed-out call `notFound`; admin gets the client.
- `app/(private)/admin/pages-guarded.test.ts`: reads every `page.tsx` under `app/(private)/admin` and
  asserts it imports `requireAdminPage` (so a new page without a guard fails CI).
- `pnpm check`, `pnpm test`. Browser check of the layout at desktop and phone widths if the dev server can
  run against the local database (needs an admin user); otherwise say so in the PR.

## Edge cases

- Non-admin visiting `/admin/*` still gets a 404 from each page, not only the layout.
- Phone: the nav row scrolls, the active tab stays visible (scrollIntoView not needed for 6 short items).
- The phone chrome (`isMorePath`) and dock behaviour for `/admin` are unchanged.
- Server-only imports: the overview uses `createAdminClient()` only for the sync job read (same as the
  narration page); it never reaches a client component.
