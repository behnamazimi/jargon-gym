# Goal prompt for the next agent (paste after `/goal`)

```
Finish the AI redesign in report.md: Phase 5, the F14-A cutover and cleanup. Phases 0 to 4 are done and merged (see the Status list in report.md). Read handoff.md first, then report.md and report-plan-phase-4.md (its review amendments are the current design for the audio job model). report.md is the source of truth: build only decided items (F14-A and the D1 cost contract). Skip F6/F7 and every undecided finding; ask me about anything else, including the open decisions listed in handoff.md. Follow AGENTS.md and run `pnpm check` before calling anything done.

Before starting, confirm from git and gh that PR #109 (19871ab) and #108 (4357a98) are merged and that the "Deploy Supabase migrations" run for 4357a98 (the audio_jobs migration) succeeded. Both were true when this prompt was written; re-check.

Phase 5 is three PRs, in this order (details in handoff.md):
5a Migration, additive: claim_audio_job with supersede-then-insert semantics, hash-keyed never-overwritten storage paths, regenerate path, orphan-sweep support, M6.
5b App cutover: lib/ai/speech getOrCreateAudio, speech provider adapter, one shared audio route for terms and stories, sync worker on audio_jobs, E1/E2/E6, wire hash v2, retire the old secret from the narration route only after the admin page shows the cron job uses the AI secret, stop reading the old narration tables.
5c Contract (destructive): drop the old narration tables, columns, triggers and functions; move charging and setup screens to ai_feature_settings costs, then drop the old cost columns (its own expand, release, contract); docs/ai.md, AGENTS.md link, docs updates, leftover lib/narration cleanup, tests from report section 5.3.

Per PR:
1 Write report-plan-phase-5<x>.md: scope, files, migration order, rollback, tests, edge cases by ID (report sections 5 and 6).
2 One fresh read-only subagent reviews the plan for sanity, correctness, rollout safety, missed edge cases. Apply valid findings. One review only.
3 Implement on branch ai-phase-5<x>-<slug> from up-to-date main, with tests. Run pnpm check.
4 Open a PR to main: changes, rollout, rollback, tests.
5 One fresh subagent reviews the PR. Fix valid findings. No second review.
6 Enable the CI monitor with the PR tools (set_monitor), no polling loops. Merge only when every check is green (use gh pr merge --squash --delete-branch). After 2 failed fixes of one failure, stop and report. Never bypass checks, force-push main or enable auto-merge.
7 Add a Status line to report.md, report in under 10 lines, start the next PR.

Rules:
- Migrations must stay compatible with the deployed code (expand, release, contract). The app deploys before migrations (they run after CI on main), so an app PR that needs a migration merges only after that migration's "Deploy Supabase migrations" run has succeeded.
- Never touch production Supabase. Never run supabase db reset locally (it wipes my dev data); use `pnpm supabase migration up --local`. Also apply every migration file with psql -f (autocommit) before pushing, because CI runs db reset outside a transaction. Run every SQL test in supabase/tests by hand and say so in the PR. Regenerate lib/supabase/database.types.ts (CI diffs it).
- Narration never uses credits or the ledger (lib/ai/narration-isolation.test.ts must stay green).
- The supabase-migrations CI job sometimes fails with "Error status 502" after all migrations applied: that is a flake. Re-run only the failed job once; if it fails twice on one PR, stop and ask me.
- Ask my approval before merging 5c (destructive) and before removing the old cost columns; show the exact statements and the row counts you expect. Stop and ask if a decision is missing or a reviewer finds a blocking design problem. When blocked on me, use AskUserQuestion.
- Commit and PR attribution lines come from the system reminder.
When 5c is merged, write a final short summary in report.md (what changed, what was left) and stop.
```

## Notes for whoever pastes it

- The prompt assumes handoff.md and goal-prompt-phase-5.md are in the repo (they ship in a docs-only PR right after phase 4; if that PR is not merged yet they are on branch `ai-handoff-phase-5`).
- It intentionally repeats the deploy-order rule, the autocommit apply, the CI flake and the approval gates, since each one caused a real problem in phases 1 to 4.
