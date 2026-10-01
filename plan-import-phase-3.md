# Import flow, phase 3: Capture

Written 2026-10-01. Built in two releases on this branch.

## Decision: no push notifications

The owner dropped web push (service-worker handlers, VAPID keys, subscriptions, badges, admin switch) as overkill for this product. Requesters keep getting the **email** notifications that phase 2 already sends (Ready, Needs input, delay, decline). The earlier plan for push is not built and its migration was reverted. Nothing in phase 3 touches requests, notifications or the database.

## Releases

- **3a Capture page** (`/jargon/capture`): Term, optional Definition, collection chip remembered per device, Save / Save and add another, duplicate check as you type (`findCaptureDuplicate`, chosen collection only), multi-line paste hand-off to the paste importer, "Name your first collection". The chooser's "Just one term" row links to it; `OneTermDialog` and the `?add=1` plumbing were removed. The route is under `/jargon` so it gets the app chrome (more path, dock hidden, title "Add a term").
- **3b Share target and shortcuts**: Android installed app only. `share_target` (GET to `/jargon/capture`), a shared sentence shows its words as chips (`tokenize`, `selection`, `parseSharedInput`), the tapped words become the term and the sentence the example. Shortcuts: Add a term, Paste a list, Read, Review (Quiz removed, Android shows at most four).

## Decisions kept

No global "+". No migration. Capture reuses `createTerm` and `createEmptyCollection`; a term without a definition is saved unfinished. No AI.

## Deferred

Offline capture queue, Apple Shortcut, bookmarklet (phase 4); "More details" on capture; focusing the existing term from "Open it"; a capture draft; a duplicate check on a term prefilled from a share (the save error covers it).

## Tests

Vitest: `destination`, `tokenize`, `selection`, `shared-input`, `chrome`, and the `findCaptureDuplicate` action. `pnpm check` and `pnpm test` pass.

## Device checklist

Android installed app: share a sentence, a link and a multi-line list from Chrome and a notes app; check shortcuts after the WebAPK updates (a reinstall may be needed). Capture page at 375px with the keyboard open on iPhone and Android.

## Rollout and back-out

Revert the PR. Saved terms are ordinary terms; never clean up with SQL deletes (term deletes cascade through progress, reviews, narrations and triage). Android keeps old shortcuts until the WebAPK updates.
