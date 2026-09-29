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

## Review amendments (applied)

- Nav: `menu menu-horizontal md:menu-vertical flex-nowrap overflow-x-auto`, `menu-active` class plus
  `aria-current="page"` on the active link (DaisyUI does not style `aria-current`), group titles `max-md:hidden`.
  Config entries accept extra `matchPrefixes` (the AI hub in phase 6 must highlight for several paths);
  `isSectionActive` trims a trailing slash.
- Layout: content column is a `minmax(0,1fr)` grid track so wide tables scroll inside their own wrapper;
  the layout owns `px-5 py-7 pb-20`; width stays `max-w-6xl` like `pageContainerClass` (not 7xl).
  `error.tsx` and `AdminPageSkeleton` lose their own width/padding wrappers.
- `account-nav.ts`: one admin entry with a new icon (`LayoutDashboard`), unused icon imports removed,
  `STUDY_SCREEN_TITLE_PREFIXES` gets `/admin/narration` (keep `/admin` last), profile menu keeps a
  separator but drops the group wrapper and label. Queue debug loses its menu entry until phase 6 moves it
  under System; it stays in the admin sidebar.
- `requireAdminPage()` composes the already cached `getSessionUser` / `getUserIsAdmin`; no extra `cache()`.
  It is for pages and the layout only; actions keep `requireAdminClient`.
- Guard test recurses through `app/(private)/admin`, asserts the call `await requireAdminPage()` (not only
  the import) and fails when it finds no pages.
- Overview data: reuse `getAiCreditSummaryForAdmin` (total people, used credits, credits spent, spends 24 h,
  refunds, exhausted) plus one waitlist `head` count. Label the 24 h number "AI credit spends" since own-key,
  narration and evaluation calls are not in it. `Promise.allSettled`, each failure logged and shown as
  unknown; reads that return `{ error }` are mapped to unknown explicitly.
- Attention items also cover: `featureHealth` failures (quiz, story, narration_term, term_evaluation; a
  missing key ranks above a switch being off), the credits master switch off, people who ran out of credits,
  refunds high. Narration on/off is a light read of both `ai_feature_settings` rows, not
  `getNarrationSettingsForAdmin` (which also runs usage counts). "Sync stalled" is `describeCron(...).warning`
  with `jobNeedsCron` computed as in `narration/page.tsx`, reported once (no separate worker-note item);
  the sync job read is try/caught.
- Knip: export only what other files or tests import.
