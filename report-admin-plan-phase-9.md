# Admin phase 9 plan: audit log writes, page and Overview feed (branch `admin-phase-9-audit`)

One PR, app only, no migration (the table, the writer functions and the RLS from phase 4 are deployed).
Report section 6. Optional while there is one admin (decision in section 10), but it makes "who changed
this?" answerable.

## What is already logged (phase 4, inside the database transaction)

`grant_ai_credits`, `reset_ai_credits`, `set_ai_credit_settings`, `set_narration_enabled`,
`set_narration_caps`, `publish_collection`.

## What this phase adds: rows for the direct writes, through `admin_write_audit`

`lib/admin/audit.ts` `writeAudit(supabase, { action, targetType, targetId, details })` calls the
`admin_write_audit` function (actions start with `app.`). It is **best effort and after the write**: the
write and the audit row are two calls, so a failure to log is `console.error`ed and never fails or undoes the
admin's action (stated in the docs and the PR). Details hold ids and setting values only, never emails of
other people beyond what the admin typed, never keys.

| Action                                 | Row                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `setCollectionStatus`                  | `app.collection_status` target domain, `{ from, to, slug }`                |
| `updateDomainSlug`                     | `app.collection_slug` target domain, `{ old, new }`                        |
| `setAiCreditsEnabled`                  | `app.ai_credits_enabled` `{ enabled }`                                     |
| `setAiFeatureEnabled`                  | `app.ai_feature_enabled` target feature, `{ enabled }`                     |
| add/remove narration access            | `app.narration_access` target user, `{ on }`                               |
| approve (single and bulk each), resend | `app.waitlist_approve` target request `{ emailSent }`, `app.invite_resend` |
| narration sync start/cancel/resume     | `app.narration_sync_start` (target domain), `_cancel`, `_resume`           |

`runAdminAction` gains no new option; each action calls `writeAudit` after its write inside `work`. Narration
files must not mention credits (isolation test): the narration actions log `app.narration_*` only.

## Audit page `/admin/system/audit`

- Server page (`requireAdminPage`), reads `admin_audit_log` with the admin's session (RLS select is admin-only):
  count first, clamp, `.range()`, order `created_at desc, id desc`, 25 a page; filter by action (`?action=`,
  only known actions accepted) and page. Params in `lib/admin/audit-params.ts` (pure, tested).
- Rows: when (`formatAdminDateTime` with time and UTC label, so the audit trail is exact), who
  (`actor_email`, or "deleted account" when null), what (`lib/admin/audit-labels.ts`: a label per known action
  and a pure `describeAudit(action, details)` sentence, unknown actions shown as their raw name), target.
- Sidebar: System gets "Audit log"; title lookup and `chrome` already cover `/admin/*`.

## Overview feed

"Recent activity": the last 8 entries (label and sentence, time ago as a fixed UTC date/time), each linking to
the audit page; a failed read shows "Couldn't load" like the other sources, never fails the page.

## Rollout / rollback

App only. Rows are additive; rollback is a revert (the table keeps its rows).

## Tests

`writeAudit` (calls the function with the right arguments, swallows and logs failures), each action logs the
expected row after its write and still succeeds when logging fails (mocked), no audit row on refused calls,
audit params, labels and `describeAudit` for every known action (a test fails if an action is logged without a
label), the audit list query (count first, clamp, filter, order), overview feed builder.

## Edge cases

- Details bounded by the function to 4 KB; the app only sends small objects.
- Bulk approval writes one row per approved request (at most 10).
- `actor_email` null (account deleted): shown as such.
- Timezone: shown in UTC, labelled.

## Review amendments (applied)

One PR stays; trimmed and made mechanical:

- **Labels can't drift:** one `as const` map in `lib/admin/audit-labels.ts` for the app-written actions
  (`app.collection_status`, `app.collection_slug`, `app.ai_credits_enabled`, `app.ai_feature_enabled`,
  `app.narration_access`, `app.waitlist_approve`, `app.invite_resend`, `app.narration_sync_start|cancel|resume`),
  each with `{ label, describe }`; `writeAudit`'s `action` is typed as a key of it, so an unlabelled action is a
  compile error. A second const holds the six database-written names, and a node test reads the phase 4
  migration and checks that set equals what the SQL logs (`_admin_audit_insert('…'`). The page's action filter
  accepts both sets. `describeAudit(action, details)` narrows the `Json` with small guards, never trusts shape,
  truncates long values, and falls back to the raw action name.
- **`writeAudit` is fully guarded and uses the admin's session client** (never `createAdminClient()`): it wraps
  the call in try/catch (a mock or client without `rpc` can't break an action), treats a resolved `{ error }` as
  a failure, logs it, and returns a boolean. Pass `undefined`, not `null`, for absent optional arguments.
- **Where the rows go, exactly:** after the successful claim in `approveOne` (so single and bulk are covered,
  `emailSent: false` is still logged, raced or failed approvals are not); `resendInvite` after the send
  succeeds; `setCollectionStatus` after the steps, **also when a later step failed after an earlier one was
  saved** (with the state reached), and not at all when nothing ran; the app row is skipped when a publish step
  ran (the database already logged `publish_collection`); `updateDomainSlug` skips a no-op change;
  allowlist add/remove log only when the state actually changed (add reads membership first; remove reports
  what it deleted); `cancelNarrationSyncJob` logs only when this call cancelled an active job (it returns the
  last job otherwise); resume after its `canResume` check; sync start includes the job id;
  `setAiFeatureEnabled` after the row-count check. Narration actions keep action names inline and import no
  label module (isolation test; the only trap is the strings `ai-credits` / `ai_credit_ledger`).
- **Targets stay ids.** No target emails are copied into details (the log is append-only and `actor_email` is
  already a deliberate snapshot). The page resolves target emails for display at render time from `users`
  (admin-readable), one query for the page's ids.
- **`formatAdminDateTime` is new** (`YYYY-MM-DD HH:mm UTC`, "—" for missing/invalid) with tests; `account-nav`
  gets `["/admin/system/audit", "Audit log"]` before `["/admin", "Admin"]`; the sidebar's System group gets the
  entry; the new page and a `loading.tsx` follow the guarded-pages rule.
- **Overview feed** is not part of `OverviewInput`: `AdminOverview` gains `recent: … | null` read as a sixth
  `allSettled` source with its own "Couldn't load" state; the existing overview fixtures need no change and a
  test asserts `recent === null` when every read fails.
- **Existing tests updated:** the rpc mocks in the people, collections, ai, credits and narration action
  tests branch on the function name (audit calls are recorded separately in `auditCalls`, never consuming
  queued publish results or shifting call-order assertions); the ai actions mock gains an `rpc`; a shared
  `fakeAuditClient` helper is not needed once the mocks branch. New tests assert each action's audit row and
  that a failing audit call never fails the action.
- **Audit query in `lib/admin/audit-query.ts`** (count first with the same filter, clamp, range, two-key order,
  `.eq("action")` only when filtered), with `auditHref` and params reusing `first`, `cleanSearch`, `clampPage`.
