# Admin panel audit and redesign proposal

> Note: the AI redesign audit lives in `report.md`. This file is the admin panel report; phase plans
> are `report-admin-plan-phase-N.md`.

## Phases (one PR each)

Migrations follow expand, release, contract. The app deploys before migrations, so an app PR that
needs a migration merges only after that migration's deploy run has succeeded.

| Phase | PR                                                                                                                                                                                                             | Migration? |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1     | Bug fixes: `ActionResult` convention for Collections, Invites and Narration actions, exact email lookup, safe approve + resend, `setBuiltin` revalidation, no render-time worker kick, `/admin` error boundary | no         |
| 2     | Admin layout: guard once, sidebar shell, single nav config, `/admin` Overview, wider container                                                                                                                 | no         |
| 3     | Shared blocks (`AdminPageHeader`, `AdminSection`, `AdminSwitch`, `AdminStat`, `AdminTable`, `useAdminAction`, date formatter), migrate pages, `ActionResult` for AI credits                                    | no         |
| 4     | Expand migration: grouped term counts, atomic publish, atomic settings writes, `admin_audit_log`                                                                                                               | additive   |
| 5     | App release using the phase 4 RPCs (R4, R7, R11)                                                                                                                                                               | uses 4     |
| 6     | IA re-cut: AI hub with sub-pages (credits, narration), System > Queue, redirects, sidebar groups                                                                                                               | no         |
| 7     | People page: waitlist + users + credits + narration access, drawer, bulk approve                                                                                                                               | no         |
| 8     | Collections redesign: tabs, status control, slug editor, search and pagination via `searchParams`                                                                                                              | no         |
| 9     | Audit log writes, page and Overview feed                                                                                                                                                                       | uses 4     |
| 10    | Tests, `docs/admin.md`, AGENTS.md link, cleanup, final summary                                                                                                                                                 | no         |

**Status:**

- Phase 1: merged in #116, 2026-09-29. Accepted gaps: a rejected server-action call (network drop, stale tab) is not caught per component and reaches `error.tsx` until phase 3's `useAdminAction`; the ai-credits actions keep their own private `runAdminAction` until phase 3.

---

## 1. Summary

The admin area is four independent pages (Collections, Invites, Narration, AI credits) that each
re-implement the same things: the admin check, the page shell, the toggle-with-rollback pattern, the
error handling, the table. There is no admin layout, no admin home, and no shared vocabulary, so it
reads as four scripts that happen to share a tab bar.

The three biggest problems, in order:

1. **Errors are unreliable in production (bug).** Three of the four pages surface errors by
   `throw`ing from server actions. `lib/auth/require-session.ts` even documents this as intentional.
   But `app/(private)/admin/ai-credits/actions.ts:14-15` already records that Next replaces the
   message of a thrown server action with a generic one in production. So "No account found for that
   email.", "Only built-in collections can be made public.", "Request already handled." are all seen
   in dev and lost in prod. The ai-credits page was fixed; the other three were not.
2. **Navigation is duplicated in three places and has already drifted.** The tab bar has 4 items
   (no Debug). The profile menu and phone sheet (`ADMIN_NAV_ITEMS` in `account-nav.ts`) have a
   different 4 (no Narration, has Debug, names it "Manage collections"). An admin on desktop can't
   reach Narration from the menu.
3. **The page structure doesn't scale.** Every new admin feature means another page that copies
   ~20 lines of guard/shell and picks its own conventions. The AI credits page is already a 5-section
   scroll (master switch, per-feature switches, health, failures, prices, usage), and _feature_ switches
   live on it even though they aren't about credits.

The plan is: one admin layout that owns auth, shell and navigation; a small set of shared building
blocks; a re-cut of the information architecture around the things an admin actually manages (People,
Content, AI, System); and one action convention. None of this needs new backend tables except the
audit log (section 6).

---

## 2. Findings

### 2.1 Structure and navigation

| #   | Finding                                                                                                                                                                                                                                                                                                         | Where                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| S1  | No `app/(private)/admin/layout.tsx`. Each `page.tsx` repeats `getSessionUser()` + `getUserIsAdmin()` + `notFound()`. Forgetting it on the next page is a silent security hole. The server actions guard separately, which is good, but the _pages_ are the only protection for read data, and it is copy-paste. | all four `page.tsx`               |
| S2  | No `/admin` index. Visiting `/admin` is a 404. There is no "what needs my attention" landing.                                                                                                                                                                                                                   | —                                 |
| S3  | `<AdminNav />` is rendered inside each client page component, so the nav remounts on every navigation and the client page components must be `"use client"` just to host it. It would live in a layout and stay mounted.                                                                                        | `admin-*-page.tsx`                |
| S4  | Three nav lists that disagree (see summary).                                                                                                                                                                                                                                                                    | `admin-nav.tsx`, `account-nav.ts` |
| S5  | `/jargon/debug` (queue debug, calibration) is admin-only but lives under the learner app and has its own layout and page chrome. It is not reachable from the admin tabs.                                                                                                                                       | `app/(private)/jargon/debug`      |
| S6  | Nav is a `role="tablist"` of `<Link role="tab">`. These are links, not tabs (no tabpanel, no arrow-key model). It is announced wrongly by screen readers. `pathname.startsWith` also means a future `/admin/collections-archive` would highlight Collections.                                                   | `admin-nav.tsx`                   |
| S7  | Every page is `max-w-4xl` (896px). The Collections table has 7 columns and already needs horizontal scroll on a laptop. Admin surfaces want to be wider than a reading column.                                                                                                                                  | all pages                         |
| S8  | Page title is `max-md:sr-only`, so on phones there is no visible title, just the tab strip. The active tab is the only clue. Fine for four tabs, breaks as soon as there are more than fit.                                                                                                                     | all pages                         |

### 2.2 Information architecture (what is grouped with what)

The pages are organized by _feature that was built_, not by _task the admin does_.

- **AI credits** mixes four different jobs: (a) kill switches per AI feature (quiz, stories), (b) pricing
  and allowance, (c) monitoring health and failures, (d) support: grant or reset a person's credits.
  A quiz kill switch is not a credits concern; it is the reason `Features` explains "A feature
  switched off is off for everyone, including people with their own key. The credits switch above only
  stops use of the app's key." That sentence is a sign the grouping is wrong.
- **Narration** mixes a kill switch, caps, an allowlist (a people-management task), and a batch job
  runner (an operations task). It does not use the same "AI features" model as quiz/stories, even
  though they are all rows in `ai_feature_settings`.
- **`term_evaluation`** is in the AI registry (`lib/ai/registry.ts`) and has no admin control at all.
  So the admin's feature list is incomplete: 4 of 5 features are controllable, and which four depends on
  which page you remember.
- **Invites** lists waitlist requests, but "who can access the app" also includes: existing users, their
  roles, and narration allowlist membership. There is no Users page, so support tasks ("what's this
  person's status?") mean visiting three pages and typing their email each time.
- **Collections** conflates two things: curating built-in/public content, and looking at everyone's
  private collections. It is a flat, unfiltered list of _every_ collection in the database including
  private user ones, sorted by name.

### 2.3 Reliability and correctness

| #            | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Where                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| R1 **(bug)** | Thrown-error messages are lost in production (see summary). Affects Collections, Invites, Narration toggle/allowlist/sync.                                                                                                                                                                                                                                                                                                                                                           | `collections/actions.ts`, `invites/actions.ts`, `narration/actions.ts` |
| R2 **(bug)** | **Email lookup wildcards.** `narration/actions.ts:69` and `invites/actions.ts:29` use `.ilike("email", email.trim())` with the raw string. `_` and `%` are wildcards, so `a_b@x.com` can match `aXb@x.com`. `ai-credits/actions.ts` does it right with `exactEmailPattern`. On an action that grants access, the wrong person could be picked. One helper, used everywhere.                                                                                                          | `narration/actions.ts`, `invites/actions.ts`                           |
| R3 **(bug)** | **Approve sends the email before saving state.** In `approveWaitlistRequest`, `sendInviteEmail` runs, _then_ the row is marked `invited`. If the update fails, the person has an email but the row stays `pending`, so the next click mints a second referral code and sends a second email. The referral code is also created first and orphaned on any later failure. It should be one RPC (create code + mark invited, transactionally), then send, with a "resend" for failures. | `invites/actions.ts`                                                   |
| R4           | `setPublic` does 3 non-atomic steps (slug, per-term slugs, then flip `is_public`) and `ensureTermSlugs` issues one `UPDATE` per term in a loop. A failure mid-way leaves partial slugs (harmless but slow) and, for large collections, many sequential round trips inside one server action with no time bound. Do it in one SQL function.                                                                                                                                           | `collections/actions.ts`                                               |
| R5           | `setBuiltin(false)` silently also sets `is_public=false`. The UI does mirror that locally, but the admin is never warned that unbuilding a live public page takes it offline (and it isn't revalidated: `/j/<slug>` and the sitemap are not revalidated in `setBuiltin`, unlike `setPublic`). **(bug: stale public page/sitemap after unbuild.)**                                                                                                                                    | `collections/actions.ts:8-17`                                          |
| R6           | `updateDomainSlug` runs `generateUniqueSlug(slugify(raw), …)`. If the requested slug is taken, it quietly saves a _different_ slug (probably `-2`) and only updates the input afterward. Changing a public URL is high-consequence (breaks links, SEO) and gets no confirmation and no redirect. It saves on `blur`, so tabbing through the field can rewrite a slug.                                                                                                                | `admin-collections-page.tsx:74-86`                                     |
| R7           | `listAllCollectionsForAdmin` fetches **every row of `terms`** just to count per collection. Unbounded, gets worse with growth. Should be a grouped count (view or RPC).                                                                                                                                                                                                                                                                                                              | `list-all-collections.ts:28`                                           |
| R8           | The narration page runs a side effect **during render**: `kickNarrationSyncWorker()` inside the server component when a job is resumable. A GET that mutates/wakes a worker; prefetch, refresh, or two tabs can trigger it repeatedly. Move to an explicit "Resume" action (it already exists) or the cron.                                                                                                                                                                          | `narration/page.tsx:39-41`                                             |
| R9           | The narration page also computes coverage for _all_ collections on every load (`listCollectionNarrationCoverage`) although coverage is only needed once you open the sync section. Slow page for a rarely used panel.                                                                                                                                                                                                                                                                | `narration/page.tsx:34`                                                |
| R10          | Client state is seeded from props once (`useState(initial)`) and never reconciled. After `revalidatePath` the server data is fresh but the toggles/rows show whatever was set locally. Two admins (or two tabs) see and overwrite each other's state with no indication. Fine for one admin today; a footgun as soon as there are two.                                                                                                                                               | all client pages                                                       |
| R11          | `setNarrationCaps` writes two rows in a loop; a failure on the second leaves the first changed (the AI credits action has the same pattern and a comment admitting it). `setNarrationEnabled` reports "Couldn't change the switch" if the count isn't 2 but the first update may have applied. Real settings changes should be a single statement or RPC.                                                                                                                            | `narration/actions.ts`, `ai-credits/actions.ts`                        |
| R12          | `AdminNarrationCaps.handleSave` sends `Number(story)`, so a blank story field becomes `0` and then fails schema validation with a message that says "Stories need a cap" — a fine message, but there's no inline field validation, and `min=1 max=1000` attributes on the inputs do nothing since the form isn't a `<form>`.                                                                                                                                                         |
| R13          | Dates use `new Date(x).toLocaleDateString()` in client components that are also server-rendered. Server and browser locale/timezone differ, which risks hydration mismatches and shows different days to the same admin. Use one date formatter with an explicit locale and timezone (or a `<time>` with a relative label and full timestamp in `title`).                                                                                                                            | Invites, Allowlist                                                     |
| R14          | The AI credits page silently degrades: `getFeatureSettings(...).catch(() => null)` shows a toggle that is "off" and disabled when the read failed. The message exists, but "off" is a lie when the truth is "unknown". Same for `usageCount` returning `0` on error. Prefer showing "unknown".                                                                                                                                                                                       | `ai-credits/page.tsx`, `narration-settings.ts`                         |
| R15          | A failed data load throws from the server component and there is no `error.tsx` in `/admin`, so any query error takes the whole page down with the framework error screen.                                                                                                                                                                                                                                                                                                           | all pages                                                              |

### 2.4 Consistency

- **Three action-result conventions:** throw (Collections, Invites, most Narration), `{ error?: string }`
  (AI credits, caps), and a mix inside one file (`narration/actions.ts` does both). Only one is safe in
  production (R1).
- **Three toggle implementations** with the same optimistic-set/rollback/`startTransition` code copy-pasted
  (`admin-narration-page.tsx`, `admin-ai-credits-page.tsx`, `admin-ai-features.tsx`), plus two per-row
  variants (Collections, Invites). Each repeats the error `<p>`, and only some use `role="alert"`.
- **Section headings vary:** `text-lg font-semibold` (Narration caps, Features), `text-lg font-medium`
  (Audio sync), `text-base font-semibold` (all AI credits sections). Settings cards use
  `rounded-lg border px-4 py-3` in some places and bare headings with no card elsewhere.
- **Components:** some buttons are the app `Button` (React Aria), most are raw `<button className="btn…">`;
  inputs are raw `input input-bordered`; the reset dialog uses the app `AlertDialog`; the grant dialog is
  custom. AGENTS.md says "Use DaisyUI components"; the admin area uses a third of that consistently.
- **Micro-animation hacks:** `setTimeout(..., 150)` to fade a row before removing it (Invites,
  Allowlist). These run outside React's lifecycle, leak on unmount, and fight the optimistic update.
- **Naming:** "Collections" (tab) vs "Manage collections" (menu); "Invites" while the content is a
  _waitlist_; "AI credits" while it also holds feature kill switches; "Audio sync" vs "Narration".
- **Language of state:** Collections speaks in `Built-in / Public / Visibility`; those three flags interact
  (Public requires Built-in; Visibility shown separately) and the UI doesn't explain it. A single
  "Status: Private / Shared / Built-in / Published" would be clearer.
- **Empty states, loading skeletons:** the skeleton is one generic `AdminPageSkeleton` reused on all four
  pages with a different real shape each.

### 2.5 Usability gaps (product/UX lens)

- **No search, sort, filter or pagination anywhere.** Collections: every collection of every user in one
  table. Invites: every request forever, newest first, pending mixed with completed; the admin's real task
  is "what's waiting?" and it is not surfaced. Allowlist: no search. AI usage: capped at 200 with a note
  telling the admin to grant by email instead.
- **No summary, no "needs attention".** Nothing tells the admin on landing that there are N pending
  invites, narration cron is stale, or refunds are spiking. Those signals exist (`refundsLookHigh`,
  `describeCron`, `featureHealth`) but are only visible if you open the right page and read to the right
  paragraph.
- **Destructive/consequential actions have inconsistent confirmation.** Reset usage has a confirm; Remove
  from allowlist, unpublishing a collection, changing a live slug, cancelling a sync, changing prices that
  "apply to everyone straight away", and lowering the allowance all happen on a single click. Approve
  emails a real person with no confirm or preview.
- **No audit trail.** Grants, resets, price changes, kill switches, approvals: nothing records who did what
  or when. With one admin this is a nuisance; the moment there is a second, "who turned Stories off?" is
  unanswerable.
- **Settings save models are inconsistent.** Toggles apply instantly; the credits form has a Save button;
  caps have a separate Save; slug saves on blur. The admin has to learn each control's rule.
- **Feedback is thin.** Success is mostly invisible (a checkbox flips). Only two places say "Saved". No toast
  or inline confirmation pattern.
- **Accessibility:** raw checkbox toggles carry a good `aria-label`, but tables have empty `<th>`, status
  is conveyed by badge colour plus text (ok), errors inside table cells are not tied to the input, and
  the tab strip is misannounced (S6). Touch targets are `btn-sm` in tables on mobile.
- **Mobile:** the Collections 7-column table scrolls sideways; the AI usage list has separate card and
  table renders (`UsageCards` / `UsageTable`), which is a good idea worth generalizing rather than
  hand-rolling per page.

### 2.6 Maintainability

- **Boundaries are backwards.** Client "page" components (`admin-*-page.tsx`) exist to hold state and the
  nav, while the server `page.tsx` is a thin data loader. This forces whole pages to be client components
  and pushes all props through one big object (`AdminNarrationPageClient` takes 8 props).
- **Data helpers sit in three places:** `lib/jargon/admin/*` (collections/invites/narration),
  `lib/ai-credits/admin.ts`, and action files that also read (`getNarrationSyncStatus` etc.). Admin
  reads are named `…ForAdmin`, mixed into `lib/jargon`, though only Collections is about jargon.
- **Narration is a client-side mini-app.** `admin-narration-sync.tsx` polls server actions every 2 s
  via `useInterval`. That's the right idea, but the polling actions
  (`getNarrationSyncStatus`, `getNarrationSyncCoverage`) are exported as server _actions_ (POST, no
  caching, each guarded again) when they are reads.
- **Test coverage is lopsided.** AI credits and Narration actions have tests; Collections and Invites
  (the ones with the trickiest logic: slug generation, referral + email) have none.
- **Copy strings, magic numbers and constants** (`USAGE_LIST_LIMIT`, `NARRATION_FEATURES`, the `["quiz","story"]`
  lists, the `200` in the RPC call) are duplicated between the lib, action and component layers.
- **The admin check is duplicated:** three call sites of `getUserIsAdmin` in pages plus `requireAdminClient`
  in actions, with a doc comment describing behavior ("throws so call sites can just await") that
  contradicts the ai-credits file's approach.

---

## 3. Proposed information architecture

Organize by what the admin manages, not by which feature was built first.

```
/admin                      Overview (needs attention + key numbers)
/admin/people
    /admin/people             Users, waitlist, access (one list, filters)
    /admin/people/waitlist    Pending / invited / signed-up
/admin/content
    /admin/content/collections  Built-in + published collections
    /admin/content/browse       (later) all collections, read-only, searchable
/admin/ai
    /admin/ai                   Feature switches, health, cost
    /admin/ai/credits           Allowance, prices, usage, grants
    /admin/ai/narration         Access + limits + audio sync
/admin/system
    /admin/system/queue         Queue debug + calibration (moved from /jargon/debug)
    /admin/system/audit         Audit log
```

Rationale:

- **Overview** answers "do I need to do something?" in one screen: N pending waitlist requests,
  narration worker health, refund rate in last 24h, credits exhausted count, any feature off, sync job
  running. Every item links to where you fix it. All the signals already exist in code; this is wiring.
- **People** is the missing noun. Waitlist (Invites) becomes a filtered view of people, with search by
  email, and a person detail drawer showing: role, referral status, credits (balance, grant, reset), own
  key (yes/no only), narration access. Today those are three pages and an email field each.
- **AI** collects every feature kill switch in one table driven by `FEATURES` in `lib/ai/registry.ts`
  (all five, including `term_evaluation`): name, vendor, billing, on/off, health, price, cap, last 24h
  usage. Credits and Narration become sub-pages for what is specific to them. This also means adding a
  sixth AI feature adds one row and no new page.
- **Content** keeps Collections, but reframed (below).
- **System** is where the debug page belongs. It is an admin diagnostic, and moving it under `/admin`
  gives it the same guard, shell and nav (keep a redirect from `/jargon/debug`).

I would not build all of this at once; section 8 gives the order.

---

## 4. Proposed technical structure

### 4.1 One admin layout owns the guard and the shell

`app/(private)/admin/layout.tsx` (server component):

- Calls the admin check once and `notFound()`s. Pages no longer repeat it. Keep `requireAdminClient()` in
  actions; layout guard is for reads, actions still verify independently.
- Renders the shell: a left sidebar on desktop (grouped: Overview, People, Content, AI, System), a top bar
  with a menu button on mobile, breadcrumb/page title, and a content area with a wider max width
  (`max-w-6xl`, tables get the full width).
- A single `ADMIN_SECTIONS` config (label, icon, href, group, optional badge count) is the only nav list.
  `account-nav.ts` reduces to one entry, "Admin", linking to `/admin`, so the profile menu and phone
  sheet can't drift again.
- An `error.tsx` and a `not-found.tsx` inside `/admin` (fixes R15) with a retry button.

Use DaisyUI: `drawer` + `menu` for the sidebar, `breadcrumbs`, `stat`, `table`, `badge`, `toggle`,
`modal`/`alert`, `join`, `tabs` (real tab semantics only inside a page).

### 4.2 Shared building blocks (`components/admin/`)

Small and boring, extracted from what already exists:

| Component                                                                           | Replaces                                                |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `AdminPageHeader` (title, description, actions)                                     | the 4 hand-rolled `max-md:sr-only` headers              |
| `AdminSection` (heading, description, optional action)                              | mixed `h2` styles/cards                                 |
| `AdminSettingRow` (label, description, control, status/error)                       | the 3 toggle cards                                      |
| `AdminSwitch` (a toggle that runs a server action, rolls back, shows error)         | 3 copy-pasted toggle handlers (+ row variants)          |
| `AdminStat` / `AdminStatGrid`                                                       | `Stat` in the credits summary                           |
| `AdminTable` (sticky header, search box, empty state, pagination, mobile card mode) | 4 raw tables + `UsageCards`/`UsageTable`                |
| `ConfirmAction` (wraps the existing `AlertDialog`)                                  | ad-hoc confirmations                                    |
| `useAdminAction()` hook                                                             | the `startTransition` + try/catch + message boilerplate |
| `formatAdminDate` / `<AdminTime>`                                                   | 3 `toLocaleDateString()` calls                          |

`useAdminAction` runs an action, exposes `{ run, isPending, error }`, and shows a toast on success/failure.
That single hook is what makes optimistic toggles, save buttons and row actions behave the same.

### 4.3 One action convention

Every admin server action returns `Promise<ActionResult<T>>`:

```ts
type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
```

Generate them through one wrapper (an evolution of `runAdminAction` in `ai-credits/actions.ts`):

- performs the admin check,
- catches expected domain errors (`class AdminError extends Error` with a user-safe message) and returns
  them as `{ ok: false }`,
- logs unexpected errors and returns a generic message,
- revalidates the declared paths,
- writes an audit entry (section 6) for mutating actions.

This fixes R1 and R11 (through single-statement/RPC writes) in one place and removes the "throw vs
return" split. Actions move next to the feature they serve (`app/(private)/admin/<area>/actions.ts` stays),
but each is ~10 lines.

### 4.4 Data layer

- Move `lib/jargon/admin/*` and `lib/ai-credits/admin.ts` to `lib/admin/<area>/` (`people`, `content`,
  `ai`), keeping the existing function bodies. Naming: `listX` / `getX`, no `ForAdmin` suffix, since the
  folder says it.
- Replace the fetch-all-terms count with a grouped query (R7).
- Make lists take `{ q, status, page }` and return `{ rows, total }`; parse those from `searchParams` so
  filters are shareable URLs and survive reloads (server-rendered tables; no client state for filters).
- Convert `getNarrationSyncStatus` and `getNarrationSyncCoverage` from server actions into a route handler
  (`GET /api/admin/narration/sync`) or a Suspense-streamed server component, since they are reads used
  for polling.
- Move multi-step writes into SQL functions: `admin_approve_waitlist(request_id)`,
  `admin_publish_collection(domain_id)` (slugs and flag in one transaction),
  `admin_set_feature(feature, enabled, cap, cost)`.

### 4.5 Server components by default

Pages stay server components that load data and render `AdminTable`, `AdminStatGrid`, etc. Only
interactive leaf pieces (switch, row action, form) are client components. The eight-prop client "page"
components go away, along with the "seed state from props" problem (R10): after an action completes,
`revalidatePath` refreshes the server data, and optimistic state is limited to the single control.

---

## 5. Page-by-page redesign

### 5.1 Overview (new)

- Row of "needs attention" cards (each is a link, shown only when non-zero/unhealthy):
  pending waitlist requests; narration worker stale; refunds high; features turned off; sync job running.
- Key numbers: total users, active last 7 days, AI requests 24h, credits spent, waitlist waiting.
- "Recent admin activity" (last 10 audit entries) once the audit log exists.

Why: it turns the admin from a set of settings screens into something you check daily, and it reuses
signals already in the code.

### 5.2 People (was Invites)

- Table: email, status (Waitlist · Invited · Member · Admin), joined/requested, invited by, credits
  remaining. Search by email; filter by status; default filter "Waiting" so the daily task is the first thing you see.
- Row actions: Approve (with confirm showing the email that will be sent), Resend invite (fixes R3
  recovery), Grant credits, Reset credits, Add/remove narration access.
- Person drawer for the detail view (replaces the separate grant dialog and allowlist page).
- Bulk approve for the waitlist (select N, confirm once).

Why: the same person is touched on three separate pages today. And approval is the highest-stakes action
in the app (sends real email); it deserves a confirm, idempotency and resend.

### 5.3 Collections

- Default view: **built-in collections only**, sorted by published first. A tab/filter "All collections"
  for the read-only global view with search and owner filter.
- Replace the three flags with one status control per row: `Private / Shared / Built-in / Published`, and
  explain the rule inline ("Publish needs Built-in"). Unbuilding a published collection asks first and says
  the public page goes offline.
- Slug editing: an explicit "Edit URL" popover showing the resulting public URL, an availability check,
  a confirm when the collection is already published, and an explicit "Save" (no save-on-blur). Show the
  old slug that will stop working.
- Add columns that matter to the job: published date, last edited, public-page link, term count (from a
  grouped query).
- Pagination and search.

### 5.4 AI (new hub) and Credits

- `/admin/ai`: one table of all features from the registry: on/off switch, vendor, billing, health note,
  price or cap where relevant, usage last 24h. This absorbs the `Features` block, the narration master
  switch and gives `term_evaluation` a switch.
- `/admin/ai/credits`: master switch, allowance and prices (one form, one Save, one transactional RPC),
  health (summary + failure reasons), then the usage table with search. Grant/reset live on the row and in
  the People drawer, with a confirm on both and the amount shown in the confirm.
- Show "unknown" (not "off") when a read fails (R14).

### 5.5 Narration

- Sections in order of frequency of use: Status (on/off, worker health, cron note, usage vs cap), Access
  (allowlist as a table with search, add by email), Limits (one form), Audio sync (job runner).
  Coverage is loaded only when the Audio sync section is opened (lazy, R9).
- Sync job: keep polling, but from a GET endpoint; disable Start with a reason ("Narration is off",
  "Nothing missing"), and show the job history (last 5), not just the latest job.
- Remove the render-time worker kick (R8): show a "Resume" button.

### 5.6 System

- Move the queue debug and calibration pages under `/admin/system/queue`, redirect the old URL.
- Add an audit log page (below).

---

## 6. Audit log (new, small)

A table `admin_audit_log(id, at, actor_id, action, target_type, target_id, details jsonb)` written by the
shared action wrapper for every mutating admin action, plus a read-only page with filters by actor and
action. Insert through the same RPC that performs the change where the change is already an RPC (grant,
reset), so the log and the change can't diverge.

Why: it is the only new backend concept in this proposal, and it is what makes settings changes with
"applies to everyone straight away" consequences safe to operate. It also gives the Overview an activity feed.

---

## 7. Cross-cutting UX rules to adopt

1. **One save model per control type.** Switches apply immediately with optimistic UI and an inline result;
   forms have an explicit Save/Discard bar that shows when dirty; no save-on-blur.
2. **Confirm anything that affects other people or is hard to undo.** Approve/resend email, unpublish,
   slug change on a live page, price/allowance change ("this affects N people"), cancelling a sync,
   removing access, lowering the allowance. Confirmations state the consequence and the count.
3. **Every mutation gets visible feedback** (toast) and every failure a specific, safe message.
4. **Tables:** search, sort by the meaningful column, default filter for the common task, pagination, empty
   state that says what to do, and a card layout on phones.
5. **Status is words plus colour**, using one badge vocabulary across pages
   (`success / warning / error / neutral / info`).
6. **Dates:** one formatter, explicit timezone, full timestamp in a `title`.
7. **Copy:** noun-based, consistent page names (People, Collections, AI, Credits, Narration, Queue). Use
   "Waitlist" for what is called "Invites" today.
8. **Accessibility:** real `<nav>` with `aria-current="page"` for the sidebar, `role="alert"`/`status` on all
   messages, labelled table headers, 44px touch targets on mobile.

---

## 8. Suggested order of work

Ordered by risk removed per unit of effort. Each step is independently shippable.

1. **Fix the real bugs (small, do first):** action results instead of throws for Collections, Invites and
   Narration (R1); use `exactEmailPattern` everywhere (R2); revalidate public pages in `setBuiltin` (R5);
   remove the render-time worker kick (R8); make approve safe (R3, at minimum: update state first / single
   RPC, then send, add resend); add `error.tsx`.
2. **Admin layout + one nav config.** Guard once; delete `AdminNav` from pages and the duplicated
   `ADMIN_NAV_ITEMS`; add `/admin` with the Overview cards; widen the container. Pages otherwise unchanged.
3. **Shared blocks and hooks:** `AdminPageHeader`, `AdminSection`, `AdminSwitch`, `useAdminAction`,
   `AdminTable`, `formatAdminDate`. Migrate the four existing pages onto them (mostly deletions).
4. **`ActionResult` wrapper and the transactional RPCs** (publish collection, approve waitlist, settings).
5. **Re-cut the IA:** AI hub with all registry features; People page merging waitlist/credits/allowlist;
   move Queue debug into System.
6. **Search, filters and pagination** via `searchParams`; grouped count for collections (R7).
7. **Audit log** and the Overview activity feed (optional while there is a single admin).
8. **Tests:** actions for Collections and Invites (slug collisions, publish, approve/idempotency/email
   failure); `AdminSwitch`/`useAdminAction` unit tests; one test that every page under `/admin` is guarded
   by the layout.

Steps 1-3 are roughly a few days and would already change how the panel looks and feels; 4-7 are the
larger refactors.

---

## 9. What I would not do

- Don't add a third-party admin framework (react-admin, Refine). The surface is small, and the
  requirement is a consistent, maintainable set of a dozen components in the stack you already have
  (DaisyUI + React Aria + server components).
- Don't add roles/permissions beyond `admin` until there is a second kind of admin to design for.
- Don't build charts. A few numbers and links to what to fix are enough for the current scale.

## 10. Decisions

- **One admin for now.** Audit log and stale-state handling (R10) stay in the plan but move to the end
  and are optional; "invited by" is not worth showing yet. Don't build roles or multi-admin concurrency.
- **Queue debug stays under admin**, at `/admin/system/queue`, listed in the System group at the
  bottom of the sidebar. It is rarely used, so it gets no Overview card and no prominent slot. Redirect
  the old `/jargon/debug` URL.
- **Admins can see private user collections.** Keep them in the Collections list with owner email. They
  live under an "All collections" tab (read-only for private ones: no built-in/publish controls, since
  only the owner's content is involved); the default tab is built-in collections, which is the curation task.
- **Narration is part of AI, and AI has sub-pages**: `/admin/ai` (feature table),
  `/admin/ai/credits`, `/admin/ai/narration`. Narration's master switch moves onto the shared feature
  table with the rest; its access list, limits and audio sync stay on its sub-page. The sidebar shows AI
  as an expandable group with these three entries.
