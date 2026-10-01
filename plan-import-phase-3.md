# Import flow, phase 3: Capture and alerts

Planning only: no code has been changed. Written 2026-10-01.

## Context

Phases 0 (#144), 1 (#145) and 2 (#146) shipped. Phase 3 does two things for people who already use the app:

1. **Capture**: save a word the moment you hear it, from inside the app or (Android, installed) from another app's share sheet.
2. **Alerts**: tell a requester on their phone when a requested collection is ready or has a question.

Owner answers in this session: shortcuts are **Add a term, Paste a list, Read, Review**; there is **no global "+"** (the existing "Add collection" entry in the user menu is enough); push has an **admin switch plus env keys**.

Phase 3 ships as **four releases**: 3a capture page, 3b share target and shortcuts, 3c-1 push database (expand), 3c-2 push app code. 3a and 3b don't depend on 3c.

### Verified against the code (2026-10-01, `main` at `6d0779f`)

| Finding | Effect on the plan |
| --- | --- |
| **The research report and notes are not in the repo** (`reports/`, `research_notes/` don't exist). | Planned from the brief, the artifact and the shipped code. |
| **`node_modules` is not installed**, so `node_modules/next/dist/docs/` could not be read (same as phase 2). Plan mode also blocks installing. | Task 1 installs and reads the Next 16 guides (manifest, route handlers, server actions, `proxy.ts`, `after`) before any code. Open item: whether `MetadataRoute.Manifest` types `share_target`; if not, widen the return type in one place. |
| The brief's "Now (phase 0/1)" capture list is **only partly built**. `AddTermDialog` (`components/jargon/add-term-dialog.tsx`) is fixed to one collection. It has two fields, "More details", Save / Save and add another, an in-memory duplicate check and the multi-line paste hand-off. It has **no destination chip, no last-used collection, no "Name your first collection"**. | Phase 3 builds those on the new capture page. The in-collection dialog stays as is. |
| "Just one term" in the chooser opens `OneTermDialog` (pick a collection), then `/jargon?domain=X&add=1`, which opens `AddTermDialog` on the Library. | Retarget the row to `/jargon/capture`; remove `OneTermDialog` and, if nothing else uses it, the `add=1` plumbing. |
| Chrome is path based (`lib/chrome.ts`): only `/jargon` and `/admin` get app chrome. `/jargon/import/*` is a "more path" (dock hidden, back arrow). Titles come from `studyScreenTitle` in `components/app/account-nav.ts`. | The plan's `/capture` becomes **`/jargon/capture`**, added to `isMorePath` and the title table. A bare `/capture` would render as the website. |
| Auth is `proxy.ts` → `lib/supabase/proxy.ts`. A signed-out request redirects to `/login?next=<path+search>` and `safeNextPath` keeps the search string. | A GET share target survives sign-in. Nothing new to add to the public path lists. |
| `createTerm` (`app/(private)/jargon/actions-terms.ts`) takes `(domainId, TermInput)`. Only `term` is required, `example` is supported, and a duplicate returns "A term named … already exists in this collection." | Capture reuses it through `useTermActions`. No new write path. |
| `createEmptyCollection({name, language})` (`actions-collections.ts`) and `findSimilarName` exist. | Used for "Name your first collection". |
| `listImportDestinations` returns owned collections (`id, name, language, termCount`); `getImportSetupData` wraps it. `findDestinationMatches` loads **every** term of a collection. | The destination list is reused. The per-keystroke duplicate check gets its own single-row query (too heavy otherwise). |
| `classifyTermPaste`, `PastedListPrompt`, `writeDraft` and `/jargon/import/paste?to=<id>&from=term` (auto-check) exist. | Reused for the multi-line paste hand-off, also for a shared list. |
| `lib/jargon/like-escape.ts` (`escapeLike`) exists. | Used by the duplicate check. |
| No tokenizer for sentences exists. `commit-schema.ts` already allows `entry: 'capture'` but nothing sends it. | New pure module. No import batch is written for capture. |
| Manifest (`app/manifest.ts`): shortcuts Read, Review, Quiz; no `share_target`; icons only `/icon/192|512|maskable`, no monochrome badge icon. `PWA_ID`/`start_url` live in `lib/pwa.ts`. | Edit shortcuts and add `share_target`; leave `id`/`start_url` alone so installed apps aren't treated as a new app. |
| `app/sw.ts` (Serwist) has only `addEventListeners()`. The SW is **disabled in dev** (`pwa-providers.tsx`), so push needs a production build to test. `next.config.ts` has no CSP. | Add `push` and `notificationclick`; test through pure helpers plus a production-build device pass. |
| **No push code at all**: no `web-push` dependency, no VAPID env, no `push_subscriptions`, no `setAppBadge`. `.env-template` is the only env doc; there is no env validator and no `vercel.json`. | New table, RPCs, `lib/push/*`, dependency, env keys. |
| `notifyRequester(client, requestId, kind)` in `lib/admin/requests/notify.ts` returns early on `!row.notify_email`, and sets `email_failed` on failure. Callers: `askRequest`, `declineRequest`, `setNewDate`, `emailDeliveries` (ready), `resendRequestEmail`. All sync, none in `after()`. | Push is a sibling that runs independently of the email gate and never touches `email_failed`. "Resend email" must not re-push. |
| `RequestSent` (`components/requests/request-sent.tsx`) has the Email switch only. Settings page has Llm, Telegram, Widget panels (`SettingsTabId = "ai" \| "telegram" \| "widget"`). `PwaInstallProvider` owns the iOS "Add to Home Screen" dialog but exposes no hook outside its file. | Push row goes in `RequestSent` and a small Settings panel; export a `useInstall()` hook for the iOS hint. |
| Logout is a server action called from two client components (`profile-menu.tsx`, `study-phone-more-sheet.tsx`). | Best-effort device unsubscribe before logout (shared devices). |
| `collection_request_settings` is a singleton; admins have **column-level** `grant update (...)`. Admin UI: `components/admin/requests/requests-settings.tsx` + `saveRequestSettings`. `docs/admin.md`: migrations are expand, release, contract because the app deploys before migrations run. | `push_enabled` column and grant ship in 3c-1, code in 3c-2. |
| Vitest runs in `node` only, no `*.test.tsx`; `pnpm check` doesn't run tests; knip fails on unused exports; `max-lines` 280; file `hooks/use-mount-effect.ts` is the sanctioned effect wrapper (there is no `no-use-effect` lint rule, only the repo convention). | Logic goes in pure `.ts` files with tests; components stay thin; run `pnpm test` as well as `pnpm check`. |

Read: plan sections 1, 4.5, 4.6, 5, 6, 7 (phase 3), 8.7, 8.8, 9; `docs/import.md`; `docs/admin.md`; `docs/trace.md` (no TRACE change: a captured term without a definition is excluded already; one with a definition in an active collection ranks first in Review and Quiz like any new term, which is one term, not a flood).

---

## 1. Goal and scope

**Goal:** a phone user can save a word in about five seconds, and a requester hears about Ready / Needs input without opening the app.

**In**

1. **Capture page** `/jargon/capture`: Term, Definition (optional), destination chip with last-used memory, Save / Save and add another, duplicate check as you type, multi-line paste hand-off, "Name your first collection". Reached from the chooser's "Just one term" row, the Android shortcut and the share target.
2. **Android share target and shortcuts** (installed app only): a shared sentence shows its words as chips; the tapped word(s) become the term and the sentence becomes the example. Shortcuts: Add a term, Paste a list, Read, Review.
3. **Web push for requests**: Ready and Needs input only, Declarative Web Push payload, a service-worker fallback, "Notification on this device" row on the Request-sent screen, a Settings row to turn it off, app badge, an admin switch, send-time pruning of dead subscriptions.
4. Docs, copy tests, SQL tests.

**Out (deferred, with reason)**

- **Global "+"** and a tour step for it (owner: not needed).
- **Offline capture queue, Apple Shortcut with a capture token, desktop bookmarklet** (phase 4, on demand).
- **Push for delay and decline** (brief: Ready and Needs input only; email covers the rest).
- **Notifying the admin when a requester replies** (no such notice exists today; email/push to admins is a separate ask, see question 3).
- **"More details" on the capture page** (category, notes, links). The in-collection sheet keeps them. The saved state links to the collection.
- **Focusing the existing term from "Open it"** (needs a `?q=` Library param; "Open it" opens the collection).
- **Capture draft in local storage** (a shared sentence survives in the URL; typed text doesn't survive the app being killed).
- **`pushsubscriptionchange` handling and app-wide re-subscribe** (dead subscriptions are pruned on 404/410, email is always on as the fallback).
- **Distinct shortcut icons and a monochrome notification badge icon** (use the existing icons).
- **Capture analytics** (no analytics exist; `import_batches` is for imports).

## 2. User stories (phone first)

1. *I just heard "idempotent" in a meeting.* From the chooser I tap Just one term, type the word, tap Save. It's in my collection; I'm asked nothing else.
2. *I don't know the meaning yet.* I leave Definition empty. It's saved to finish later and I'm told it stays out of study until then.
3. *I'm adding five words in a row.* "Save and add another" keeps the collection and the keyboard.
4. *I already saved it last week.* While I type, a note says "Already in Software engineering" with Open it. I can't create a second copy; I'm told to add a qualifier if the meaning differs.
5. *I have no collection yet.* The page asks me to name my first one, then lets me save the word.
6. *I pasted twelve lines by mistake.* I'm offered "Add 12 terms" (goes to the paste importer) or "Keep as one".
7. *(Android, installed)* *I'm reading an article and select a sentence, tap Share, pick Jargon Gym.* I see the sentence as tappable words, tap "SLA", and Save. The sentence is stored as the example.
8. *(Android)* *Long-press the icon.* I see Add a term and Paste a list.
9. *I requested a collection and closed the app.* My phone says "Your collection is ready" and tapping it opens the collection.
10. *They have a question.* I get a notification that opens my Library where the reply box is.
11. *I'm on an iPhone in Safari.* The request confirmation tells me to add Jargon Gym to my Home Screen to get notifications, and shows how.
12. *I changed my mind.* I turn notifications off on the same screen or in Settings.

## 3. Screens

Artifact: https://claude.ai/artifact/KDHErTpsHzPQvWjPe2YAsE. Differences, all from owner decisions or the brief: no global "+"; "Notification on this phone" row is live (the artifact shows it on the Request-sent screen only); the lock-screen mock is the Declarative payload.

| Screen | Route / component | Artifact source | States |
| --- | --- | --- | --- |
| **Capture** | `/jargon/capture` (`capture-flow.tsx`) | "Capture · now" | *Idle:* Term focused, Definition, destination chip. *Typing:* duplicate note appears under Term (debounced). *Duplicate:* Save disabled, "Open it". *Saving:* buttons "Saving…". *Error:* destructive alert above the buttons, input kept. *Saved:* confirmation with Add another / Open collection. *Add-another:* form resets in place, toast. |
| **Capture, first collection** | same route (`first-collection-form.tsx`) | none (new, per plan 8.7) | Name + language, near-name guard, "Create and continue". After creating, the page reloads with `?to=<id>`. |
| **Capture, pasted list** | inline `PastedListPrompt` | "Capture · a list by accident" | Add N terms / Keep as one. Also shown when a share contains several lines. |
| **Capture, shared sentence** *(3b)* | same route with `?text=` | "Capture · from other apps · Phase 3" | Chips for each word; none selected; one or more selected (term filled); Example prefilled with the sentence. A shared single word or short phrase fills Term directly. A shared URL only: plain empty form. |
| **Chooser row** | `import-chooser.tsx` | "Add a collection" | "Just one term" now a link to `/jargon/capture`. |
| **Request sent + push row** *(3c-2)* | `request-sent.tsx` | "Request a topic · Step 3" | *Hidden:* push off or unsupported browser. *Off:* switch off, "Your phone will ask for permission." *Enabling:* switch busy. *On:* switch on. *Blocked:* "Notifications are blocked in your browser settings. We'll email you instead." *iOS Safari tab:* "Add Jargon Gym to your Home Screen to get notifications." + "Show me how" (opens the existing iOS dialog). *Error:* toast, switch back. |
| **Settings → Notifications** *(3c-2)* | `/jargon/settings` panel | none | Same states as the row, for this device. Panel hidden when push is off. |
| **Notification** *(3c-2)* | OS UI | "Request · Step 5" | Ready; Needs input; generic fallback if the payload is unreadable. |
| **Admin → request settings** *(3c-2)* | `/admin/requests` settings block | none | New "Phone notifications" switch; warning "Push keys aren't set, so nothing is sent." when env is missing. |

## 4. Data model and migrations

3a and 3b need **no migration**.

### 4.1 `20261003100000_push_subscriptions.sql` (release 3c-1, invisible)

```
push_subscriptions(
  id uuid pk default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 2048),
  p256dh text not null check (char_length(p256dh) between 20 and 256),
  auth text not null check (char_length(auth) between 8 and 128),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now())
index (user_id, last_seen_at desc)

alter table collection_request_settings add column push_enabled boolean not null default false;
grant update (enabled, paused, estimate_days, paused_estimate_days, push_enabled) on collection_request_settings to authenticated;  -- replaces the column list from phase 2
```

**RPCs** (security definer, `search_path = public`, `auth.uid()` required, `revoke … from public, anon; grant … to authenticated`), following `my_add_not_yet_terms`:

- `my_save_push_subscription(p_endpoint, p_p256dh, p_auth, p_user_agent)`: upsert on `endpoint`, setting `user_id = auth.uid()` (an endpoint belongs to one browser, so signing in as someone else on the same device moves it), refreshing keys and `last_seen_at`. Then deletes the caller's oldest rows beyond **10**. Returns void.
- `my_remove_push_subscription(p_endpoint)`: deletes only the caller's row. Idempotent.
- `my_has_push_subscription(p_endpoint)` → boolean, for the Settings state.

### RLS summary

RLS on; `revoke all … from public, anon, authenticated, service_role`; **no policy for `authenticated`**, so users can't read endpoints or keys (an endpoint plus its keys can push to a device). `grant select, delete` to `service_role` only (the sender reads and prunes). All user access goes through the three RPCs. SQL test proves: anon and authenticated can't select, insert, update or delete; the RPCs only touch the caller's rows; `service_role` can read and delete.

**Backfill:** none (new table; `push_enabled` defaults false). **Rollback:** forward-only. Switch off `push_enabled` to stop sending. Don't drop the table once anyone subscribed. Nothing references `push_subscriptions` and it references only `users`, so `delete from push_subscriptions` is safe, unlike deleting terms, whose cascades wipe learning history (cascade list in plan section 2).

## 5. Server side

**Capture (3a)**

- `app/(private)/jargon/capture/page.tsx` (server): reads `searchParams {to, text, title, url, source}`; loads `getImportSetupData()` (owned collections); parses the share with `parseSharedInput` (pure) and passes it down. `loading.tsx` like `import/loading.tsx`.
- `app/(private)/jargon/capture/actions.ts`: `findCaptureDuplicate({ domainId, term })` → `{ ok: true, match: { term, finished } | null } | { ok: false }`. zod (uuid, trimmed term 1–200). `requireAuthenticatedClient`; one query on `terms` joined to `domains!inner(owner_id)` with `owner_id = user`, `ilike('term', escapeLike(term))`, `limit 1`. It's a lookup; the unique index and `createTerm`'s existing error are the backstop for races. Failure returns `{ ok: false }` and the page stays silent.
- Save reuses `createTerm` via `useTermActions` (no new write). First collection reuses `createEmptyCollection`.
- `lib/jargon/capture/destination.ts` (pure): `pickDestination({ preset, stored, collections })`.
- `hooks/use-capture-duplicate.ts`: 300 ms event-handler debounce with a request id (the `use-browse-search.ts` pattern), no `useEffect`.

**Share intake (3b), `lib/jargon/capture/`, all pure**

- `shared-input.ts`: `parseSharedInput({ title, text, url })` → `none | term | pair | lines | sentence`. Strips URLs from `text` (Android often puts the link there); ignores `title` (page title, not a sentence); caps a sentence at 500 characters at a word boundary; reuses `classifyTermPaste` for multi-line text.
- `tokenize.ts`: `tokenize(sentence)` → `{ text, start, end }[]`. A word is letters or digits with inner apostrophes (`'`, `’`) and hyphens kept ("zzp'er", "SLA's", "follow-up", "5G", "e-mail"); edge punctuation is dropped from the chip but kept in the example.
- `selection.ts`: `toggleChip(selection, index)` and `termFromSelection(sentence, tokens, selection)`. Selection is one contiguous run, at most 8 words: tapping next to the run extends it, tapping an end shrinks it, tapping elsewhere starts a new run. The term is the original text slice, so inner spacing and punctuation survive.

**Push (3c-2)**

- `lib/push/config.ts`: `getPushConfig(client)` → `{ publicKey } | null`, non-null only when `push_enabled` **and** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` are all set. The public key reaches the browser as a prop, so there is **no `NEXT_PUBLIC_` variable and no CI build change**. The admin block shows a warning when the keys are missing.
- `lib/push/payload.ts` (pure, shared with the SW): `buildPayload({ title, body, navigate, badge })` → Declarative JSON `{ web_push: 8030, notification: { title, body, navigate, app_badge? } }`; `parsePayload(unknown)` → validated `{ title, body?, navigate, badge? } | null`; `navigate` must be same-origin.
- `lib/push/send.ts`: `sendPush(subscription, payload)` using `web-push` (new dependency + `@types/web-push`), 5 s timeout, TTL 24 h, returns `'sent' | 'gone' | 'failed'`; 404/410 → `gone`.
- `lib/admin/requests/notify-push.ts`: `pushRequester(client, requestId, kind: 'ready' | 'needs_input')` → `NotifyResult`. Skips when push isn't configured or the user has no subscription. Loads subscriptions with the service client, builds the payload from `REQUEST_COPY.push`, `navigate` = collection URL (ready) or `/jargon` (needs input), `app_badge` = the user's count of requests that are `ready` or `needs_input` and not dismissed; sends with `Promise.allSettled`; deletes `gone` rows; **never throws and never sets `email_failed`**.
- `notifyRequester` gains `options?: { push?: boolean }` (default true): for `ready` and `needs_input` it also calls `pushRequester`, independent of the `notify_email` gate. `resendRequestEmail` passes `push: false`. Existing action tests keep mocking `notifyRequester`.
- User actions `app/(private)/jargon/actions-push.ts`: `savePushSubscription(input)` (zod: https endpoint, key lengths, user agent trimmed to 300) → `my_save_push_subscription`; `removePushSubscription(endpoint)`; `hasPushSubscription(endpoint)`. Plain failures `{ ok: false, message }` like `actions-requests.ts`.
- Admin: `saveRequestSettings` gains `pushEnabled`; `RequestSettings` and `queries.ts` carry `pushEnabled` and `pushConfigured`. Audit action stays `app.request_settings` (details include the new flag).

## 6. UI components

DaisyUI via `components/ui/*`. Mobile first, inputs ≥ 16px, primary button in the page flow (no fixed bar while a field has focus), focus on the page heading, `role="status"` on notes. **No direct `useEffect`**: server components load data; client state is `useState` / `useSyncExternalStore`; the only effects are `useMountEffect`.

- `app/(private)/jargon/capture/page.tsx` uses `PageHeader` (icon, title "Add a term", `backHref="/jargon/import"`, `compactOnPhone`) like `paste/page.tsx`.
- `components/jargon/capture/capture-flow.tsx` (state and save), `destination-chip.tsx` (wraps `CollectionSelect mode="local"`), `capture-duplicate-note.tsx` (reuses the `Alert` markup from `add-term-dialog.tsx`), `first-collection-form.tsx` (name, `LanguageToggle`, `findSimilarName` guard), `capture-saved.tsx`, `shared-sentence-chips.tsx` (3b; chips as `aria-pressed` buttons, ≥ 44 px targets).
- `lib/jargon/capture/destination-pref.ts`: last-used collection id per device, key `jargon-gym:capture-destination:v1`, `useSyncExternalStore` with a `null` server snapshot (the `library-filters.ts` pattern), every access in try/catch. The page picks `?to` → stored → first collection, and writes the pref on each save.
- `lib/jargon/capture/copy.ts` holds capture strings; the add-term sheet's "unfinished" toast moves here and `add-term-dialog.tsx` imports it, so there's one wording.
- `PastedListPrompt` gets an optional `source: 'pasted' | 'shared'` for its one line of copy.
- Push (3c-2): `lib/push/support.ts` (pure state machine: `unsupported | needs_home_screen | blocked | can_enable`), `hooks/use-push-support.ts` (`useSyncExternalStore` over the capability checks, SSR snapshot "unknown"), `components/push/push-toggle-row.tsx` (shared by `RequestSent` and the Settings panel; subscribe happens inside the tap handler, permission asked only there), `components/jargon/settings/notifications-panel.tsx` (`SettingsTabId` gains `"notifications"`), `components/push/app-badge-sync.tsx` (renders nothing; `useMountEffect` calls `navigator.setAppBadge(count)` or `clearAppBadge()`; mounted on the Library with `key={count}` so it re-runs when the count changes). `PwaInstallProvider` gets an exported `useInstall()` for the iOS "Show me how" button. `lib/push/device.ts` (`removeThisDevicePush()`, best effort) is called before `logout()` in the two logout components.
- `app/sw.ts`: `push` and `notificationclick` handlers as thin glue over `lib/push/notification.ts` (pure: `notificationFromPush(data)` → `{ title, options, badge }` with a generic fallback; `pickWindowToFocus(clients, url)`), imported by a relative path in case the SW bundle doesn't resolve the `@/` alias.
- Admin: a "Phone notifications" `AdminSettingRow` + `AdminSwitch` in `requests-settings.tsx`.
- Manifest (3b): `share_target` and shortcut changes in `app/manifest.ts`.

## 7. Copy

All user-facing strings. Push strings live in `REQUEST_COPY.push` so `copy.test.ts` scans them against the never-use list (it already walks every function in `REQUEST_COPY` with sample arguments, so each template must tolerate string arguments). Capture strings aren't request-flow strings, but nothing in them names the admin or implies automation. † = depends on the device check.

**Capture page.** Title "Add a term". Labels "Term" (placeholder "e.g. Idempotent"), "Definition" (placeholder "What does it mean?", hint "Leave it empty to finish later."), "Example" (only after a share), "Collection". Chip: "Adding to {name}". Buttons "Save", "Save and add another", "Saving…", "Add another", "Open collection". Saved: `Saved “{term}” to {name}.` Unfinished: `Saved “{term}” to {name}. It stays out of study until you add a definition.` Duplicate: `“{term}” is already in {name}.` + "Different meaning? Add a qualifier, like “SLA (legal)”." + "Open it"; unfinished match: `“{term}” is already in {name} and needs a definition.` Errors: "Couldn't add that term. Try again." (existing), `A term named “{term}” already exists in this collection.` (existing).
**First collection.** "Name your first collection" · "Terms live in a collection. Name one to start." · name placeholder "e.g. Startup finance" · "Language" · "Create and continue" · existing near-name strings.
**Pasted list** (existing): "You pasted {N} lines" / "You shared {N} lines" · "Add them as separate terms? You'll check them before anything is saved." · "Add {N} terms" · "Keep as one".
**Shared sentence.** "Tap the word or words you want to save." · after a tap: "Saving “{term}”. Tap another word to change it." · "Shared from another app."
**Chooser.** "Just one term" / "Save a word you just came across" (unchanged).
**Request sent, push row.** "Notification on this phone" (desktop: "Notification on this device") · off: "Your phone will ask for permission." · on: "On for this device. We only use it for your requests." · blocked: "Notifications are blocked in your browser settings. We'll email you instead." · iOS tab: "Add Jargon Gym to your Home Screen to get notifications." + "Show me how" · error: "We couldn't turn on notifications. Try again."
**Settings panel.** "Notifications" · "Get a message on this device when a requested collection is ready, or when we have a question." · "Notify me on this device".
**Push messages.** Ready, prepared: title "Your collection is ready", body `“{topic}”: {N} terms are in your Library.` Ready, added from Browse: body `“{name}” was added to your Library.` Ready, definitions filled: body `{N} terms in “{name}” now have definitions.` Needs input: title "A quick question about your request", body `We have a quick question about “{topic}”.` Fallback: title "Jargon Gym", body "Open Jargon Gym to see what's new."
**Admin-facing** (not user visible): "Phone notifications" · "Sends a notification when a request is ready or has a question, to people who turned it on. Needs the push keys in the environment." · "Push keys aren't set, so nothing is sent."
**Public pages.** None. `before-you-sign-up` is static and requests may be off, so it gets no push or capture wording (question 5).

## 8. Edge cases

From plan 8.7, 8.8, 8.9 and 8.6 (the parts that touch notifications), then new ones.

- **User owns no collection (8.7):** inline "Name your first collection"; creating it reloads with `?to=<id>`, preserving shared params.
- **Destination remembered per device, fallback when deleted (8.7):** `pickDestination` ignores a stored id that isn't in the owned list and uses the first; storage access is in try/catch.
- **Duplicate check, debounced and cheap (8.7, 8.2):** one row per request, 300 ms, stale responses dropped by request id; checked against the **chosen destination only** (the same term in another collection is allowed, 8.2). Case and surrounding spaces ignored, accents count, like the index. Save is blocked on a match; the server unique-violation message is the race backstop.
- **Unfinished match:** the note says it needs a definition; "Open it" goes to the collection where the finish dialog lives.
- **Multi-line paste (8.7):** `classifyTermPaste` → fill Term + Definition for a two-line pair, offer "Add N terms" (draft + `/jargon/import/paste?to=<id>&from=term`; without a destination, no `to`) or "Keep as one".
- **Tokenising (8.7):** apostrophes and hyphens stay inside words; multi-word selection up to 8 words; emoji, RTL and mixed scripts pass through (the regex uses Unicode letter and number classes).
- **Share target specifics (8.7):** Android often puts the link in `text` (stripped); `title` ignored; GET length limits (sentence capped, URL not stored); a share with only a URL gives the plain form; reinstall may be needed after a manifest change (see rollout).
- **Capture while signed out (8.7):** the proxy redirects to login with `next` containing the query; the shared text survives. Users who haven't finished sign-up go to `/complete-signup` first and the share is lost (rare; accepted).
- **Offline (8.8):** capture needs the network. The existing offline banner shows, Save returns the standard failure and keeps the input. The queue is phase 4.
- **iOS keyboard (8.8):** buttons sit in the page flow, not a fixed bar; inputs ≥ 16px; "Save and add another" focuses Term before the request (as `AddTermDialog` does).
- **Accessibility (8.8):** `role="status"` on the duplicate note and saved message, focus to the heading on mount and to Term after "add another", chips are buttons with `aria-pressed`, every control labelled.
- **Push only from a tap, iOS Home Screen app only (8.8):** permission is requested inside the switch handler; an iOS Safari tab gets the Home Screen hint. Desktop browsers and Android get the row when `PushManager` exists.
- **Notification copy (8.6, section 6):** only Ready and Needs input; no "Being prepared", no automation words; `copy.test.ts` enforces it.
- **A Resend or push failure must not block delivery (8.6):** push failures are logged and ignored; the in-app card remains the source of truth.
- **Tour (8.9):** no new target, so `lib/tour/targets.ts` is untouched. The `import-routes` step copy is re-read: "Just one term" still describes the row.
- **Docs (8.9):** `docs/import.md`, `AGENTS.md`, new `docs/push.md`.

**New edge cases**

1. **Captured term lands in an inactive collection:** it appears in Library only; nothing reaches Read/Review/Quiz until the collection is active. In an active one a finished term ranks first in Review and Quiz (docs/trace.md), like any new term.
2. **Shared device after sign-out:** a subscription would keep delivering the previous user's topic to that device. Handled two ways: the upsert moves an endpoint to whoever enables push next, and logout best-effort removes this device's subscription first.
3. **Subscription goes stale:** web-push returns 404/410; the row is deleted on send. Email remains on by default, so nothing is lost silently.
4. **Duplicate sends:** `ready` for merged requesters fires once per delivery row (each their own user and subscriptions); `Resend email` doesn't re-push.
5. **Several devices:** all of a user's subscriptions get the push; cap 10 per user, oldest dropped.
6. **Badge drift:** the badge count in the payload is correct at send time; the Library mount effect re-syncs it on open (`key={count}`) and clears it at zero.
7. **Forged or malformed payload:** only our server can encrypt to a subscription, but the SW still validates (`parsePayload`), shows the generic fallback on garbage and refuses a cross-origin `navigate`.
8. **Push on, env missing:** `getPushConfig` returns null; the row is hidden and the admin sees the warning; no throw.
9. **Admin turns `push_enabled` off while people are subscribed:** sending stops at once; rows stay inert; the user's row disappears from Request-sent and Settings.
10. **Permission denied then changed in browser settings:** the row re-reads `Notification.permission` on mount, so it recovers on the next visit.
11. **iOS before 18.4:** no Declarative support; the SW `push` handler shows the notification. Below 16.4 the row shows the Home Screen hint or hides.
12. **`share_target` and the `/~offline` fallback:** the share is a GET navigation; with no network the offline page shows. Accepted.
13. **Dev can't test push:** the SW is disabled in development; test on a production build over HTTPS.

## 9. Tests

`pnpm check` and `pnpm test` pass at every release. Table-driven where there are cases. Logic lives in pure `.ts` files because Vitest runs in `node` only.

**Vitest (new)**

- `lib/jargon/capture/destination.test.ts`: preset valid/invalid, stored valid/deleted, none, one collection.
- `lib/jargon/capture/shared-input.test.ts`: URL-only, link inside text, title ignored, single word, three-word phrase, sentence, 500-character cap at a word boundary, two-line pair, list, empty and whitespace.
- `lib/jargon/capture/tokenize.test.ts`: apostrophes (`zzp'er`, `SLA's`, `don’t`), hyphens (`follow-up`, `e-mail`), digits (`5G`, `401(k)`, `Q3`), edge punctuation, emoji, Arabic/Cyrillic, empty.
- `lib/jargon/capture/selection.test.ts`: extend, shrink, jump, collapse, 8-word cap; `termFromSelection` keeps inner spacing.
- `lib/chrome.test.ts` (extend): `/jargon/capture` is a more path, not a dock path, back target excluded. Title test for `studyScreenTitle`.
- `app/(private)/jargon/capture/actions.test.ts` (pattern of `people/actions.test.ts`): bad uuid, empty term, not-your-collection returns no match, match found, `%` and `_` escaped, error returns `{ ok: false }`.
- `lib/push/payload.test.ts`: build/parse round trip, `web_push` 8030, missing title, cross-origin `navigate`, badge 0 and negative, non-object input.
- `lib/push/support.test.ts`: table of capability × permission × iOS × standalone → state.
- `lib/push/notification.test.ts`: payload → title/body/options, fallback on garbage, `pickWindowToFocus` prefers a same-origin window.
- `lib/push/send.test.ts` (mock `web-push`): 201 sent, 404 and 410 gone, 500 and timeout failed.
- `lib/admin/requests/notify-push.test.ts`: ready (three delivery kinds) and needs_input payloads, skip when disabled / no keys / no subscriptions, prune on gone, never throws, never touches `email_failed`, badge count.
- `app/(private)/admin/requests/actions.test.ts` (extend): ask and deliver call push; `resendRequestEmail` doesn't; `saveRequestSettings` accepts `pushEnabled`.
- `lib/requests/copy.test.ts`: automatically covers `REQUEST_COPY.push`.
- `lib/admin/audit-labels.test.ts` stays green (no new action name).

**SQL (hand-run like the existing ones)** `supabase/tests/push_subscriptions.sql`: anon and authenticated can't touch the table; `service_role` can select and delete; save inserts, re-save by the same user refreshes, re-save by another user moves the endpoint; 11th subscription drops the oldest; remove only affects the caller; has returns true/false; endpoint must be https and keys must be sized; deleting a user cascades; `push_enabled` is admin-updatable only. Re-run `collection_requests.sql` to prove the grant change didn't break settings.

**Manual / browser (preview tools, 375px and desktop, light and dim):** the flows in section 10. **Surface check:** a captured finished term appears in Read/Review/Quiz of an active collection; an unfinished one doesn't.

## 10. Device checklist

From plan section 10, only what phase 3 depends on:

- **The Android share target after install** (installed Chrome app): share a selected sentence, a link and a multi-line list from Chrome and from a notes app; check what lands in `text`/`title`/`url`.
- **Android shortcuts** after install and after the WebAPK updates.
- **Push from the "Notify me" tap:** iOS 18.4+ Home Screen app (Declarative), an iOS 16.4–18.3 Home Screen app (SW fallback), Android installed and in a Chrome tab, desktop Chrome and Safari. Check the app badge on each.
- **iOS Safari tab:** no switch, the Home Screen hint, and "Show me how".
- **The keyboard vs the Save buttons** on iPhone (iOS 26/27) and Android, with `interactive-widget` as already set.
- Capture page at 375px in the iOS Safari tab, the iOS Home Screen app and the Android tab, light and dim.
- **Request emails land in the inbox:** unchanged from phase 2; re-check only if the notify path changed (it adds push beside it).
- Not applicable: paste sources, file picker, 200-card scrolling, Paste button.

Flow to run: Android: install → share a sentence → tap a word → Save → open collection. iPhone: add to Home Screen → request a collection → enable notifications on the confirmation → admin Accept → Ask → notification arrives, tap opens the Library → reply → admin Deliver → notification opens the new collection; badge shows then clears. Then: turn notifications off in Settings, deliver another, confirm email only; log out and confirm the device stops receiving.

## 11. Rollout and back-out

| Release | Contents | Visible? | Back-out |
| --- | --- | --- | --- |
| **3a Capture page** | `/jargon/capture`, chooser row, chrome, copy move, docs | Yes | Revert the PR. Saved terms are ordinary terms. Never clean up with SQL deletes (term deletes wipe progress, reviews, narrations, evaluations, relationships and triage). |
| **3b Share target and shortcuts** | tokenizer, share intake, manifest | Android installed app only | Revert the PR. Android keeps old shortcuts until the WebAPK updates; a removed share target just stops appearing. |
| **3c-1 Push expand** | migration 4.1, SQL test, regenerated types | No | Forward-only. Nothing reads it yet. |
| **3c-2 Push** | dependency, SW handlers, send path, UI, admin switch, docs | Only after `push_enabled = true` **and** keys set | Switch off `push_enabled` (instant, no redeploy). To remove the UI, revert the PR. The table and SW handlers are inert. Purging subscriptions with `delete from push_subscriptions` is safe. |

Order: 3a and 3b are independent of 3c. 3c-1 must be released and applied **before** 3c-2 (the app deploys before migrations run, and 3c-2 reads `push_enabled`). Enable push only after the section 10 push checks pass on an iPhone Home Screen app and an Android phone.

**Owner steps before 3c-2 goes live:** generate a VAPID key pair, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (a `mailto:` address) in the hosting environment, then flip the admin switch. No `NEXT_PUBLIC_` variable and no CI change.

## 12. Task breakdown

Each step is independently reviewable. `pnpm test` after logic steps, `pnpm check` after each group.

**Setup**

0. Copy this plan to `plan-import-phase-3.md`. Files: `plan-import-phase-3.md`.
1. `pnpm install`; read the Next 16 docs in `node_modules/next/dist/docs/` for the manifest file (`share_target` typing), route handlers, server actions and `proxy.ts`; check `MetadataRoute.Manifest`. No files.

**Release 3a: capture page**

2. Pure modules and tests: `lib/jargon/capture/{destination,destination-pref,copy}.ts` + `destination.test.ts`. Files: `lib/jargon/capture/*`.
3. Duplicate check: `capture/actions.ts` + test, `hooks/use-capture-duplicate.ts`. Files: `app/(private)/jargon/capture/actions.ts`, `actions.test.ts`, `hooks/use-capture-duplicate.ts`.
4. Chrome: `/jargon/capture` in `isMorePath` and `studyScreenTitle`, tests. Files: `lib/chrome.ts`, `lib/chrome.test.ts`, `components/app/account-nav.ts`.
5. Capture UI and route: `page.tsx`, `loading.tsx`, `capture-flow.tsx`, `destination-chip.tsx`, `capture-duplicate-note.tsx`, `first-collection-form.tsx`, `capture-saved.tsx`; `PastedListPrompt` `source` prop; `add-term-dialog.tsx` uses the shared unfinished wording. Files: `app/(private)/jargon/capture/*`, `components/jargon/capture/*`, `components/jargon/pasted-list-prompt.tsx`, `components/jargon/add-term-dialog.tsx`.
6. Retarget "Just one term"; delete `one-term-dialog.tsx`; if `?add=1` has no remaining caller, remove it from `(collection)/page.tsx` and `jargon-page.tsx`. Files: `components/jargon/import/import-chooser.tsx`, `one-term-dialog.tsx`, `app/(private)/jargon/(collection)/page.tsx`, `components/jargon/jargon-page.tsx`.
7. Docs: capture section in `docs/import.md`, a line in `AGENTS.md`.
8. Verify: `pnpm check`, `pnpm test`, browser flow at 375px and desktop, light and dim.

**Release 3b: share target and shortcuts**

9. Tokenizer, selection, share intake and tests. Files: `lib/jargon/capture/{tokenize,selection,shared-input}.ts` + tests.
10. Shared-sentence UI and page wiring (`?text=`). Files: `components/jargon/capture/shared-sentence-chips.tsx`, `capture-flow.tsx`, `app/(private)/jargon/capture/page.tsx`.
11. Manifest: `share_target` (GET, `title`/`text`/`url`, action `/jargon/capture`) and shortcuts Add a term, Paste a list, Read, Review (Quiz removed). Files: `app/manifest.ts`.
12. Docs and the device pass (Android).

**Release 3c-1: push expand**

13. Migration 4.1 + `push_subscriptions.sql`; regenerate `lib/supabase/database.types.ts` (`pnpm supabase:types`). Files: `supabase/migrations/20261003100000_push_subscriptions.sql`, `supabase/tests/push_subscriptions.sql`, `lib/supabase/database.types.ts`.

**Release 3c-2: push**

14. Dependency: `web-push` and `@types/web-push`; `.env-template` entries. Files: `package.json`, `pnpm-lock.yaml`, `.env-template`.
15. Pure push modules and tests: `lib/push/{payload,support,notification,config}.ts` + tests; `REQUEST_COPY.push`. Files: `lib/push/*`, `lib/requests/copy.ts`.
16. Sender and notify path: `lib/push/send.ts`, `lib/admin/requests/notify-push.ts`, `notify.ts` option, `resendRequestEmail` passes `push: false`; tests. Files: `lib/push/send.ts`, `lib/admin/requests/notify.ts`, `notify-push.ts`, `app/(private)/admin/requests/delivery-actions.ts`, `actions.test.ts`.
17. User actions: `app/(private)/jargon/actions-push.ts` + test.
18. Service worker: `push` and `notificationclick` handlers. Files: `app/sw.ts`.
19. Client: `hooks/use-push-support.ts`, `useInstall()` export, `push-toggle-row.tsx`, `RequestSent` row (the page passes the public key down through `RequestForm`), `app-badge-sync.tsx` on the Library, `lib/push/device.ts` called before logout in `profile-menu.tsx` and `study-phone-more-sheet.tsx`. Files: `hooks/use-push-support.ts`, `components/pwa/install-prompt.tsx`, `components/push/*`, `components/requests/request-sent.tsx`, `request-form.tsx`, `app/(private)/jargon/import/request/page.tsx`, `components/jargon/profile-menu.tsx`, `components/app/study-phone-more-sheet.tsx`, `app/(private)/jargon/(collection)/page.tsx`.
20. Settings panel: `notifications-panel.tsx`, `SettingsTabId`, page wiring. Files: `components/jargon/settings/{notifications-panel,ui-layout}.tsx`, `app/(private)/jargon/settings/page.tsx`.
21. Admin switch and warning. Files: `components/admin/requests/requests-settings.tsx`, `lib/admin/requests/queries.ts`, `app/(private)/admin/requests/delivery-actions.ts`.
22. Docs: `docs/push.md` (VAPID setup, payload, switches), push section in `docs/import.md`, `docs/admin.md` row, `AGENTS.md` lines.
23. Verify: `pnpm check`, `pnpm test`, SQL tests, production-build device pass (section 10); then set the keys and enable.

## 13. Open questions for the owner

Answered in this session: **(a)** shortcuts are Add a term, Paste a list, Read, Review; **(b)** no global "+"; **(c)** admin switch plus env keys.

Defaults chosen; change any you disagree with:

1. **The route is `/jargon/capture`, not `/capture`**, so it gets the app chrome and hides the dock while you type.
2. **Capture destination check is per collection**, matching the unique index. The same word in two collections is allowed.
3. **Admin isn't told when a requester replies to a question.** That gap exists today (no email or push to admins on a reply). Say if you want a notice; it would be a small admin email plus a Overview item.
4. **Push is per device, not per request.** Turning it on sends every Ready / Needs input for that user to that device. Email stays a per-request switch. A per-request push choice would need a changed `my_list_collection_requests` shape.
5. **No public-page wording for push or capture.** `before-you-sign-up` is static and requests may be off; the request privacy and FAQ lines are still held back from phase 2 (turn them on with requests). Say if you want a capture line there now.
6. **Capture has no "More details".** Category, notes and links stay in the in-collection sheet. Say if capture needs them.
7. **The `entry = 'capture'` import value stays unused.** Capture writes no batch row.
8. **Logout removes this device's push subscription** (best effort) so a shared phone doesn't keep showing the previous person's topic.

No question blocks starting 3a.
