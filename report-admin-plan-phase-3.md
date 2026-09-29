# Admin phase 3 plan: shared blocks, `useAdminAction`, page migration (branch `admin-phase-3-blocks`)

One PR, no migration. Covers the "shared blocks" of report-admin.md 4.2, the action convention for AI
credits (4.3), R12, R13, R14, the `setTimeout` fade hacks, the toggle and confirmation rules (section 7).
Search, filters and pagination are phase 8; the audit wiring is phase 9.

## New building blocks (`components/admin/`, `hooks/`, `lib/admin/`)

- `hooks/use-admin-action.ts`: `useAdminAction()` returns `{ run, isPending, error, clearError }`.
  `run(action, { onSuccess?, successMessage? })` runs the server action in a transition, sets `error` from
  `{ ok: false }`, and **catches a rejected call** (network drop, "Server Action not found" on a stale tab)
  as "Couldn't reach the server. Reload the page and try again." That closes the phase 1 gap. It toasts
  `successMessage` when given (`useToast`, the app's existing toast). Returns `true` on success.
- `components/admin/admin-switch.tsx`: a labelled DaisyUI toggle bound to an action:
  `AdminSwitch({ label, checked, onChange(value) => Promise<ActionResult>, disabled, description? })`.
  Optimistic, rolls back on failure, shows the inline error (`role="alert"`), toasts nothing on success (the
  toggle itself is the feedback). Replaces 5 hand-written toggle handlers.
- `components/admin/admin-page-header.tsx`: `<h1>` (always visible, also on phone), description, optional
  actions slot. `components/admin/admin-section.tsx`: heading + description + optional action, one heading
  style. `components/admin/admin-setting-row.tsx`: bordered row with label, description, control and status
  lines. `components/admin/admin-stat.tsx`: `AdminStat` (the Overview and credits summary tiles).
  `components/admin/admin-table.tsx`: `AdminTable({ head, empty, children })`: scroll wrapper, header, empty row.
- `components/admin/confirm-action.tsx`: wraps the existing `AlertDialog`: `ConfirmAction({ title,
description, confirmLabel, onConfirm, children })` where `children` renders the trigger given `open()`.
- `lib/admin/format.ts`: `formatAdminDate(iso)` fixed `YYYY-MM-DD` in UTC (same text on server and browser,
  as `formatDay` in the usage list already does) and `formatAdminDateTime`. Replaces the three
  `toLocaleDateString()` calls (R13) and `formatDay`.

## Page migration

- **AI credits actions:** the file's private `runAdminAction` is deleted; every action uses
  `lib/admin/action.ts` and returns `ActionResult`. Unknown feature and bad-number cases become
  `AdminError`. Tests updated (`ok`/`error` shape; `Admins only.` now comes through instead of the generic
  message). The prices-then-allowance two-write comment stays (atomic in phase 5).
- **Components:** all admin client components use `AdminPageHeader`, `AdminSection`, `AdminSetting`-style
  rows, `AdminSwitch`, `AdminTable`, `AdminStat`, `useAdminAction`. The Overview page uses `AdminStat` and
  `AdminPageHeader` too. The credits summary's local `Stat` goes away.
- **Fades:** the two `setTimeout(150)` row fades (Invites, Allowlist) are removed; rows update immediately.
- **R12:** the narration caps form validates as a form (blank story cap, non-integers, out of range shown
  inline before the call) and submits on Enter.
- **R14:** "unknown", not "off": `AiFeatureRow.available === false` renders an "Unknown" badge with the
  toggle disabled (already partly there); `usageCount` failures in `narration-settings.ts` return `null`
  and the caps form shows "unknown" for that count.
- **Confirmations (section 7, rule 2):** approve an invite (names the address that will be emailed),
  remove someone from the narration allowlist, cancel a running sync, turn a published collection off or
  stop it being built-in (says the public page goes offline), save credit settings (says it applies to
  everyone straight away). Reset usage keeps its existing confirm.
- Duplicate `AdminClient` type derivations in the actions collapse into one export from
  `lib/admin/action.ts` (`AdminContext["supabase"]`).

## Tests

- `hooks/use-admin-action` and `AdminSwitch`: run with a fake action: success, `ok:false` message,
  rejection turned into the reload message, rollback of the optimistic value. Uses the repo's existing
  component-test setup if there is one; if there is none (Vitest environment is node), the hook's logic is
  extracted to a pure `runAdminActionSafely(action)` helper in `lib/admin/` that is unit-tested and the
  hook is a thin wrapper.
- `lib/admin/format.test.ts`.
- Updated `ai-credits/actions.test.ts`.
- `pnpm check`, `pnpm test`.

## Rollout and rollback

App only. Revert the commit. Stale admin tabs need a reload (action return shape of the AI credits
actions changes).

## Edge cases

- A toast provider exists at the root layout (`ToastProvider`), so `useToast` is available on admin pages.
- Focus: closing a confirm returns focus to its trigger (React Aria `AlertDialog` does this).
- The grant dialog keeps its form; only its error handling moves to `useAdminAction`.
- 250-line file cap (oxlint): split big components by section.

## Review amendments (applied)

The reviewer suggested splitting into 3a/3b/3c. The rule for this work is one PR per phase, so it stays one
PR, trimmed:

- **Cut from this PR:** `AdminTable` (phase 8 builds it with search and pagination; the usage list keeps its
  cards + table layout), `formatAdminDateTime`, the `AdminClient` alias dedupe, the credit-settings save
  confirm on every save.
- **Hook design:** logic lives in a pure `settleAdminAction(action)` in `lib/admin/settle-action.ts` (no
  `next/cache` import, unit-tested in the node env): returns the `ActionResult`, turning a rejected call
  into `{ ok: false, error: "Couldn't reach the server. Reload the page and try again." }`.
  `hooks/use-admin-action.ts` is a thin wrapper: `run<T>(action, { onSuccess?(data: T), successMessage? })`
  creates its own promise inside the transition and resolves `true`/`false`; it does not call
  `router.refresh()` (actions revalidate). Success toasts only; failures stay inline (a conscious
  deviation from "toast every result", to keep errors next to what failed).
  The narration sync poller keeps its own try/catch outside the hook (it would toast every 2 s).
  Check `node_modules/next/dist/docs/` on async transitions before building.
- **`AdminSwitch` is controlled** (`checked`, `onChange`, optional `size`, `hideLabel`), reusing
  `components/ui/switch.tsx`. Owners keep the optimistic value (`useOptimistic` where the value is lifted,
  e.g. narration's enabled flag feeding the sync panel). Collections keeps its own coupled Built-in/Public
  handlers on top of the same switch. `AdminSettingRow` is the single name for the labelled row.
- **Confirmations narrowed:** approve invite (names the address; button stays disabled while pending),
  remove from allowlist, cancel a running sync, unpublish or un-build only while the collection is public,
  credit settings only when a price changes or the allowance is lowered (with the number of people). The
  confirm target is captured in state before opening (as the reset dialog does). Pending/error show in the
  owner, since `AlertDialogAction` closes first. Focus return is verified manually, not asserted.
- **R12:** `capsSchema` moves to `lib/narration/caps-schema.ts` (a `"use server"` file can't export it) and is
  shared by the form and the action; the form is `<form noValidate onSubmit>` with inline field errors and
  the `toNumber` blank-is-NaN pattern from the credits settings form.
- **R14:** `usageLast24h` becomes `number | null` end to end (`narration-settings.ts`, page, client, caps form);
  small test for `narration-settings`. The features list renders an "Unknown" badge instead of an "off"
  toggle when the row couldn't be read.
- **AI credits actions:** every action passes `{ revalidate: ["/admin/ai-credits"] }`; tests mock
  `AdminError` for the non-admin case, expect `{ ok: true, data: undefined }` / `{ ok: false, error }`; the
  two-write price save stays non-atomic until phase 5.
- **Dates:** `formatAdminDate(iso)` = `new Date(iso).toISOString().slice(0, 10)` with an invalid/missing
  input shown as "—"; UTC day, documented. `<AdminTime>` with a full timestamp in `title` is deferred.
- **Line caps:** split `admin-narration-sync.tsx` (toolbar and job panel into their own file) and extract
  the credit settings draft logic into a hook, before adding confirms.
- `AdminStat` takes `string | number | null` and stays a server-safe component (no `"use client"`).
- The "stale tab needs a reload" note is dropped: old clients reading `result.error` keep working.
- The always-visible `<h1>` on phones is a deliberate design change (the nav row is the only other chrome).
