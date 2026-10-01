# Import flow, phase 2: Request a collection

Planning only: no code has been changed. Written 2026-10-01. On approval, copy this file to the repo root as `plan-import-phase-2.md` (task 0).

## Context

People who only have a topic can't start a collection today. Phase 2 adds **Request a collection**: a short form with a quota, a request card in the Library, status emails, and an admin desk where the admin builds the collection **by hand** and delivers it as a **private, requester-owned** collection. The UI never names the admin and never implies automation. There is no AI anywhere in this path.

Phases 0 (#144) and 1 (#145) shipped. Phase 2 ships on its own as **three releases**: 2a an invisible refactor of the import RPC, 2b requests (dark behind a switch, then enabled), 2c "Request definitions for these words".

### Verified against the code (2026-10-01, `main` at `71bd564`)

| Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Effect on the plan                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The research report and notes are not in the repo** (`reports/` and `research_notes/` don't exist).                                                                                                                                                                                                                                                                                                                                                                 | Planned from the brief and the shipped code only.                                                                                                                                                                                                    |
| **`node_modules` is not installed**, so `node_modules/next/dist/docs/` could not be read.                                                                                                                                                                                                                                                                                                                                                                             | Task 1 installs and reads the Next 16 guides (server actions, `after`, revalidation) before any code. Patterns used here are ones already in the repo (`after()` in `app/(public)/request-access/actions.ts`, `revalidatePath` in `runAdminAction`). |
| `createOrGetOwnedDomain`, named by the brief, **no longer exists**. Phase 0/1 replaced it: `my_import_terms` now creates the domain itself (`20261001130000_import_batches.sql`).                                                                                                                                                                                                                                                                                     | Delivery reuses that RPC's logic through a refactor (see below), not the old helper.                                                                                                                                                                 |
| **`my_import_terms` is bound to `auth.uid()`** (security definer, no user parameter). Called by an admin it would create the collection under the admin.                                                                                                                                                                                                                                                                                                              | 2a extracts its body into `_import_terms_for(p_user, …)`; `my_import_terms` becomes a thin wrapper. Same behaviour, proven by the existing SQL tests.                                                                                                |
| `domains_owner_name_idx (owner_id, lower(name))` is unique, and the RPC raises `collection_name_taken`.                                                                                                                                                                                                                                                                                                                                                               | Delivery needs "Name (2)" (plan 8.6). New parameter `p_name_collision` (`'fail'` default, `'suffix'` for delivery).                                                                                                                                  |
| **No "Library list" page.** `/jargon` is a sidebar + one collection view (`app/(private)/jargon/(collection)/page.tsx`, `jargon-page.tsx`). Mobile reaches collections through a drawer. There is no "+ New" header button (the sidebar has "+ Add collection").                                                                                                                                                                                                      | The request card goes at the top of the **main column**, and into `EmptyCollection` for users with no collection. Not in the sidebar.                                                                                                                |
| The paste flow is **hard-wired to the user's own account**: `useImportFlow` imports `commitImport` and `checkImportAgainstDestination` directly, `CheckStep` always renders `DestinationBlock`, `draft-store.ts` has one storage key, and `commitImport` redirects to `/jargon`.                                                                                                                                                                                      | The admin Fulfil screen needs a small **adapter** (task 14). Parser, `check-state`, cards and chips are already pure and are reused as they are.                                                                                                     |
| `ImportChooser` has no Request row; `SearchResults` shows "Nothing shared matches…" for zero results; Browse's `SharedDomainsNoMatches` doesn't receive the search text.                                                                                                                                                                                                                                                                                              | Add the row to both; pass the search text down in Browse.                                                                                                                                                                                            |
| Admin infrastructure matches the brief: `requireAdminPage`, `runAdminAction`, `writeAudit` (`app.` actions only), `throwRpcError` + SQLSTATE `AD001`, `admin-sections.ts`, `account-nav.ts` title prefixes (a new `/admin/requests` entry must come **before** `["/admin","Admin"]`), `pages-guarded.test.ts` (literal `await requireAdminPage()` in every page), `audit-labels.test.ts` (every `_admin_audit_insert('x'` in SQL needs a `DB_AUDIT_ACTIONS.x` label). | Followed as is.                                                                                                                                                                                                                                      |
| Admin RLS: `users` select is `id = auth.uid() or is_admin()`, so an admin session can read requester emails. An admin **cannot** read a requester's private `domains`/`terms`.                                                                                                                                                                                                                                                                                        | Emails go out through the admin client; anything touching requester collections is a security-definer RPC.                                                                                                                                           |
| Waitlist precedent (`app/(private)/admin/people/actions.ts`): compare-and-set update **before** the email, email failure is logged and doesn't undo, `emailSent` goes into the audit details, a "Resend" action exists. `notifyAdmins` + `after()` emails admins on a new waitlist request.                                                                                                                                                                           | Same shape for status emails and the "new request" admin email.                                                                                                                                                                                      |
| `lib/email/resend.ts` has a private `sendEmail`, hard-coded `FROM`, inline HTML templates and **no HTML escaping**.                                                                                                                                                                                                                                                                                                                                                   | New templates escape all user text (topic is free text). New builders live in `lib/requests/email-copy.ts` (pure, testable); `resend.ts` gets one exported sender.                                                                                   |
| Singleton settings precedent: `ai_credit_settings` (`id boolean primary key default true`, select for authenticated, admin update, `writeAudit` on change). No cron exists for requests.                                                                                                                                                                                                                                                                              | `collection_request_settings` follows it.                                                                                                                                                                                                            |
| **No privacy page and no FAQ page exist.** The only public content pages are `before-you-sign-up` and `how-terms-work`.                                                                                                                                                                                                                                                                                                                                               | The privacy line and FAQ answer go into `before-you-sign-up-page.tsx` (sections "Private by default" and "Getting terms in"). No new page. See question 6.                                                                                           |
| No analytics infrastructure; sliced activation does not exist (re-checked).                                                                                                                                                                                                                                                                                                                                                                                           | Metrics come from request timestamps. Delivery marks the collection active, as import does.                                                                                                                                                          |
| `ImportedBanner` "Start reading" links to `/jargon/read?domain=<id>`.                                                                                                                                                                                                                                                                                                                                                                                                 | Reused by the Ready card.                                                                                                                                                                                                                            |
| `import_batches.entry` is free text; the user commit schema enum is `chooser                                                                                                                                                                                                                                                                                                                                                                                          | collection                                                                                                                                                                                                                                           | capture`. | Delivery writes `entry = 'request'` from inside the RPC; the user schema is untouched. |

Read: plan sections 1, 4.5, 6, 8.6, 9; `docs/admin.md`; `docs/import.md`; `docs/trace.md` (the tier tables: a delivered, active collection is just another active collection; its terms are never-tested and rank first in Review and Quiz, same as any import, so no TRACE change).

---

## 1. Goal and scope

**Goal:** a person with only a topic gets a collection in their Library without any tooling, and the admin can fulfil it in one sitting.

**In**

1. `collection_requests` table, singleton `collection_request_settings`, RLS, and the RPCs in section 4.
2. Request form with quota shown first, Browse matches while typing, confirmation, and a request card in the Library (statuses, reply to a question, cancel, dismiss).
3. Entry points: the chooser's last row, Browse's no-results state.
4. `/admin/requests` queue and `/admin/requests/[id]` desk: Accept, Ask, Merge, Decline, Set new date, Fulfil (paste → Check → Deliver) and Resend email, plus the on/off and slow-down switches.
5. Emails (Resend): Ready, Needs input, a delay, a decline, plus an email to admins on a new request.
6. `_import_terms_for` refactor so delivery reuses the exact import code path.
7. Privacy line, FAQ answer, decline templates, audit labels, Overview "needs attention" item, docs.
8. **Release 2c:** "Request definitions for these words" from the Check screen (language collections only, counts against the quota).

**Out (deferred)**

- Push, badges, the "Notification on this phone" row and the iOS Home Screen hint (phase 3; the confirmation screen shows email only).
- Multi-turn messages (one question and one reply per round; the admin can ask again).
- Automatic delay emails (decided: admin button) and expiring a request nobody replies to.
- Metrics UI. Deflection and admin minutes need analytics that doesn't exist. Time to first touch and time to Ready come from timestamps; "opened within 7 days" is a SQL query in `docs/import.md`.
- An admin way to withdraw a delivered collection (question 4).
- A public wishlist, voting, any AI step (plan section 11).

## 2. User stories (phone first)

1. _I searched for "Kubernetes for product managers" and found nothing close._ The last row says Request "…". I tap it, see I can have one open request, and fill in three fields.
2. _I want to be sure I'm not wasting a request._ While I type the topic I see close Browse matches with Add. I add one and skip the request.
3. _I sent it._ I'm told it'll be ready usually within 2 days, and that I'll get an email.
4. _I check my Library later._ A card at the top says "In the queue · usually ready by Fri 3 Oct", then "Being prepared" once work starts.
5. _They have a question._ The card shows it with a reply box. After I reply, it goes back to the queue.
6. _It's ready._ The card says "48 terms added to your Library" with Start reading. I also got an email.
7. _I changed my mind._ I cancel from the card and can send a new request.
8. _My topic was too broad._ I'm told why in plain words and offered Paste a list or Browse.
9. _My team's internal acronyms._ I'm told they can't know them and to paste the list instead.
10. _I'm out of requests._ The form doesn't open; it says when I can ask again.
11. _It's running late._ I get one email with a new date. I never see "soon".

## 3. Screens

Artifact: https://claude.ai/artifact/KDHErTpsHzPQvWjPe2YAsE. Differences from the artifact, all by owner decision or the brief's copy rules: no ladder or progress dots on the card (the never-use list bans progress bars), no push row, no "generator command" or "Publish a copy to Browse" in the Fulfil panel.

| Screen                   | Route / component                                                                                         | Artifact source                    | States                                                                                                                                                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chooser: request row** | `import-chooser.tsx`, `chooser-search-results.tsx`                                                        | "Request a topic · Step 1"         | _Idle:_ no row. _Typing:_ row `Request "…"` last, quota line under the search. _Open request:_ row replaced by a link to it. _Cap reached:_ row replaced by "ask again on {date}". _Closed:_ row hidden.                                                               |
| **Browse: no results**   | `shared-domains-no-matches` (search text passed down)                                                     | same                               | Row below the existing message, same four variants.                                                                                                                                                                                                                    |
| **Request form**         | `/jargon/import/request?topic=` (`request-form.tsx`)                                                      | "Request a topic · Step 2"         | _Quota shown first._ _Blocked:_ open request or cap reached or closed, with no form. _Ready:_ form, details collapsed. _Sending:_ button "Sending…", fields disabled. _Error:_ alert above the button, input kept. _Repeat topic:_ notice with link. _Paused:_ banner. |
| **Request sent**         | same route, success state (`request-sent.tsx`)                                                            | "Step 3 · Expectations"            | Email switch, Done, Browse while you wait. Push row omitted.                                                                                                                                                                                                           |
| **Request card**         | top of the main column of `/jargon` and in `EmptyCollection` (`requests-section.tsx`, `request-card.tsx`) | "Step 4 · Waiting"                 | requested, in_progress (+ delayed line), needs_input (reply box), ready (prepared or added from Browse), declined (reason + alternatives). Cancelled never shows. Dismiss on ready and declined.                                                                       |
| **Admin queue**          | `/admin/requests`                                                                                         | "The admin's request desk" (left)  | Tabs Open / Needs input / Done, search, pagination; empty "Nothing waiting."; overdue badge; "Reply received" badge. Settings block on top.                                                                                                                            |
| **Admin desk**           | `/admin/requests/[id]`                                                                                    | "The admin's request desk" (right) | Request details, similar Browse collections, similar open requests, Accept/Ask/Merge/Decline/Set new date, Fulfil panel (enabled only when in progress), Resend email.                                                                                                 |
| **Fulfil**               | panel on the desk (`fulfil-panel.tsx` around `ImportFlow` with an adapter)                                | "Fulfil" panel                     | Paste → Check → **Deliver N terms** (confirm dialog). Blocked while any card lacks a definition. Success: "Delivered", links to the desk.                                                                                                                              |

## 4. Data model and migrations

Three migrations, one per release. Names sort after `20261001130000`.

### 4.1 `20261002100000_import_terms_for_user.sql` (release 2a, invisible)

1. `create function public._import_terms_for(p_user uuid, p_import_id uuid, p_destination jsonb, p_terms jsonb, p_relationships jsonb, p_policy text, p_entry text, p_source text, p_format text, p_name_collision text default 'fail')`: the current body of `my_import_terms` with `v_user := p_user`. Revoked from every role (like `_admin_manage_target`).
2. When `p_name_collision = 'suffix'` and the new-collection insert hits `unique_violation`, retry as `Name (2)`, `Name (3)` … up to 20, then raise `collection_name_taken`. The returned JSON gains `domain_name` as before, so the caller sees the final name.
3. `create or replace function public.my_import_terms(...)` with the **same signature**: raises `Not authenticated` when `auth.uid()` is null, then `return public._import_terms_for(auth.uid(), …)`. Grants unchanged.

**Backfill:** none. **Rollback:** a new migration that restores the old body (the old file is the source). The wrapper is behaviour-identical, so reverting the PR is also safe. Gate: `supabase/tests/import_terms.sql` and `import_terms_concurrency.sh` pass unchanged.

### 4.2 `20261002110000_collection_requests.sql` (release 2b)

```
collection_request_settings(            -- singleton, id boolean pk default true
  enabled boolean not null default false,
  paused boolean not null default false,
  estimate_days integer not null default 2 check (estimate_days between 1 and 30),
  paused_estimate_days integer not null default 7 check (paused_estimate_days between 1 and 60),
  updated_at timestamptz not null default now())

collection_requests(
  id uuid pk default gen_random_uuid(),
  user_id uuid not null references users on delete cascade,
  topic text not null check (char_length(btrim(topic)) between 3 and 120),
  kind text not null check (kind in ('jargon','vocabulary')),   -- 2c adds 'definitions'
  language text not null check (language in ('en','nl')),
  level text check (level in ('new','basics','brushing_up','a1_a2','b1_plus')),
  size integer check (size in (20,50,100)),
  known_terms text check (char_length(known_terms) <= 5000),
  status text not null default 'requested'
    check (status in ('requested','in_progress','needs_input','ready','declined','cancelled','merged')),
  notify_email boolean not null default true,
  due_at timestamptz not null,
  accepted_at timestamptz, ready_at timestamptz,
  needs_input_since timestamptz, question text, user_reply text, replied_at timestamptz,
  decline_reason text check (decline_reason in ('too_broad','too_niche','not_jargon_or_vocabulary','language_not_supported','team_internal')),
  decline_note text check (char_length(decline_note) <= 300),
  merged_into uuid references collection_requests (id) on delete set null,
  delivery_kind text check (delivery_kind in ('prepared','added_shared')),
  delivered_domain_id uuid references domains (id) on delete set null,
  delivered_terms integer,
  delay_notified_at timestamptz,
  email_failed boolean not null default false,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now())
```

Indexes: `collection_requests_one_open_idx` **unique** `(user_id) where status in ('requested','in_progress','needs_input','merged')` (the one-open quota, enforced by the database); `(status, due_at)` for the queue; `(user_id, created_at desc)`; `(merged_into) where merged_into is not null`. `set_updated_at` trigger (exists).

**Helper `_promote_merged_children(p_id)`** and a `before delete` trigger: when a primary request is cancelled or deleted (account deletion cascades), the oldest merged child becomes the new primary (`merged_into = null`, status `in_progress` if the old primary was accepted, else `requested`, `due_at` kept), and the other children point at it. No orphans.

**User RPCs** (security definer, `search_path = public`, `auth.uid()` required, `revoke … from public, anon; grant … to authenticated`):

- `my_create_collection_request(p_topic, p_kind, p_language, p_level, p_size, p_known_terms, p_notify_email)` → the new row as jsonb. Locks the caller's `users` row, checks settings `enabled` (`requests_closed`), no open request (`request_open_exists`), fewer than 3 counted in the last 30 days (`request_quota_reached`), sets `due_at = now() + (paused ? paused_estimate_days : estimate_days) days`.
- **Counted toward the 3:** every request created in the last 30 days **except** declined ones and ones cancelled before they were accepted (question 2).
- `my_collection_request_quota()` → `{enabled, paused, estimate_days, open_request_id, used, limit: 3, next_available_at}`.
- `my_list_collection_requests()` → the caller's non-cancelled, non-dismissed rows with `display_status` and `display_due_at`. For `merged` rows these come from the primary (requested or needs_input → `requested`; in_progress → `in_progress`), and **nothing else of the primary leaks**.
- `my_cancel_collection_request(id)`: allowed from requested, in_progress, needs_input, merged; locks the row; calls `_promote_merged_children`; error `request_not_cancellable` once ready or declined.
- `my_reply_collection_request(id, text)`: only from `needs_input`; `due_at += now() - needs_input_since`; status back to `in_progress` if `accepted_at` is set, else `requested`; `replied_at = now()`; reply 1–1000 characters.
- `my_dismiss_collection_request(id)` (ready or declined only) and `my_set_request_notify(id, bool)`.

**Admin RPCs** (security definer, start with `auth.uid()` and `is_admin()`, errors for the admin use `using errcode = 'AD001'`, audit inside the transaction through `_admin_audit_insert`):

- `admin_deliver_request(p_request_id, p_name, p_terms jsonb, p_relationships jsonb, p_format text)`:
  1. Locks the request; it must be `in_progress` (`AD001` "They cancelled this request." / "Accept it first."). Refuses a suspended requester.
  2. For the requester **and every `merged` child** (locked): `_import_terms_for(user, {name, language: request.language}, …, 'skip', 'request', 'paste', p_format, 'suffix')`. Each person gets their own private copy, owned by them, marked active.
  3. Sets each request `ready`, `delivery_kind = 'prepared'`, `delivered_domain_id`, `delivered_terms`, `ready_at`.
  4. Audit `deliver_collection_request` with ids and counts only (never the topic, known terms or emails).
  5. Returns `[{request_id, user_id, domain_id, domain_name, created}]`. Rejects any term without a definition (`AD001`).
- `admin_deliver_existing_collection(p_request_id, p_domain_id)`: the domain must be `shared`; inserts `user_collection_domains` and `user_active_domains` for the requester (same effect as the one-tap Add, which RLS would block for another user); status `ready`, `delivery_kind = 'added_shared'`; audit `deliver_existing_collection`. Used by Merge → "a collection in Browse" and by the "Already in Browse" decline template.

**Direct admin writes (waitlist precedent):** the simple transitions are compare-and-set updates from TypeScript plus `writeAudit`, so the table grants `update (status, accepted_at, needs_input_since, question, replied_at, decline_reason, decline_note, due_at, delay_notified_at, merged_into, email_failed, updated_at)` to `authenticated`, behind the policy `is_admin()`. The settings table follows `ai_credit_settings`: `grant select to authenticated`, admin update policy, `writeAudit` on change.

### RLS summary

`collection_requests`: RLS on; select `user_id = auth.uid() or is_admin()`; **no** insert/delete policy and no user update policy (users act only through the RPCs); admin update limited to the columns above. `collection_request_settings`: select for authenticated (the form reads the pause flag); admin update. CI's "every public table has RLS" check applies to both. SQL tests (section 9) prove a user can't read, insert, update or delete another user's row, nor change their own status or due date.

**Backfill:** none (new tables; settings row inserted with `enabled = false`). **Rollback (2b):** forward-only for data. Set `enabled = false` to stop new requests; revert the PR to remove the UI. The tables stay inert. Do **not** drop them after anyone has a request, and never SQL-delete a delivered collection or its terms (cascade caution, section 11).

### 4.3 `20261002120000_request_definitions.sql` (release 2c)

`alter` the `kind` check to add `'definitions'`; add `target_domain_id uuid references domains on delete set null`, `delivery_kind` gains `'filled'`. `admin_request_unfinished_terms(p_request_id)` returns the names of the requester's unfinished terms (the admin can't read private terms). `admin_fill_definitions(p_request_id, p_terms jsonb)`: for each pasted term matching an **unfinished** term of `target_domain_id` by `lower(btrim(term))`, set the definition (and example, category, notes only where they're empty), in place by id so nothing is lost; everything else is skipped and counted; status `ready`, `delivery_kind = 'filled'`, audit `fill_request_definitions`. `my_create_collection_request` gains an optional `p_target_domain_id` and `p_known_terms` prefilled with the words; it requires `owns_domain`, `language` equal to the collection's, a collection that has at least one unfinished term, and the same quota.

## 5. Server side

All user actions use `requireAuthenticatedClient`; admin actions use `runAdminAction` (every one revalidates `/admin/requests`, `/admin/requests/[id]` and `/admin`).

**User** (`app/(private)/jargon/import/request/actions.ts`, `app/(private)/jargon/actions-requests.ts`)

- `getRequestSetup()` → `{ quota, recent: {topic, status, id}[] , email }` for the form (calls `my_collection_request_quota` and `my_list_collection_requests`).
- `createRequest(input)`: zod `requestFormSchema` (topic 3–120, kind, language, optional level valid for the kind, size, known terms ≤ 50 lines of ≤ 100 characters, deduplicated). Calls the RPC; maps `requests_closed`, `request_open_exists`, `request_quota_reached` to plain failures; `revalidatePath("/jargon")`; returns `{ ok: true, id, estimateDays } | { ok: false, failure }`. Schedules the admin email with `after()` (try/catch, logged, as `request-access` does).
- `cancelRequest(id)`, `replyToRequest(id, text)`, `dismissRequest(id)`, `setRequestNotify(id, on)`: thin RPC wrappers returning `{ ok: true } | { ok: false, failure }`.
- `listMyRequests()` in `lib/requests/repository.ts`, called from `/jargon`'s server page (the card needs the user's timezone; it reads `user_settings.timezone`, falls back to UTC).

**Admin** (`app/(private)/admin/requests/actions.ts`)

- `acceptRequest(id)`: CAS `requested → in_progress`, sets `accepted_at`; clears `replied_at`. Error "Request already handled." on a lost race.
- `askRequest(id, question)`: CAS from requested or in_progress to `needs_input`; question 1–500 characters; `needs_input_since = now()`, clears the old reply; sends the Needs-input email.
- `declineRequest(id, reason, note?)`: CAS to `declined` for the request **and its merged children**; sends one email each. Reason `already_in_browse` isn't a decline: the dialog swaps to a collection picker and calls `admin_deliver_existing_collection`.
- `mergeRequest(id, target)`: target is another open request (same kind and language, `requested` or `in_progress`, not itself; the source's own children re-point to the target) → source becomes `merged`; or a Browse collection → `admin_deliver_existing_collection`. Sends the Ready email in the second case.
- `setNewDate(id, date)`: CAS where `delay_notified_at is null`; sets `due_at` and `delay_notified_at`, sends the single delay email. A second attempt: "A delay notice was already sent."
- `deliverRequest(input)`: zod from the commit schema's term and link schemas (export `commitTermSchema`/`linkSchema`), calls `admin_deliver_request`, then emails each delivery (best effort), sets `email_failed`, returns `{ delivered, emailFailed }`.
- `resendRequestEmail(id)`: sends the email for the current status (ready, needs_input, declined or delay); `AdminError` "Couldn't send the email. Try again." on failure.
- `saveRequestSettings({ enabled, paused, estimateDays, pausedEstimateDays })` + `writeAudit`.
- Queries in `lib/admin/requests/` (`list-params.ts` like the people one: tab, `q`, page; `queries.ts`; `similar.ts`): the queue, one request, similar shared collections (`domains` shared + `ilike` on the topic with the escape helper), similar open requests (same language, topic contains or contained).

**Email** (`lib/requests/email-copy.ts` pure builders returning `{ subject, text, html }` for ready, needs_input, delay, declined and the admin notice; `lib/email/resend.ts` gains `sendRequestEmail`). All interpolated text is HTML-escaped. Links use `getAppOrigin()`.

**Shared with import (reused, not copied):** `searchSharedDomains` and `SearchResults` for the form's close matches; `ImportFlow`/`useImportFlow`/`CheckStep` and the parser for Fulfil; `createAdminClient` for the admin email, as `notifyAdmins` does.

## 6. UI components

DaisyUI via `components/ui/*` (`Alert`, `Button`, `Dialog`, `AlertDialog`, `Collapsible`, `Field`, `Input`, `Textarea`, `ToggleGroup`, `Switch`, `Badge`, `LanguageToggle`). Mobile first, inputs ≥ 16px, primary button in the page flow (no fixed bar while a field has focus), focus moves to each step heading, `role="status"` on messages. **No direct `useEffect`**: server components load data; client state uses `useState`/`useTransition`; timers in refs.

- **`hooks/use-browse-search.ts`** (extracted from `import-chooser.tsx`, event-handler debounce with a request id) used by the chooser and the form's "Close matches". The chooser keeps its behaviour.
- **`components/requests/request-form.tsx`**, `request-sent.tsx`, `request-quota-note.tsx`.
- **`components/requests/requests-section.tsx`** and `request-card.tsx`: render the user's cards; reply box, cancel `AlertDialog`, dismiss. Dates formatted on the server with the user's timezone (`lib/requests/dates.ts`) to avoid hydration drift.
- **Chooser/Browse:** a `RequestRow` (same row style as the three routes) with the four variants.
- **Admin:** `components/admin/requests/` (`requests-table.tsx`, `request-detail.tsx`, `ask-dialog.tsx`, `decline-dialog.tsx`, `merge-dialog.tsx`, `new-date-dialog.tsx`, `fulfil-panel.tsx`, `requests-settings.tsx`), using `AdminPageHeader`, `AdminTabs`, `AdminSearchBar`, `AdminPagination`, `AdminSettingRow`/`AdminSwitch`, `ConfirmDialog`, `useAdminAction`. Add the section to `admin-sections.ts` ("Manage", icon `Inbox`), a title to `account-nav.ts`, `loading.tsx` for both pages, and an Overview attention item (`overview.ts`, `overview-sources.ts`: "N collection requests are waiting", warning tone when any is overdue).
- **Import adapter (task 14):**
  - `useImportFlow` takes an optional `adapter: { draftStore, destination: { name, language }, commit(payload), commitLabel(summary), requireAllDefinitions }`. With an adapter: destination is fixed to a new collection, no `checkImportAgainstDestination`, no `writeLanguagePref`, `canAdd` also needs zero cards without a definition, and `commit` calls the adapter instead of `commitImport`.
  - `CheckStep` shows a `FixedDestinationNote` ("New collection for the requester · {name} · {language}") instead of `DestinationBlock`.
  - `draft-store.ts` becomes `createDraftStore(key)`; the existing exports delegate to the default store, so current callers and `draft-store.test.ts` stay as they are. The admin draft key is `jargon-gym:import-draft:v1:request:<id>`, cleared after delivery.
- **Library placement:** `jargon-page.tsx` main column above `ImportedBanner`; `empty-collection.tsx` above its buttons. Data comes from the server page, so switching collections doesn't refetch it.

## 7. Copy

Checked against plan section 6: nothing says "Generating", "AI", "automatically", "instantly", shows a percentage, progress bar or countdown, says "no one sees…" or "100% private", or shows "Being prepared" before work starts. Nothing user-facing says "admin". A test enforces it (section 9). Strings marked † depend on the email device check.

**Chooser and Browse.** Row: `Request "{query}"` / "We'll prepare it and add it to your Library." Under the search while typing: "You can have 1 request open at a time." Open request: `You have a request open: "{topic}". See it in your Library.` Cap: "You've used your 3 requests for now. You can ask again on {date}." Closed: row hidden. No-match line becomes: `Nothing shared matches "{query}". Request it, try a list, or start an empty collection.`

**Form.** Title "Request a collection". Quota: "You can have 1 request open at a time. You've used {u} of 3 in the last 30 days." Labels: "Topic" (placeholder "e.g. Kubernetes for product managers"), "What kind?" (A field's jargon · Language vocabulary), "Language" (English · Dutch), "Add details (optional)", "Level" (New to it · Know the basics · Brushing up; for vocabulary A1–A2 · B1 and up), "Size" (About 20 · About 50 · About 100), "Terms you've come across" with "One per line. We'll include them if they fit." Helper: "Please leave out confidential company details and personal information." Button "Send request" / "Sending…"; under it "Usually ready within {n} days". Close matches label "Close matches". Repeat topic: `You asked for "{topic}" on {date}. It's {status}.` + "Open it" when ready. Existing collection name: `You already have a collection called "{name}".` Paused banner: "Requests are taking longer than usual right now. New requests are usually ready within {n} days." Closed: "Requests are closed for now." Errors: "Add a topic of at least 3 letters." · "Keep the topic under 120 characters." · "We couldn't send your request. Try again." · `You already have a request open: "{topic}".` · "You've used your 3 requests for now. You can ask again on {date}."

**Sent.** "Request sent" · `We'll prepare "{topic}" and add it to your Library, usually within {n} days.` · "How should we tell you?" · "Email" / "To your account address" · "Done" · "Browse while you wait".

**Card.** Pills: "In the queue" · "Being prepared" · "Question for you" · "Ready". Lines: "Usually ready by {date}" · "Choosing the key terms and writing definitions and examples." · "Taking a little longer than usual · new estimate {date}" (shown once a delay notice was sent) · "We have a quick question about your request." + the question + "Your reply" + "Send reply" · `{N} terms added to your Library.` with "Start reading" and "Open collection" · `"{name}" was already in Browse, so we added it to your Library.` · "We couldn't prepare this one" + reason + "Paste a list" · "Browse collections". Cancel: "Cancel request"; dialog `Cancel "{topic}"?`, body "You can send a new request afterwards." (after Accept: "We've already started, so this still counts toward your 3 requests."), buttons "Cancel request" / "Keep it". Toasts: "Request cancelled" · "Reply sent". "Dismiss".

**Decline reasons.** too_broad: "That topic is too broad to cover well in one collection. Try a narrower one, for example a single area within it." · too_niche: "That topic is too narrow for us to prepare a collection around. Try a wider one, or add the terms yourself." · not_jargon_or_vocabulary: "That isn't something we can prepare as jargon or vocabulary. Collections here are terms with definitions." · language_not_supported: "We can't prepare collections in that language yet. English and Dutch are supported." · team_internal: "We can't know a team's own terms. Paste your team's list instead." An optional short note is shown under the reason.

**Emails (†).** Ready: subject `"{topic}" is ready in your Library`; body "{N} terms are in your Library, ready to read." + button "Open it". Needs input: subject `A quick question about "{topic}"`; body shows the question + "Reply in your Library". Delay: subject `"{topic}" is taking a little longer`; body "It's taking a little longer than usual. New estimate: {date}." Declined: subject `We couldn't prepare "{topic}"`; body "We couldn't prepare this one." + reason + alternatives. Admin notice: subject "New collection request"; "{kind} · {language}: {topic}" + link (admin-facing).

**Public pages.** `before-you-sign-up`, "Private by default": add "If you request a collection, our team reads your request to prepare it." "Getting terms in": add the FAQ answer "Can't find a collection on your topic? Request one. Our team prepares each requested collection and adds it to your Library, and it stays private to you unless you share it."

**Admin-facing** (not subject to the never-use list, but not user-visible): "Accept", "Ask", "Merge", "Decline", "Set new date", "Deliver to requester", "Reply received", "Overdue", "Email failed · Resend", settings "Accept new requests" and "Slower than usual", confirm "Deliver '{name}' ({N} terms) to {M} people? Each gets their own private copy."

## 8. Edge cases

Plan 8.6 first, then new ones. Every handling is enforced in SQL unless noted.

- **Same user re-requests the same topic:** allowed within quota; the form shows the repeat-topic notice (client compares normalised topic against `recent`).
- **Several users, same topic:** Merge on the desk (same kind and language required); one Fulfil delivers a **separate private copy to each**, so edits never cross.
- **Quota:** shown before the form, enforced by the RPC, the one-open unique index and a row lock. Two parallel submits: one succeeds, the other gets `request_open_exists` and the UI shows the open request.
- **A Browse collection already matches:** close matches with Add on the form; the admin can Merge → a Browse collection or use the "Already in Browse" template, which adds it for the requester and marks the request Ready.
- **Vague, huge, inappropriate:** Decline templates with a self-serve route. Declined requests don't use up quota.
- **Team-internal jargon:** template pointing to Paste; or Ask for must-include terms that come with definitions.
- **Confidential data in free text:** helper text on the form; only requester and admin can read it; it appears in no email to other people and in no audit detail; the admin notice contains the topic only.
- **User cancels after work started / admin delivers after a cancel:** both lock the row. Delivery fails with "They cancelled this request." and the desk refreshes.
- **Account deleted or suspended:** deletion cascades the request; a primary's merged children are promoted by the trigger. Delivery to a suspended account is refused ("This account is suspended."). A mid-Fulfil admin gets "That request no longer exists."
- **Name collision:** delivery uses `Name (2)`; never merges. The success toast shows the final name.
- **Delivery bypasses RLS:** only through the two security-definer RPCs, admin-checked, audited in the same transaction.
- **Resend failure:** delivery and status stay committed; `email_failed` is set and the desk shows "Email failed · Resend". The in-app card is the source of truth.
- **Missed estimate:** the desk flags Overdue; "Set new date" sends the one delay email and then locks. Pause switch: new requests get the longer estimate and users see the banner; existing due dates never change silently.
- **Time zones:** dates are stored as timestamps and shown as local dates, formatted on the server with the user's timezone.
- **`needs_input` reply:** back to the queue (or "Being prepared" if already accepted), the clock resumes by the time spent waiting; the desk shows "Reply received".
- **Private and requester-owned; nothing auto-published:** `visibility = 'private'`; later sharing follows the normal rules.
- **"Request definitions":** release 2c (fills the requester's existing unfinished terms by name; never creates a collection).
- **RLS:** users read only their own rows; admins read all.
- **Abuse:** one open + 3 per 30 days, server-side; topic and known-terms caps; no free-text length surprises in email.
- **Copy discipline:** every status, email and decline string is covered by the never-use test.

**New edge cases found**

1. **Cancel or delete of a merge primary** would orphan its merged requesters. Handled by `_promote_merged_children` (called by cancel and a before-delete trigger).
2. **Declining a primary** also declines and emails its merged children (explicit confirm dialog says how many).
3. **HTML injection in emails:** the existing templates interpolate raw text. New templates escape everything; the topic is user text.
4. **The admin can't read the requester's private collections.** Anything needing them (2c's unfinished-term list) is an admin RPC.
5. **A delivered collection must be fully finished:** Fulfil blocks while any card lacks a definition (otherwise the requester would get "unfinished" terms they didn't write).
6. **Draft collision:** the admin's pasted list must not share the personal draft key, nor leak across requests: per-request key, cleared after delivery.
7. **Refactor risk:** `my_import_terms` must stay byte-for-byte equivalent in behaviour. Release 2a ships alone and soaks first.
8. **Activation flood:** a delivered collection is marked active, so its never-tested terms rank first in Review and Quiz, ahead of existing material. Same as import and per the brief; noted for the owner (question 7).
9. **The admin can request and deliver to themselves.** No special case; it's the easy way to test end to end.
10. **Merge with different kind or language** is refused (`AD001`-style message from the action); different languages would deliver the wrong content.
11. **A request whose topic equals an owned collection name:** hint only; delivery still suffixes if needed.
12. **Two admin tabs:** compare-and-set updates make the second action fail with "Request already handled."
13. **`needs_input` with no reply:** no expiry in this phase; the admin can Decline.
14. **Pause and `enabled` are different:** disabled hides the entry points but existing requests keep their cards and emails.

## 9. Tests

`pnpm check` and `pnpm test` pass at every release. Table-driven where there are cases.

**Vitest** (new, under `lib/requests/` and `lib/admin/requests/`):

- `schema.test.ts`: topic length and whitespace, kind×level validity, size set, known-terms line cap/dedupe/trim, language.
- `status.test.ts`: status → pill/line map; **"Being prepared" only for `in_progress`**; merged display; delayed line only when a notice was sent.
- `copy.test.ts`: scans every user-facing string (card, form, chooser, decline templates, emails, public lines) against the never-use patterns (`generat`, `\bAI\b`, `automatic`, `instant`, `\d+\s?%`, `progress`, `admin`, "no one sees", "100% private").
- `email-copy.test.ts`: subjects and bodies per kind, **HTML-escaped topic** (`<script>`, quotes, `&`), links.
- `dates.test.ts`: due date in the user's timezone around midnight and DST; fallback to UTC.
- `similar.test.ts` (admin): similar-name matching, escape of `%` and `_`.
- `list-params.test.ts` (admin): tab/q/page parsing like the people params.
- `lib/admin/audit-labels.test.ts` stays green: add `deliver_collection_request`, `deliver_existing_collection` (and 2c `fill_request_definitions`) to `DB_AUDIT_ACTIONS`; `app.request_accept|ask|decline|merge|new_date|settings|email_resend` to `APP_AUDIT_ACTIONS`.
- `app/(private)/admin/requests/actions.test.ts` (pattern of `people/actions.test.ts`, mocking Resend and `require-session`): lost race, Resend failure leaves status changed and sets `email_failed`, delay notice once, merge validation, decline cascades.
- `admin-sections.test.ts` (unique hrefs), `pages-guarded.test.ts` (both new pages), `overview.test.ts` (new item, tones).
- `use-import-flow` adapter: extend `check-state.test.ts` only if logic moves there; the adapter itself is thin. `draft-store.test.ts` extended for keyed stores and throwing storage.

**SQL (hand-run, like the existing tests)**

- `supabase/tests/import_terms.sql` and `import_terms_concurrency.sh` re-run unchanged after 2a.
- `supabase/tests/import_terms_for_user.sql`: `_import_terms_for` isn't callable by any role; suffix collision yields `Name (2)`, `(3)`; `fail` still raises.
- `supabase/tests/collection_requests.sql`: RLS (A can't read/insert/update/delete B's row; users can't edit status or `due_at`; admin reads all; anon nothing); quota (second open request fails, fourth in 30 days fails, declined and cancelled-before-accept don't count); transitions and `display_status` for merged; cancel promotes children; deleting a primary's user promotes children; reply resumes the clock; deliver: private, owner is the requester, active, terms written, "(2)" on collision, merged requesters each get their own copy, cancelled blocked, suspended blocked, a term without a definition rejects the whole delivery and **writes nothing**, audit row written, a non-admin is refused; `admin_deliver_existing_collection` refuses a private domain; settings readable by members, writable by admins only.
- `supabase/tests/collection_requests_concurrency.sh`: two parallel creates → one row; deliver vs cancel → exactly one wins.
- 2c: `request_definitions.sql` (fills only unfinished terms by name, skips the rest, in place so history is intact, refuses a collection with no unfinished terms or another owner's).

**Browser (preview tools, 375px and desktop, light and dim):** the full flow in section 10. **Surface check:** a delivered collection appears in Read, Review and Quiz like an import, and its terms are finished.

## 10. Device checklist

From plan section 10, only what phase 2 depends on:

- **Request emails land in the inbox** (Gmail, iCloud, Outlook) for all four user emails and the admin notice†.
- **The keyboard vs the Send request button** on iPhone (iOS 26/27) and Android; `interactive-widget` is already set from phase 1.
- Form, card and reply box at 375px, in the iOS Safari tab and the Home Screen app, light and dim.
- Not applicable: paste sources, the Paste button, file picker, 200-card scrolling, share target, push.

Flow to run: enable requests → search with no match → Request row → submit → card shows "In the queue" → admin Accept → "Being prepared" → Ask → reply on the phone → admin pastes a list on the desk → Check → Deliver → card shows Ready with Start reading, email arrives. Then a merge of two requesters, a decline, a cancel mid-way, Set new date, Resend email, and a quota refusal.

## 11. Rollout and back-out

Requests ship **dark**: `collection_request_settings.enabled` defaults to `false`. While off, no entry point or form appears; the admin desk is visible and usable (the admin tests with their own account by flipping `enabled` on, then off). This is the existing pattern for switches (`ai_credit_settings`).

| Release            | Contents                                                                                              | Visible?                    | Back-out                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **2a Refactor**    | Migration 4.1, SQL tests                                                                              | No                          | Revert the PR or ship the restoring migration. The wrapper is behaviour-identical, so no data is touched.                                      |
| **2b Requests**    | Migration 4.2, user flow, card, emails, admin desk, Fulfil with the import adapter, public copy, docs | Only after `enabled = true` | Set `enabled = false` (stops new requests; cards for open ones stay and emails still work). To remove the UI revert the PR. Tables stay inert. |
| **2c Definitions** | Migration 4.3, Check-screen link, fill RPC, Fulfil variant                                            | Yes, with 2b enabled        | Revert the PR; the link disappears. Requests of kind `definitions` already created stay readable (the `kind` check is only relaxed).           |

Order: 2a ships and soaks first. Enable requests only after the device checks in section 10 (emails) pass.

**Cascade caution:** deleting a term wipes `user_progress`, `review_state`, `review_events`, `term_narrations`, term evaluations, `term_relationships` and `triage_not_yet`. A bad delivery is **never** cleaned up with SQL deletes. The requester can delete a delivered collection they haven't used through the normal "Delete collection"; the admin has no withdraw action (question 4). The request tables reference `domains` with `on delete set null` and `users` with `on delete cascade`, so they never block either delete and never delete a term.

## 12. Task breakdown

Each step is independently reviewable. `pnpm test` after logic steps, `pnpm check` after each group.

**Release 2a: refactor**

0. Copy this plan to `plan-import-phase-2.md`. Files: `plan-import-phase-2.md`.
1. `pnpm install`; read the Next 16 docs in `node_modules/next/dist/docs/` for server actions, `after`, and `revalidatePath`. No files.
2. Migration 4.1 + `import_terms_for_user.sql`; re-run `import_terms.sql` and the concurrency script. Files: `supabase/migrations/20261002100000_import_terms_for_user.sql`, `supabase/tests/…`.

**Release 2b: requests** (flag off)

3. Migration 4.2 + `collection_requests.sql` and the concurrency script; `pnpm supabase:types`. Files: `supabase/migrations/20261002110000_collection_requests.sql`, `supabase/tests/collection_requests*.{sql,sh}`, `lib/supabase/database.types.ts`.
4. Pure modules and tests: `lib/requests/{types,schema,status,copy,known-terms,dates}.ts` + tests. Files: `lib/requests/*`.
5. User repository and actions: `lib/requests/repository.ts`, `app/(private)/jargon/import/request/actions.ts`, `app/(private)/jargon/actions-requests.ts`.
6. Emails: `lib/requests/email-copy.ts` + tests, `sendRequestEmail` and the admin-notice sender in `lib/email/resend.ts`.
7. Extract `hooks/use-browse-search.ts` from `import-chooser.tsx` (no behaviour change). Files: `hooks/use-browse-search.ts`, `components/jargon/import/import-chooser.tsx`.
8. Request form and sent state, plus the route. Files: `app/(private)/jargon/import/request/page.tsx`, `loading.tsx`, `components/requests/request-form.tsx`, `request-sent.tsx`, `request-quota-note.tsx`.
9. Entry points: the chooser row and message, Browse no-results row with the search text passed down. Files: `components/jargon/import/chooser-search-results.tsx`, `import-chooser.tsx`, `components/jargon/shared-domains-empty-states.tsx`, `shared-domains-browse.tsx`.
10. Library card: `requests-section.tsx`, `request-card.tsx`; wire into `app/(private)/jargon/(collection)/page.tsx`, `jargon-page.tsx`, `empty-collection.tsx`.
11. Admin plumbing: `admin-sections.ts` (+ test), `account-nav.ts` (before `/admin`), audit labels (+ test), `lib/admin/requests/*` (params, queries, similar) + tests, Overview item.
12. Admin queue page, settings block and actions (accept, ask, decline, merge, new date, resend, settings) with `actions.test.ts`. Files: `app/(private)/admin/requests/{page,loading,actions}.tsx|ts`, `components/admin/requests/*`.
13. Admin desk page `[id]` with details and similar lists.
14. Import adapter: `createDraftStore(key)`, `useImportFlow({ adapter })`, `FixedDestinationNote` in `CheckStep`; tests. Files: `lib/jargon/import/draft-store.ts`, `components/jargon/import/use-import-flow.ts`, `check-step.tsx`, `import-flow.tsx`, `lib/jargon/import/commit-schema.ts` (export term and link schemas).
15. Fulfil panel and `deliverRequest`/`mergeRequest`→Browse path. Files: `components/admin/requests/fulfil-panel.tsx`, `app/(private)/admin/requests/actions.ts`.
16. Public copy and docs: `components/content/before-you-sign-up-page.tsx`, `docs/import.md` (requests section + metric queries), `docs/admin.md` (page and RPC rows), `AGENTS.md` (3 lines). Use the docs-writer skill for `docs/*.md`.
17. Verify: `pnpm check`, `pnpm test`, SQL tests, browser flow at 375px and desktop, light and dim, device pass; then enable.

**Release 2c: definitions** (optional last)

18. Migration 4.3 + SQL test; types.
19. Check-screen link "Request definitions for these words" (word-only list, language collection) opening the form with the words prefilled; `createRequest` accepts `targetDomainId`. Files: `components/jargon/import/check-extras.tsx`, `request-form.tsx`, `lib/requests/schema.ts`.
20. Admin Fulfil variant: unfinished-word list, local match, `admin_fill_definitions`. Files: `components/admin/requests/fulfil-panel.tsx`, `actions.ts`.

## 13. Open questions for the owner

Answered in this session: **(a)** no email on Accept, only Ready / Needs input / delay / decline; **(b)** "Request definitions" is in phase 2 as release 2c; **(c)** the delay email is sent by an admin "Set new date" button, no cron.

Defaults chosen; change any you disagree with:

1. **Level options for vocabulary** are "A1–A2" and "B1 and up" (from plan 4.5); jargon keeps New / Basics / Brushing up.
2. **What counts toward "3 per 30 days":** every request except declined ones and ones cancelled before the admin accepted them. Cancelling after work started still counts.
3. **One question, one reply per round.** No message thread; the admin can ask again.
4. **No admin way to withdraw a delivered collection.** A wrong delivery is fixed by the requester deleting it (it's brand new, so nothing is lost) or by delivering a corrected one. Say if you want an admin "withdraw while unused" action.
5. **The card has no progress ladder or dots** (the artifact has one; the never-use list bans progress bars). Say if a three-step status line is acceptable.
6. **No privacy page or FAQ exists.** The privacy line and FAQ answer go into `before-you-sign-up`. That page also says "I use a skill that generates jargon lists" in the same section as the new request line; I left it alone, but you may want to reword it so it can't be read as describing requests.
7. **Delivered collections are marked active**, so their never-tested terms rank first in Review and Quiz. Same as import and as the brief states. Say if you'd rather deliver inactive and let the requester switch it on.
8. **A delivered collection must have a definition on every term.** Fulfil blocks otherwise. Say if you'd allow unfinished terms in a delivery.

No question blocks starting 2a.
