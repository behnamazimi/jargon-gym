# Admin panel

The admin area is for the app's owner: who can get in, what content is public, which AI features are on,
and what they cost. It lives under `/admin`, with the code in `app/(private)/admin/`, `lib/admin/`,
`components/admin/` and `hooks/use-admin-*`.

## Pages

| Address                   | What it is                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/admin`                  | Overview: what needs attention (missing keys, refunds, switches off, waitlist, stalled sync) and recent activity          |
| `/admin/people`           | Waitlist (approve one or up to ten at a time, resend), shared codes, and the members list                                 |
| `/admin/people/[id]`      | One person: waitlist request, narration, AI setup and credits, admin history, suspend, remove key, delete                 |
| `/admin/collections`      | Built-in and all collections, read-only: status, address, narration mode; the Reported view lists reported ones           |
| `/admin/collections/[id]` | One collection: status, kind, address, sharing and reports, narration mode, audio sync and per-term clips                 |
| `/admin/requests`         | Collection requests: queue, switches and estimates; `/admin/requests/[id]` accepts, asks, merges, declines, delivers      |
| `/admin/issues`           | Problems and ideas people sent; `/admin/issues/[id]` shows one with its screenshot, marks it done or won't do, deletes it |
| `/admin/ai`               | Every AI feature: switch, vendor, what is sent, price or limit                                                            |
| `/admin/ai/credits`       | Credits switch, allowance and prices, health, usage, grants                                                               |
| `/admin/ai/narration`     | Narration switch, providers, limits, access; links to the running sync                                                    |
| `/admin/system/audit`     | What admins changed, and when                                                                                             |

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
`admin_list_collections`, `admin_publish_collection`, `admin_set_narration_enabled`, `admin_set_narration_provider` (added in `20260930140000_narration_providers.sql`), `admin_set_narration_caps`,
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
  shown as "This account has been suspended."); the proxy, which checks the session token locally (`getClaims`), so it stops them when
  the token next refreshes, up to about an hour later (`getSessionUser` checks `isBanned` itself only when the
  proxy's headers are absent);
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

## Shared codes

`/admin/people?view=codes` makes and pauses codes that several people can use, for sharing on a platform
or a campaign page. Every reference code has `max_uses` seats (a single-use waitlist code has one); a shared
code also has a label and an end date, and stops at whichever limit comes first. Each seat is a row in
`referral_redemptions`, and a used seat stays used when the account is deleted.

- The database does it all (`20261005110000_shared_referral_codes.sql`): `_consume_referral_code` locks the code
  and takes the seat, `admin_create_shared_referral_code`, `admin_set_referral_code_active` and
  `admin_list_shared_referral_codes` audit and check the admin themselves. The actions are in
  `app/(private)/admin/people/codes-actions.ts`.
- The functions raise readable errors with the code `AD001`, shown through `throwRpcError`.
  `referral_redemptions` has row level security on and no client access; only these functions read and write it.
- Shared codes may be short (4 to 32 letters and numbers). Single-use codes keep the 12-character minimum.
- An email signup with a shared code takes its seat when the email is confirmed, not at signup, so a made-up
  address can't use one up. Until then the account is unverified and holds the code in
  `users.pending_referral_code`. If the code filled up meanwhile, the person lands on `/complete-signup`.
  `users.referral_code_ran_out` remembers it, so that page says the code ran out instead of just asking for one.
- Pausing stops new seats at once. The signup page shows no seat count or deadline.
- Narration mode is per collection (`collection_narration_settings`, admin-only, no row means `term`), set on
  `/admin/collections/[id]` through `setNarrationMode` and recorded as `app.narration_mode_set`. See Narration in
  [ai.md](ai.md).
- A shared code made with "Turn narration on" (`referral_codes.grants_narration`, set only when the code is
  created) gives everyone who takes a seat the `narration_term` and `narration_story` allowlist rows, inside
  `_consume_referral_code`. It only adds rows: the narration switch, access mode and caps still apply, and
  pausing or expiring the code never takes access away (remove it on the person's page). Each new grant writes
  a `narration_granted_by_code` audit row with no actor (`_system_audit_insert`, shown as "System"); someone
  already on the allowlist gets no row.
- SQL checks: `supabase/tests/shared_referral_codes.sql` and `shared_referral_codes_concurrency.sh`, run by hand.

## Collection requests

`/admin/requests` is the request desk (see [import.md](import.md#requests)). Simple
changes (accept, ask, decline, merge, set a new date) are compare-and-set updates from
`app/(private)/admin/requests/actions.ts` plus `writeAudit`, like the waitlist. Delivery
writes into another person's account, so it is a database function
(`admin_deliver_request`, `admin_deliver_existing_collection` in
`20261002110000_collection_requests.sql`) that audits in the same transaction. Audit details
hold ids and counts, never the topic, the terms or emails. SQL checks:
`supabase/tests/collection_requests.sql` and `collection_requests_concurrency.sh`.

## Issue reports

Members send a problem or an idea from "Report an issue" in the account menu (desktop) or the
More sheet (phone). The modal is `components/issues/report-issue-dialog.tsx`; the copy, limits and
image shrinking live in `lib/issues/`. It saves through `submitIssueReport`
(`app/(private)/app/issues/actions.ts`), which calls `submit_issue_report`. That function checks
the input and allows 10 reports per person per 24 hours. The page path, browser and window size
are attached without being shown. Nothing is ever sent back to the member.

A screenshot is shrunk in the browser to WebP, at most 2000 px on its longest side and 2 MB, so it
fits a server action (`serverActions.bodySizeLimit` is 3 MB). The server uploads it to the private
`issue-screenshots` bucket at `<user id>/<issue id>.webp` through the S3 endpoint
(`lib/issues/storage.ts`), and removes it again when saving the row fails. Admins see it through
`/api/admin/issues/[id]/screenshot`, which checks for an admin and streams the file.

Statuses are new, done and won't do. Changing one or deleting an issue goes through
`runAdminAction` and writes `app.issue_done`, `app.issue_wont_do`, `app.issue_reopened` or
`app.issue_deleted`. Deleting an issue removes its screenshot first; if that fails, the row stays and the admin sees an error, so no file is left without its row. Deleting an account removes the
rows through the cascade, and both delete actions remove the person's screenshot folder. New issues
show on the Overview.

## Shared collections: loves, reports and takedowns

Members can love and report collections other members share (migration
`20261007100000_collection_loves_and_moderation.sql`; shared copy in `lib/collections/moderation.ts`).
Nothing is automatic: reports only show up for an admin, who decides.

- **Tables.** `collection_loves` (one row per member and collection; members read only their own) keeps
  `domains.love_count` in step through a trigger, so Browse can sort and page in the database. Nobody, admins
  included, can see who loved. `collection_reports` holds a reason, an optional note of up to 500 characters
  and a status (`open`, `dismissed`, `actioned`); one open report per member and collection. Members read their
  own; admins read all. Neither table takes direct writes.
- **Member functions.** `my_set_collection_love` (shared, not blocked, not your own) and `my_report_collection`
  (also not built-in; 10 per 24 hours). They raise snake_case codes the app maps to copy.
- **A takedown is unshare plus a lock.** `admin_stop_sharing_collection` sets `share_blocked_at` and
  `share_block_reason`, flips visibility to private (the existing unshare trigger removes it from other
  libraries, silently) and marks the open reports `actioned`. The owner sees only the reason category; the
  admin's 1 to 200 character note goes to the audit log only. `admin_lift_share_lock` lets the owner share
  again and restores nothing. `admin_dismiss_collection_reports` closes reports without acting. All three
  audit as `stop_sharing_collection`, `lift_share_lock` and `dismiss_collection_reports`.
- **Why a trigger guards the columns.** Owners have a table-wide UPDATE grant and an owner UPDATE policy, so a
  policy can't protect single columns. `domains_guard_protected` refuses a non-admin change to the lock columns
  or `love_count` (only the love counter trigger may write it, recognised by `pg_trigger_depth() > 1`) and
  refuses sharing while the lock is set (`share_blocked`, shown to the owner as the moderation sentence).
- **Where it shows.** Browse cards (love, report, Most loved sort), the Library header and actions menu, and
  `/admin/collections` (Loves column, status badges, Stop sharing, Lift lock and Reports dialogs; code in
  `components/admin/collections/moderation-*.tsx` and `moderation-actions.ts`). The overview counts collections
  with open reports. No user-facing string may name the admin; `lib/collections/moderation.test.ts` checks it.
- SQL checks: `supabase/tests/collection_moderation.sql`, run by hand against a local database.

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
