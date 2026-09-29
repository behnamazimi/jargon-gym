# Admin phase 4 plan: expand migration (branch `admin-phase-4-rpcs`)

One PR, one migration, additive only. Nothing in the deployed app calls any of it until phase 5, so the
app and the migration can deploy in either order. Covers the database half of R4, R7, R11 and the audit
log table of section 6 in report-admin.md.

New migration: `supabase/migrations/20260930110000_admin_rpcs.sql` (later than the newest,
`20260930100000_ai_contract.sql`).

## Contents

All new functions are `security definer`, `set search_path = public`, check
`auth.uid() is not null and public.is_admin()` first, `revoke all ... from public, anon`, `grant execute
... to authenticated` (same pattern as `admin_grant_ai_credits`).

1. **`admin_audit_log`** table: `id bigint generated always as identity`, `created_at timestamptz default now()`,
   `actor_id uuid references public.users(id) on delete set null`, `actor_email text` (a snapshot, so the
   record survives an account delete), `action text not null`, `target_type text`, `target_id text`,
   `details jsonb not null default '{}'`. Index on `created_at desc`. RLS on; admin-only select policy; only
   `select` granted to `authenticated`; no insert/update/delete grant, so rows are written by functions only.
2. **`admin_write_audit(p_action, p_target_type, p_target_id, p_details)`**: the public writer used by the
   app for changes that are not RPCs (phase 9). Validates a non-empty action (max 100 chars) and that
   `p_details` is an object of at most 4 KB.
3. **`admin_domain_term_counts()`** returns `(domain_id uuid, term_count bigint)` grouped from `terms`
   (replaces reading every term row, R7).
4. **`admin_publish_collection(p_domain_id, p_domain_slug, p_term_slugs jsonb)`** returns the domain slug.
   One transaction: locks the domain row, requires it built-in, sets the domain slug only if it has none
   (using the slug the app generated), sets slugs on that domain's terms that have none from the
   `{ termId: slug }` map, sets `is_public = true`, writes an audit row. Slug generation stays in TypeScript
   (`generateUniqueSlug`), so there is one slug algorithm, not two. Unique-index violations
   (`domains_slug_idx`, `terms_domain_slug_idx`) surface as errors the app maps to a message.
   The map is validated: an object, at most 20 000 keys.
5. **`admin_set_narration_enabled(p_enabled)`**: updates both `narration_term` and `narration_story` rows
   in one statement, raises unless exactly two rows changed, audit row.
6. **`admin_set_narration_caps(p_term_cap, p_story_cap)`**: term cap null or 1..1000, story cap 1..1000, both
   rows updated together, raises unless two rows changed, audit row. Same ranges as `capsSchema`.
7. **`admin_set_ai_credit_settings(p_default_allowance, p_monthly_refill, p_quiz_cost, p_story_cost)`**:
   ranges as `creditSettingsSchema` (0..1 000 000, 0..1 000 000, 1..1000, 1..1000); updates
   `ai_credit_settings` (`id = true`) and the `quiz` and `story` feature rows in one transaction; raises unless
   all three rows were found; audit row with old and new values.
8. **`admin_grant_ai_credits` and `admin_reset_ai_credits`** are re-created (`create or replace`, same
   signatures, same grants) to also write an audit row inside the same transaction.

## Compatibility and rollout

- Additive: a new table and new functions; two existing functions replaced with the same signature and
  behaviour plus an insert into a new table. The old app keeps working before and after.
- Order: merge, wait for the "Deploy Supabase migrations" run to succeed. Phase 5 merges only after that.
- Rollback: `drop function` the new functions, restore the two old bodies (kept in the PR description),
  `drop table admin_audit_log`. Nothing depends on them yet.
- Never run `supabase db reset` locally; apply with `pnpm supabase migration up --local` and also with
  `psql -f` (autocommit), since CI runs `db reset` outside a transaction.

## Tests

`supabase/tests/admin_rpcs.sql` (rolls back, run by hand and stated in the PR), covering: a member and a
signed-out caller are refused by every function; the audit table is unreadable to a member and not
writable by any client; term counts; publish sets domain and term slugs and is_public in one go, refuses a
non-built-in domain, keeps existing slugs, rolls back completely on a duplicate slug (nothing partial);
narration enabled and caps update both rows and refuse bad ranges; credit settings update three rows and
refuse bad ranges; grant and reset still work and now leave audit rows; `admin_write_audit` validation.
Regenerate `lib/supabase/database.types.ts` (CI diffs it). `pnpm check` and `pnpm test` unaffected.
`lib/ai/narration-isolation.test.ts` stays green (no credits code touches narration).

## Edge cases

- `terms.slug` null vs empty: only null slugs are filled.
- Concurrent publishes of the same domain: the row lock serialises them; the second sees slugs set.
- `actor_email` when the admin's `users` row is missing: null, not an error.
- Audit `details` must not hold secrets: only setting values and ids, never keys or emails of other people
  beyond what the admin typed (grant note is allowed).

## Review amendments (applied)

- **Publish** validates everything it is given: the domain slug and every map value match
  `^[a-z0-9]+(-[a-z0-9]+)*$` and are at most 80 characters; keys must be uuids (a bad key raises a clean
  error); duplicate values in the map are refused; keys that are not terms of this domain are refused.
  Null **or empty** slugs count as missing (as today's TypeScript does). After applying the map it raises if
  any term of the domain still has no slug (a term added after the app read them), so a domain never goes
  public with unslugged terms; the app retries on that error and on `23505`. Publishing an already public
  domain is idempotent and still fills missing slugs. Friendly messages match today's ("Only built-in
  collections can be made public.", "Collection not found.").
- **`admin_domain_term_counts`** is plpgsql with every column qualified (`t.domain_id`) to avoid the
  output-variable name clash; domains with no terms are absent (the app defaults to 0). This also fixes counts
  that are silently truncated today by PostgREST `max_rows`.
- **Audit table grants are explicit:** `revoke all` on the table and its identity sequence from
  `public, anon, authenticated, service_role`, then `grant select to authenticated`; RLS policy
  `for select to authenticated using (public.is_admin())`. Append-only is enforced by grants (no client can
  write); the `on delete set null` foreign key is the only thing that updates rows, and is accepted.
- **One internal writer** `_admin_audit_insert(...)` (revoked from everyone, called by the other functions)
  owns the actor snapshot: `actor_id = auth.uid()`, `actor_email` looked up in `users` (null if missing).
  The public `admin_write_audit` only accepts actions starting with `app.` (so app-written rows cannot
  pose as RPC-written ones), validates length of action/target_type/target_id, and requires `p_details` to be
  a JSON object of at most 4096 bytes (`octet_length(p_details::text)`).
- **Setters** reject null arguments explicitly (a null passes `between` checks), use
  `get diagnostics ... row_count` and raise unless the expected rows changed; the credit settings function
  locks the rows in a fixed order before reading old values for the audit row. The 1 to 1000 caps bound
  lives in the function and Zod (the table only checks `> 0`).
- **grant/reset replacements** keep the same signature, first-line admin check and message, note handling and
  grants (restated), and write the audit row after the ledger insert, in the same transaction. Details hold
  the amount, note and target user id, never an email.
- **Rollback** is a pre-written SQL block kept in the migration's header comment (the old bodies included);
  rolling back means a new timestamped migration, since history is append-only. Dropping `admin_audit_log`
  loses any history recorded after deploy.
- **Tests** add: calls as a member, as signed out and as anon (via `set local role` and JWT claims) plus
  `has_function_privilege` / `has_table_privilege` checks; audit rows unreadable to a member; publish cases
  (stale map with a new unslugged term, bad slug, duplicate value, foreign key, already public, empty-string
  slug, term created by another user, SQLSTATE `23505` on a slug collision with everything rolled back);
  null and boundary arguments (0, 1, 1000, 1001); `updated_at` fires; the existing `ai_credits.sql` test still
  passes. A concurrency script (two publishes of one domain; two domains racing for one slug) follows the
  `*_concurrency.sh` convention.
