# Admin phase 1 plan: bug fixes (branch `admin-phase-1-fixes`)

One PR, no migration. Fixes report-admin.md findings R1, R2, R3, R5, R8, R15 and lays the action
convention the later phases build on.

## Scope

### A. `ActionResult` convention (R1)

New `lib/admin/admin-error.ts`: `class AdminError extends Error` (a message safe to show).

New `lib/admin/action.ts`:

```ts
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
export async function runAdminAction<T>(
  work: (ctx: { supabase; user }) => Promise<T>,
  options?: { revalidate?: string[] },
): Promise<ActionResult<T>>;
```

- Calls `requireAdminClient()` inside the try. A non-admin gets `{ ok: false, error: "Admins only." }`.
- `AdminError` (and the admin guard's error) becomes `{ ok: false, error: message }`. Anything else
  is logged with `console.error` and becomes `"Something went wrong. Try again."`. Supabase errors
  (`PostgrestError`, not `Error` instances) fall in this bucket, so raw database text never reaches the UI.
- Revalidates `options.revalidate` paths only when `work` succeeds.
- `requireAdminClient` throws `AdminError("Admins only.")` (subclass of `Error`, so nothing else breaks).
  Update its doc comment.

Convert to `runAdminAction` and `ActionResult`:

- `collections/actions.ts`: `setBuiltin`, `setPublic`, `updateDomainSlug`.
- `invites/actions.ts`: `approveWaitlistRequest`, new `resendInvite`.
- `narration/actions.ts`: `setNarrationEnabled`, `setNarrationCaps` (already returns `{error}`; fold it in),
  `addToNarrationAllowlist`, `removeFromNarrationAllowlist`, `startNarrationSync`,
  `cancelNarrationSyncJob`, `resumeNarrationSync`, `getNarrationSyncStatus`, `getNarrationSyncCoverage`.

Not converted here: `ai-credits/actions.ts` (already safe; converted in phase 3 when its components
move to `useAdminAction`).

Client callers updated to read `result.ok` / `result.error`: `admin-collections-page.tsx`,
`admin-invites-page.tsx`, `admin-narration-page.tsx`, `admin-narration-caps.tsx`,
`admin-narration-allowlist-manager.tsx`, `admin-narration-sync.tsx`.
Domain messages that must survive production become `AdminError`s: "Only built-in collections can be
made public.", "No account found for that email.", "Request already handled.", "Nothing to resume.",
"Couldn't change the switch.", "Couldn't save the caps.", "Enter whole numbers ...".
Errors thrown by `lib/narration/sync` (`enqueueNarrationSync`, cancel) are not necessarily user-safe:
check each throw site; wrap known messages, let unknown ones be generic.

### B. Exact email lookup (R2)

Use `exactEmailPattern` (from `lib/ai-credits/email-lookup.ts`) in `addToNarrationAllowlist` and in the
invite existing-account check. Move the helper to `lib/admin/email-lookup.ts`; `lib/ai-credits` re-exports
nothing (update the one importer and its test path). Test: `a_b@x.test` is passed as `a\_b@x.test`.

### C. Approve without double emails (R3)

New order in `approveWaitlistRequest`:

1. Read the request; not `pending` -> `AdminError("Request already handled.")`.
2. `create_referral_code` RPC.
3. Compare-and-set: `update waitlist_requests set status='invited', referral_code_id, invited_by,
invited_at where id = ? and status = 'pending' returning id`. Zero rows -> another click won:
   `AdminError("Request already handled.")` and no email.
4. `sendInviteEmail`. On failure: revert the row to pending (`status='pending', referral_code_id=null,
invited_at=null, invited_by=null` in one update, satisfying `waitlist_requests_invited_pair`), then
   `AdminError("Couldn't send the email. The request is still pending.")`. If the revert itself fails, log
   and return `AdminError("The email failed and the request may show as invited. Use Resend.")`.
   The unused referral code stays; it is harmless.
5. Revalidate `/admin/invites`.

`resendInvite(requestId)`: row must be `invited` and its code unused (`referral_codes.used_by is null`);
loads `referral_codes(code)`, rebuilds the URL the same way (existing account -> `/complete-signup`, else
`/signup?...`), sends, no state change. Shared `buildSignupUrl` helper inside the invites folder so
approve and resend can't drift. UI: a "Resend" button on `invited` rows, with pending and "Sent" feedback.
Rows with status `signed_up` show nothing.

Rollback: revert the commit; no data shape changed.

### D. `setBuiltin` revalidation (R5)

Read the domain's slug before updating. When `value` is false and the domain was public, also revalidate
`/j/<slug>` (layout) and `/sitemap.xml`. Always revalidate `/admin/collections`.

### E. No mutation during render (R8)

Remove `kickNarrationSyncWorker()` from `narration/page.tsx`. A resumable job already shows the
Resume button (`canResumeNarrationSync` in `AdminNarrationSync`), and `resumeNarrationSync` kicks the
worker. Keep the `jobNeedsCron` note.

### F. Error boundary (R15)

Add `app/(private)/admin/error.tsx` (client, "Something went wrong" + `reset` button, DaisyUI `alert`,
logs nothing extra) and `not-found.tsx` is not needed (`notFound()` already falls to the app's 404).

## Tests

- New `lib/admin/action.test.ts`: success returns data and revalidates; `AdminError` message passes
  through; a plain `Error` and a PostgREST-shaped object both give the generic message and are logged; a
  non-admin gets "Admins only." and `work` never runs; failure does not revalidate.
- Update `narration/actions.test.ts` (throws -> `ok:false`) and the `ilike` mock to assert the escaped
  pattern.
- New `invites/actions.test.ts`: approves happy path (order: code, CAS, email); already-handled row;
  CAS loses race -> no email; email failure reverts to pending; revert failure message; resend
  (not invited, code used, happy path, existing-account URL).
- New `collections/actions.test.ts`: setBuiltin false on a public domain revalidates the public path and
  sitemap; setPublic on a non-built-in returns the error; updateDomainSlug returns the slug.
- `lib/narration/narration-isolation` test must stay green (nothing here touches credits).

## Edge cases checked

- Two admin tabs clicking Approve (CAS).
- Email provider down (revert) and `RESEND_API_KEY` missing (same path).
- An existing user already signed up with the waitlist email (unchanged URL rules).
- Client components still showing the last optimistic state after `ok:false` (each keeps its rollback).
- Production message masking: none of the converted actions throws to the client any more except for
  truly unexpected framework errors, which `error.tsx` catches on page renders.

## Out of scope (later phases)

Layout/nav (2), shared components and `useAdminAction` (3), atomic RPCs (4/5), slug save-on-blur (8),
date formatting (3), unknown vs off states (3/6).

## Check

`pnpm check`, `pnpm test`. Manual: none needed beyond unit tests (no visual change except the Resend
button); run the dev server smoke for `/admin/invites` if the local DB is up.

## Review amendments (applied)

- Approve no longer reverts on email failure (the failure can happen after delivery, and a revert
  allows a second code and a second email). The row stays `invited`, the action returns
  `{ emailSent: false }`, and the UI says "Approved, but the email failed. Use Resend."
- Codes minted for a request that lost the CAS race (or whose claim failed) are set `is_active = false`.
- `resendInvite` also requires an active code and handles a missing code; the existing-account lookup
  uses `.limit(1)`.
- `revalidatePath` is called inside the work function where a layout type or a runtime slug is needed;
  `runAdminAction`'s `revalidate` list is for plain paths.
- `setBuiltin` uses one query (`update ... select slug`) and revalidates `/j/<slug>` and the sitemap
  when un-building.
- Throw sites in `lib/narration/sync.ts` with user-safe text became `AdminError`.
- `error.tsx` prefers `unstable_retry`, no effect logging.
- Removing the render-time worker kick means a stalled job stays stalled until Resume is clicked or cron
  runs. The Resume button and cron note already exist; called out in the PR. A stale admin tab with the
  old bundle needs a hard reload after deploy.
- The ai-credits private `runAdminAction` is removed in phase 3.
- The isolation test is `lib/ai/narration-isolation.test.ts`.
