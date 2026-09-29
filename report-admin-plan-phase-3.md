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
