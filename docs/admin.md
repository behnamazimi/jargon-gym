# Admin panel

The admin area is for the app's owner: who can get in, what content is public, which AI features are on,
and what they cost. It lives under `/admin`, with the code in `app/(private)/admin/`, `lib/admin/`,
`components/admin/` and `hooks/use-admin-*`.

## Pages

| Address               | What it is                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/admin`              | Overview: what needs attention (missing keys, refunds, switches off, waitlist, stalled sync) and recent activity |
| `/admin/people`       | Waitlist (approve one or up to ten at a time, resend) and members (AI credits, narration access)                 |
| `/admin/collections`  | Built-in and all collections: status, public address                                                             |
| `/admin/ai`           | Every AI feature: switch, vendor, what is sent, price or limit                                                   |
| `/admin/ai/credits`   | Credits switch, allowance and prices, health, usage, grants                                                      |
| `/admin/ai/narration` | Narration access, limits, audio sync                                                                             |
| `/admin/system/queue` | The signed-in person's own queue and calibration (debug)                                                         |
| `/admin/system/audit` | What admins changed, and when                                                                                    |

Old addresses (`/admin/invites`, `/admin/ai-credits`, `/admin/narration`, `/jargon/debug`) redirect with
temporary (307) redirects from `lib/redirects.ts`.

## Who can get in

- `app/(private)/admin/layout.tsx` and **every page** call `requireAdminPage()`
  (`lib/admin/page-guard.ts`). Layouts don't run again on client navigation, so a layout check alone is not
  enough. `app/(private)/admin/pages-guarded.test.ts` fails if a page under `/admin` doesn't call it.
- **Server actions** run through `runAdminAction` (`lib/admin/action.ts`), which checks the role with
  `requireAdminClient()` first.
- The database repeats the check: every admin function the admin migration adds starts with `auth.uid()` and `is_admin()`.

## How an action works

- `runAdminAction(work, { revalidate })` returns an `ActionResult`. Expected failures throw `AdminError`, whose
  message is shown. Any other error is logged and shown as a generic message, because Next hides the message of
  a thrown server action in production.
- In the browser, `useAdminAction` (pending, inline error, optional success toast) and `useAdminToggle`
  (a switch that follows the server value) call actions through `settleAdminAction`, which turns a rejected call
  (network, a stale tab) into a result too.
- An action that changes what a page shows must revalidate that page. A switch snaps back if it doesn't.
- Blocks in `components/admin/`: `admin-page-header`, `admin-section`, `admin-setting-row`, `admin-stat`,
  `admin-switch`, `confirm-dialog`, `admin-tabs`, `admin-pagination`, `admin-search-bar`, and the sidebar
  config `admin-sections.ts`. Lists take their state from the address (`?q=&page=&view=`), parsed by
  `lib/admin/list-params.ts` and its siblings, so they are shareable and server-rendered.

## What the database does

`supabase/migrations/20260930110000_admin_rpcs.sql` adds the audit log and the functions that must be atomic:
`admin_list_collections`, `admin_publish_collection`, `admin_set_narration_enabled`, `admin_set_narration_caps`,
`admin_set_ai_credit_settings`, `admin_write_audit`, and audit rows inside `admin_grant_ai_credits` and
`admin_reset_ai_credits`.

- An admin's own session can't read other people's **private** collections through the table (row level
  security). `admin_list_collections` reads through a function. The publish function bypasses row level
  security, so **every collection action checks ownership itself** (`findActable`).
- Slugs are made in TypeScript (`lib/admin/collections/publish-slugs.ts`); the function checks and applies them.
- SQL checks: `supabase/tests/admin_rpcs.sql` and `admin_publish_concurrency.sh`, run by hand against a local
  database (don't use `supabase db reset` for this).

## The audit log

The database records its own function calls. Changes the app makes directly are recorded by `writeAudit`
(`lib/admin/audit.ts`) **after** the change and **best effort**: if the entry can't be written, that is logged
and the change stands. To record a new action, add it to `APP_AUDIT_ACTIONS` in `lib/admin/audit-labels.ts`
(a label and a sentence); the type of `writeAudit` only accepts those. `lib/admin/audit-labels.test.ts` checks
the database's own action names against the migration. Details hold ids and setting values, never other
people's emails; the page looks emails up when it shows them.

## Adding to it

1. A page: put it under `app/(private)/admin/`, call `await requireAdminPage()`, add it to
   `components/admin/admin-sections.ts`, add a `loading.tsx`, and add a title to `components/app/account-nav.ts`.
2. An action: wrap it in `runAdminAction`, throw `AdminError` for what the admin should read, revalidate what
   changes, and call `writeAudit` for a direct write.
3. Something that must be all-or-nothing, or must bypass row level security: a database function in a new
   migration (expand, release, contract; the app deploys before migrations run).

## Tests that police it

`pages-guarded.test.ts`, `lib/admin/audit-labels.test.ts`, `lib/admin/no-legacy-paths.test.ts`, and
`lib/ai/narration-isolation.test.ts` (narration never touches credits or the ledger; keep the words it forbids
out of the narration actions).

## Known limits

- The collection list is capped at 1000 by PostgREST; the page says so when it is reached.
- The audit log's `actor_email` is a snapshot, so it outlives an account.
- Term evaluation has no switch: nothing reads its setting.
- Queue debug's server actions use the normal signed-in guard and only return the caller's own queue.
- The people and collections tables have no phone card layout.
- `lib/ai-credits/admin.ts` stays with the credits code it reads.
