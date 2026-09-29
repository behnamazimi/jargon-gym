# Admin phase 10 plan: consolidation, docs and the final summary (branch `admin-phase-10-docs`)

One PR, no behaviour change, no migration. Report 4.4/4.5 (folders), section 8 step 8 (tests), and the wrap-up.

## Consolidate the folders (pure moves, `git mv`, no logic edits)

- `lib/jargon/admin/*` (collection status, slug check, publish slugs, list-all-collections, narration settings,
  narration allowlist) move to `lib/admin/collections/` (the four collection files and their tests) and
  `lib/admin/narration/` (settings, allowlist list). The folder name says "admin", so the misleading location
  under `lib/jargon` goes away.
- `components/jargon/admin/*` (the AI hub, credits and narration components) move to
  `components/admin/ai/{credits,narration}/` plus `components/admin/ai/ai-hub.tsx`. Import paths are rewritten
  by script; `pnpm check` and the tests must pass unchanged (no test edits other than import paths).
- `lib/ai-credits/admin.ts` stays: it is the credits domain's own admin read model (used by health, tests and the
  credits page) and moving it would split the credits code for no gain. Stated in docs.
- Nothing under `app/` moves; routes and URLs are untouched.

## Docs

- New `docs/admin.md`, short and current: the route map; how guarding works (layout plus `requireAdminPage` on
  every page plus `requireAdminClient` in actions, why layouts alone are not enough); the action convention
  (`runAdminAction`, `AdminError`, `ActionResult`, `settleAdminAction`, `useAdminAction`, `useAdminToggle`);
  the shared blocks; the database functions and RLS notes (admins can't read other people's private
  collections through the table, hence `admin_list_collections`; publish bypasses RLS so actions check
  ownership); the audit log (what the database records, what the app records after the fact and best effort,
  how to add an action: add it to `APP_AUDIT_ACTIONS`); how to add an admin page or action, and the tests
  that police it (`pages-guarded`, narration isolation, labels vs migration). Known limits listed.
- `AGENTS.md` gets a short "Admin panel" section pointing at `docs/admin.md` (as the AI and TRACE sections do).
- Fix stale mentions in `docs/ai.md`/`docs/ai-credits.md` (admin paths were updated in phase 6; check the
  wording around "admin tabs and menus").

## Final summary

`report-admin.md`: a closing section (what changed by phase, what was left and why, deviations from the
report), status line for phase 9 and 10, and the working plans stay in the repo root like earlier phases'
(the AI redesign's plans were removed in a separate cleanup PR, #115; not repeated here unless asked).

## Tests

No new behaviour. A test asserts every `page.tsx` under `app/(private)/admin` still guards itself (exists) and
one asserts no file outside `lib/admin`, `components/admin` and `app/(private)/admin` imports from the
removed `lib/jargon/admin` / `components/jargon/admin` paths (a small grep test, so the old folders can't
quietly come back). `pnpm check`, `pnpm test`.

## Rollout / rollback

No behaviour change. A revert restores the old paths.

## Review amendments (applied)

- **Guarded-pages test already exists** (`app/(private)/admin/pages-guarded.test.ts`); not duplicated. The only new
  test is `lib/admin/no-legacy-paths.test.ts`: the two old folders must not exist, and no source file under
  `app`, `components`, `lib` or `hooks` may import the old paths (a regex over the tree, skipping
  `node_modules`, `.next`, `.git`, and itself; docs and report files are not scanned). Emptied folders are removed.
- **Complete file mapping.** lib: `collection-status`, `list-all-collections`, `publish-slugs`, `slug-check` and
  their tests go to `lib/admin/collections/`; `lib/admin/collections-params.ts` and `collections-query.ts` (and
  tests) join them as `params.ts` / `query.ts`, so collection code lives in one place;
  `narration-settings` (+ test) and `list-narration-allowlist` go to `lib/admin/narration/`. Tests move next to
  their subject so relative imports stay valid. components (files renamed to drop the redundant prefix; exported
  symbol names do not change):

  | From `components/jargon/admin/`                                                       | To `components/admin/ai/`                                                    |
  | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
  | `admin-ai-hub.tsx`                                                                    | `ai-hub.tsx`                                                                 |
  | `admin-ai-credits-{failures,grant-dialog,page,settings,summary,usage-list,usage}.tsx` | `credits/{failures,grant-dialog,page,settings,summary,usage-list,usage}.tsx` |
  | `admin-narration-{allowlist-manager,caps,page,sync-parts,sync}.tsx`                   | `narration/{allowlist-manager,caps,page,sync-parts,sync}.tsx`                |

  `pnpm fmt` runs after the rewrite; `git grep -nE "(lib|components)/jargon/admin"` must return only history
  notes (report and plan files).

- **Docs:** `docs/ai-credits.md:124` ("also in the admin tabs and menus") is stale and is reworded ("reached from
  AI in the admin sidebar"); one line there points to `docs/admin.md`. `docs/admin.md` names the isolation test
  by path (`lib/ai/narration-isolation.test.ts`) and the block list is checked against the real files (there is
  no `AdminTable`). AGENTS.md's Admin panel section names `lib/admin/`, `components/admin/`,
  `app/(private)/admin/`, `hooks/use-admin-*` and links the doc.
- **Final summary content:** what changed by phase (1 to 10), the migration list, accepted gaps and limits
  (1000-row list cap, `actor_email` snapshots, term evaluation has no switch, Queue debug actions use the
  signed-in guard, best-effort audit for direct writes, narration enabled flag reaches the sync panel after a
  refresh, deferred phase 7/8 items), deviations from the report (folders named `collections`/`narration`
  instead of `content`/`ai`; `lib/ai-credits/admin.ts` and the `...ForAdmin` names kept; no `AdminTable`;
  credits/narration/hub pages remain client page components (report 4.5 not done there); "Updated" column and
  owner search; 307 redirects), and a note that the phase plan files stay in the repo root. Phase 9 and 10
  status lines are added; the Phase 9 PR number is filled in after merge.
