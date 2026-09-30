# Admin panel

The admin area is for the app's owner: who can get in, what content is public, which AI features are on,
and what they cost. It lives under `/admin`, with the code in `app/(private)/admin/`, `lib/admin/`,
`components/admin/` and `hooks/use-admin-*`.

## Pages

| Address               | What it is                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/admin`              | Overview: what needs attention (missing keys, refunds, switches off, waitlist, stalled sync) and recent activity |
| `/admin/people`       | Waitlist (approve one or up to ten at a time, resend) and the members list                                       |
| `/admin/people/[id]`  | One person: waitlist request, narration, AI setup and credits, admin history, suspend, remove key, delete        |
| `/admin/collections`  | Built-in and all collections: status, public address                                                             |
| `/admin/ai`           | Every AI feature: switch, vendor, what is sent, price or limit                                                   |
| `/admin/ai/credits`   | Credits switch, allowance and prices, health, usage, grants                                                      |
| `/admin/ai/narration` | Narration access, limits, audio sync                                                                             |
| `/admin/system/audit` | What admins changed, and when                                                                                    |

Old addresses (`/admin/invites`, `/admin/ai-credits`, `/admin/narration`) redirect with
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

## Managing one person

`supabase/migrations/20260930120000_admin_user_management.sql` adds `admin_person_detail`,
`admin_set_user_suspended`, `admin_remove_user_api_key` and `admin_delete_user`. Each write checks, changes and
audits in one transaction, so nothing is half done. They share `_admin_manage_target`: the caller must be an
admin, the target must exist, must not be the caller, and must be a `member` (admins are changed in the
database). It also locks the person's row, so two admins can't act on one person at once. A reason of 1 to 200
characters is required. Errors the admin should read use the database code `AD001`; `throwRpcError`
(`lib/admin/rpc-error.ts`) turns those into `AdminError`s and rethrows everything else.

- **Suspend** sets `users.suspended_at`, bans the auth record for 100 years and deletes the person's sessions.
  The ban alone doesn't stop a token that is still valid; ending the session does. Doing it again changes
  nothing and leaves no second audit row. The page warns when the flag and the ban disagree (a hand edit);
  suspending again repairs it. Reactivating clears both.
- **Where a suspended person is stopped:** sign-in, refresh and the Google callback (GoTrue's `user_banned`,
  shown as "This account has been suspended."); `getSessionUser` and the proxy (`isBanned` on the verified user);
  widget tokens (`resolveUserFromToken`); Telegram commands (`resolveUserIdByChatId`), scheduled sends
  (`list_due_telegram_users`) and linking (`complete_telegram_link`). A new way in that doesn't go through a
  session must check `users.suspended_at` too.
- **Remove API key** clears provider, key and last four together. They fall back to the app's key and credits.
- **Delete** removes the auth user; everything else cascades. It is refused while other people have something
  hanging off the person's collections (added, studying, story preferences, review state or events), because
  deleting the collections would delete that for them. The collections and their terms are locked first, so no
  one can start using them between the check and the delete. The typed email is compared in the database. The
  audit row keeps the id and the reason, not the email, so the audit page shows a deleted person by id.
  The migration also made `domains.owner_id` cascade and let `referral_codes` keep `used_at` after its user is gone;
  both used to make every delete fail. Their waitlist row stays.
- SQL checks: `supabase/tests/admin_user_management.sql` and `admin_delete_concurrency.sh`, run by hand.

## The audit log

The database records its own function calls. Changes the app makes directly are recorded by `writeAudit`
(`lib/admin/audit.ts`) **after** the change and **best effort**: if the entry can't be written, that is logged
and the change stands. To record a new action, add it to `APP_AUDIT_ACTIONS` in `lib/admin/audit-labels.ts`
(a label and a sentence); the type of `writeAudit` only accepts those. `lib/admin/audit-labels.test.ts` checks
the database's own action names against every migration. Details hold ids and setting values, never other
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
- The people and collections tables have no phone card layout.
- Suspension is enforced by the app and by GoTrue, not by row level security. A call made straight to the
  database with a token that outlived the session can still touch that person's own rows until it expires.
  It can't spend AI credits, which are charged server side.
- Roles are changed in the database; admins can't be suspended or deleted from the page.
- `lib/ai-credits/admin.ts` stays with the credits code it reads.
