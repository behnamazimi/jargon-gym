# Admin phase 6 plan: information architecture re-cut (branch `admin-phase-6-ia`)

One PR, app only, no migration. Implements section 3 of report-admin.md with the decisions recorded in
section 10: narration is part of AI, AI has sub-pages, Queue debug lives under admin (System).

## New routes

```
/admin                 Overview (unchanged)
/admin/collections     unchanged
/admin/invites         unchanged
/admin/ai              AI features hub (new)
/admin/ai/credits      was /admin/ai-credits
/admin/ai/narration    was /admin/narration
/admin/system/queue    was /jargon/debug (queue + calibration views)
```

Old URLs redirect (`next.config.ts` `redirects()`, permanent): `/admin/ai-credits` to
`/admin/ai/credits`, `/admin/narration` to `/admin/ai/narration`, `/jargon/debug` to `/admin/system/queue`
(query string kept, so saved debug links still work). Docs that mention the old URLs are updated
(`docs/ai.md`, `docs/ai-credits.md`, `docs/supabase/narration-sync-cron.md`).

## AI hub (`/admin/ai`)

One table driven by the registry: for each feature the admin controls, name, vendor, what leaves the app
(`FEATURES[...].sends`), billing (credits or none), on/off switch, health note (`featureHealth`), price or cap.
Rows: AI quiz, Stories, Term evaluation, Narration (one row for `narration_term` + `narration_story`, since
they are switched together). Switches call `setAiFeatureEnabled` (quiz, story, and now `term_evaluation`,
whose row exists in `ai_feature_settings`) and `setNarrationEnabled`. A row whose settings can't be read
shows "Unknown" and no switch (as on the credits page today). The hub links each row to its sub-page
("Manage credits", "Manage narration").

- `setAiFeatureEnabled` accepts `quiz`, `story` and `term_evaluation` (the schema enum grows by one; the
  update needs the admin's own client, same as today).
- The Features block leaves the credits page; the credits page keeps the credits master switch, summary,
  failures, settings and usage.

## Moves

- `app/(private)/admin/ai-credits/*` to `app/(private)/admin/ai/credits/*`; `narration/*` to
  `ai/narration/*`; components keep their folder. `REVALIDATE` paths, the overview hrefs
  (`lib/admin/overview.ts`), the sections config, `account-nav.ts` title prefixes and
  `lib/ai/narration-isolation.test.ts`'s file list are updated. **`lib/ai/narration-isolation.test.ts` must
  stay green** with the moved narration files (its path list is updated, not weakened).
- `app/(private)/jargon/debug/*` and `components/jargon/debug/*` links: the route folder moves to
  `app/(private)/admin/system/queue/`, guarded by `requireAdminPage()` on its page (it had no guard of its
  own, since it only shows the signed-in person's queue). Its layout drops `PageShell`/`PageHeader` for
  `AdminPageHeader`. `debugQueueHref` / `debugViewHref` build `/admin/system/queue` URLs. `lib/chrome.ts`
  and the phone title lookup follow (`/admin/system/queue` is already an admin path).
- Sidebar (`admin-sections.ts`): groups Manage (Collections, Invites), AI (AI features exact,
  Credits, Narration), System (Queue). New `exact` flag on a section for `/admin/ai` so it doesn't light up
  under `/admin/ai/credits`. The test file is updated.
- Old route folders are deleted (not left as redirect pages), so `pages-guarded.test.ts` keeps covering every page.

## Rollout / rollback

App only; bookmarks keep working through redirects. Rollback is a revert (the redirects go with it).
Server-action IDs are path-independent; an open old tab needs a reload.

## Tests

`admin-sections` (exact vs prefix, AI hub), `pages-guarded` (recursive, finds the new pages), overview hrefs
(tone/hrefs point at existing routes), hub row builder (pure: health, unknown, narration both-on rule) with
unit tests, `setAiFeatureEnabled` accepting `term_evaluation`, redirects test reading `next.config.ts`
(each source maps to a route that exists). `pnpm check`, `pnpm test`.

## Edge cases

- Query strings on the debug redirect (`?domain=&view=`).
- The debug page's per-person data: unchanged, still the signed-in admin's own queue.
- Phone: `isMorePath` already includes `/admin`; nothing to add.
- Narration switch shown both on the hub and on the narration page: same action, both revalidate, so both
  pages stay consistent.

## Review amendments (applied)

- **Term evaluation has no switch.** Nothing enforces `ai_feature_settings.enabled` for it (the evaluate route
  only checks the admin role), so a switch would do nothing. The hub shows it read-only ("Always on. It has no
  switch yet."), and the Overview no longer reports it as "switched off". Wiring the route to the setting is
  a behaviour change to a live route and is left out of this phase (recorded in the report).
- **Revalidation:** `setAiFeatureEnabled` moves to a new `app/(private)/admin/ai/actions.ts` and revalidates
  `/admin`, `/admin/ai` and `/admin/ai/credits`; the narration actions revalidate `/admin`, `/admin/ai` and
  `/admin/ai/narration`. No credits import reaches narration files (the isolation test stays green).
- **Redirects are temporary (307), not permanent,** because a cached 308 would outlive a revert; these are
  auth-only paths with no SEO value. They live in `lib/redirects.ts` (imported by `next.config.ts`) so a
  test can check that every destination has a `page.tsx` and that `/admin/ai-credits` does not match the
  new `/admin/ai/credits`. Rollback is a revert; browsers that followed a 307 do not cache it.
- **Debug page:** the moved `page.tsx` calls `await requireAdminPage()` literally (the guarded-pages test).
  Its server actions still use `requireAuthenticatedClient` and only return the caller's own data; stated in
  the PR rather than changed. Behaviour change: non-admins who opened `/jargon/debug` now get a 404. The
  content is now narrower (sidebar), so wide tables get an `overflow-x-auto` wrapper.
- **Hub model:** rows are built from `FEATURE_IDS` by a pure `buildAiHubRows(settingsRows, narration)`;
  one typed `Record<FeatureId, { label, manageHref }>` shared with `overview.ts` (replacing its parallel maps),
  so a new feature is a compile error. Settings come from one query. A failed read gives every row
  "Unknown". Narration is a tri-state: on (both on), off (both off) or **Mixed** (drifted; the switch turns
  both on). Price or cap cell: quiz and story show their credit cost, narration shows the term/story caps,
  term evaluation shows "—".
- **Moves, complete list:** every `@/app/(private)/jargon/debug/...` import (components/jargon/debug/* and
  the route itself), the four narration components, the two credits components, colocated tests,
  `lib/admin/overview.ts` hrefs, `admin-sections.ts`, `account-nav.ts` (specific prefixes before
  `/admin/ai`, dead `/jargon/debug` entry removed), `lib/chrome.ts` (`/jargon/debug` line removed, a test for
  `/admin/system/queue`), `lib/ai/narration-isolation.test.ts`, three docs; `loading.tsx` files move with
  their pages; afterwards `grep -rn "jargon/debug\|ai-credits\|admin/narration"` must be clean apart from
  the redirects, history notes and the credits feature/table names.
- **Sections:** an `exact` flag replaces the hard-coded `/admin` check (used for `/admin` and `/admin/ai`);
  the hub gets the `Sparkles` icon; the sections test is rewritten around real entries.
- `AiFeatureRow` / `admin-ai-features.tsx` are generalized into the hub (no stale credits-only version).
- Server-action ids change with file paths, so an open old tab needs a reload (the reason, corrected).
