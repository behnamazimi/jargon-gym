# Rebrand: Jargon Gym → Lobyas

Agreed 2026-10-03. The goal is an ownable brand name; the product's positioning
stays the same.

Reviewed 2026-10-03 against the code. Items marked **(review)** were added or
corrected in that review. The choices it raised are settled under "Decisions
from the review" at the end.

## Brand and copy

- **Name:** "Lobyas" in prose and UI, "lobyas" in identifiers, slugs and keys.
- **Removing "jargon":** it comes out of user-facing copy, and "terms" is the
  umbrella word. Literal uses stay: the request kind "Jargon", the quiz
  prompt's "real jargon", and "a new job's jargon".
- **Taglines:**
  - Home `<title>`: "Lobyas: a better way to learn terms and vocabulary"
  - Default site title, OG card and the line under the name: "Lobyas: learn the terms that stick"
  - Inner pages: "\<Page\> | Lobyas"
- **PWA and meta description:** "Learn the terms of any field or language well
  enough to actually use them: read, review, and quiz until they stick."
- **/collections intro:** "Terms from fields and languages, explained in plain
  language."
- **Hero:** the headline stays, and only the name changes in the body ("…Lobyas
  explains them, then drills you until they stick.").
- **Other copy:** the landing AI section, before-you-sign-up and how-terms-work
  get the same treatment. The wording is reviewed in PR 3.
- **Icon:** a single "L" with the current colours and shape (white on
  `#3f4755`). It replaces "JG" in `lib/brand-icon.tsx`, so the favicon, the PWA
  and Apple icons, and the header icon all change.
- **Copy guard (review):** `lib/requests/copy.ts` and its test keep enforcing
  the no-admin/no-automation wording. Add "jargon" to the checked list so it
  can't creep back into user-facing strings outside the literal uses above.

## External identity

- **Domain:** lobyas.com is canonical. On `lobyas.com`, `proxy.ts`
  redirects page requests to the same path on lobyas.com, while `/api/*` keeps
  answering on both hosts. The widget posts with Python `urllib`, which doesn't
  follow 307/308 on POST, so Vercel's built-in domain redirect can't be used.
  - **(review)** `proxy.ts` currently only calls `updateSession`. The redirect
    is host-based: it applies only when the host is exactly
    `lobyas.com`, so local dev, preview deployments and other
    `*.vercel.app` hosts never redirect (no loops).
  - **(review)** The old host keeps answering, without redirect: `/api/*`,
    `/downloads/*`, `/auth/*` (in-flight magic links and password-reset
    emails), and the cron and webhook paths.
  - **(review)** Set a canonical URL on lobyas.com and update `app/sitemap.ts`,
    `app/robots.ts` and `app/manifest.ts` so the old host isn't indexed as a
    duplicate.
- **Email sender:** `Lobyas <info@lobyas.com>` (today `lib/email/resend.ts` uses
  `info@lobyas.com`), and info@ is a monitored inbox.
  - **(review)** A new sending domain starts with no reputation. Verify
    SPF/DKIM/DMARC in Resend first and send a test to a few mailboxes before
    switching.
- **Telegram:** a new bot with a new @username. The old bot is retired. There's
  no goodbye message. Clearing `telegram_links` follows the safe procedure in
  "Production data safety", not a plain truncate in a migration.
  - **(review)** When the old bot is retired, also delete its webhook and stop
    `telegram-send-due` from sending to old links, or the cron keeps logging
    failures.
- **Renames:** the GitHub repo, the Vercel project, the Supabase project
  display name, `package.json` name, `.claude/launch.json`, and
  `supabase/config.toml` `project_id`. The last one wipes the local DB, so
  re-seed afterwards. **(review)** Also check CI and docs for local container
  names such as `supabase_db_jargon-gym`. `.claude/launch.json` is done in PR 2.
- **Skills:** in `behnamazimi/skills`, `jargon-gym-generator` becomes
  `lobyas-generator`, `jargon-gym-review` becomes `lobyas-review`, and
  `language-gym-generator` becomes `lobyas-language-generator`. The import UI
  (`import-llm-prompt-helpers.ts`) is updated in the same release.
- **Users:** told personally. There's no in-app announcement. The message
  covers: new address, signing in again on the new address, reconnecting
  Telegram, reinstalling the widget, and reinstalling the PWA if the app id
  changes (see Routes).

## Routes

- **Private app:** `/jargon/*` moves to `/app/*`, with the library at
  `/app/library`.
- **Redirects:**
  - `/app` → `/app/library`
  - `/jargon` → `/app/library` (keeping `?domain=`)
  - `/jargon/:path*` → `/app/:path*`

  These are permanent and kept indefinitely, because installed widgets and
  already-sent Telegram messages and emails link to `/jargon/*`.
  - **(review)** They go in `lib/redirects.ts` next to the existing legacy
    admin redirects. That file uses non-permanent redirects on purpose, so a
    mistaken redirect isn't cached by browsers. Switching to `permanent: true`
    is a deliberate step. Decided: ship as temporary (307) first, confirm every old link
    type works, then flip to permanent in a later release.
  - **(review)** Order matters: the `/jargon` rule must come before the
    `/jargon/:path*` catch-all, or `/jargon` takes two hops.

- **Public collections:** `/j/*` moves to `/collections/*` with no redirect,
  since those pages aren't indexed yet.
- **Follow-on updates:** `AUTHENTICATED_HOME_PATH`, `PWA_START_URL`, `PWA_ID`,
  tour chapter `route`s (`lib/tour/chapters/`), promo hrefs, and links in the
  Telegram bot, the widget, emails and request cards.
- **PWA identity (review):** `PWA_ID` is `"/jargon?source=pwa"` in
  `lib/pwa.ts`. Browsers treat a changed manifest id as a different app, so
  existing installs may not update and may duplicate. Decided: keep the old id
  (it is only an identifier), so no reinstall is needed.
- **Service worker (review):** `app/sw.ts` precaches routes. Bump the cache
  version in the routes release, and test an installed PWA and an open tab
  across the cutover (old cached `/jargon/*` pages must redirect, not 404).

## Code structure

Split up `lib/jargon`, `components/jargon` and `app/api/jargon`:

- Library and collections code goes to `lib/library` and `components/library`:
  the library sidebar, `jargon-page` (renamed to `library-page`), `domain-*`,
  `shared-domains-*`, `collection-*` and `library-filters`.
- The term model goes to `lib/terms` and `components/terms`.
- `read`, `quiz`, `review`, `import`, `capture`, `settings`, `mastery`,
  `triage` and `export` each move to the top level, next to the existing
  `lib/quiz`, `lib/read` and `lib/review`.
- The API moves to `/api/terms/*` and `/api/collections/*` in PR 2, not PR 1,
  because it changes fetch URLs. PR 1 leaves `app/api/jargon/**` in place.
- `review-outcome.ts` lives in `lib/terms/`; `study/` components live in
  `components/read/study/`; generic shared components in `components/shared/`.
- The request kind value `'jargon'` and `not_jargon_or_vocabulary` stay in the
  DB, since those mean literal jargon.
- **(review)** PR 1 also updates path references in `AGENTS.md`, `docs/*.md`,
  `knip.json` and `.oxlintrc.json`, so docs and tooling don't point at missing
  paths between PR 1 and PR 3. Use `git mv` and keep the commit mechanical.

## Storage, secrets and widget

- **localStorage:** `jargon-gym:*` becomes `lobyas:*`, with no migration. Ship
  when nobody is mid-review, because unflushed review pending writes are
  dropped. **(review)** The same applies to in-progress quiz sessions
  (`lib/quiz/session-storage.ts`) and import drafts
  (`lib/jargon/import/draft-store.ts`); mention it to users.
- **Cookies:** `jg_lib_filters`, `jg_lib_domain` and `jg_rv` become `lb_*`.
  Users lose their saved filters once. That is accepted.
- **Encryption salt:** `jargon-gym-llm-settings` in `lib/llm/encryption.ts`.
  **Decided: keep it.** It is an internal string nobody sees, and changing it
  would make every saved API key undecryptable. If it is ever changed, follow
  the gate in "Production data safety".
- **Widget:**
  - `jargon-gym.widget` becomes `lobyas.widget`, for the folder, the zip and
    the install path.
  - The label "💡 Jargon" becomes "💡 Term".
  - `LOBYAS_WIDGET_TOKEN` and `LOBYAS_BASE_URL` become `LOBYAS_WIDGET_TOKEN`
    and `LOBYAS_BASE_URL`.
  - Bump `widget/version.json` to 9 (it is 8 today).
  - The installer removes a leftover `jargon-gym.widget` and carries over its
    saved token.
  - **(review)** Keep serving `/downloads/jargon-gym.widget.zip` (or redirect
    it) and keep `public/install-widget.sh` working for old install commands.
    Already-installed widgets keep posting to the old host, which is why
    `/api/widget/*` stays answering there.
- **Committed tokens (review, corrected):**
  - Tokens are committed in two places: `package.json` (`widget:install`) and
    `widget/jargon-gym.widget/config.json`. `config.json` is already in
    `.gitignore` but is tracked, so ignoring it does nothing. Run
    `git rm --cached` on it.
  - Before revoking, check in the widget-token table whether either token
    belongs to a real user's installed widget. Revoking one that does breaks
    that widget silently.
  - Then revoke in Settings → Widget, read the token from the shell in
    `widget:install`, add `config.example.json`, and gitignore `config.json`.
  - The tokens stay in git history, so revocation is the actual fix.

## Production data safety (review)

The production database holds real users' data. Rules for the whole rebrand:

- **PR 1 has no migrations and no DB changes.**
- **Additive first.** Vercel deploys and migrations are not atomic, so every
  migration must work with both the old and the new code running.
- **Never rename DB values or objects:** the `kind` check constraint values,
  `decline_reason` values, function names and column names stay as they are.
- **Backup before each production deploy** that includes a migration: a
  Supabase backup or `pg_dump`, with the restore path tested once.
- **Rehearse on a Supabase branch database** with production-shaped data
  before running any migration on production.
- **Every migration documents its rollback** in the PR (revertible or not, and
  how).
- **No ad-hoc SQL against production.** If manual SQL is needed, the exact
  statement is written into the PR first.
- **Checks to run (read-only) before PR 2:**
  - Stored old URLs: search text columns (stories, request cards, delivery or
    notification records, widget data) for `/jargon`, `/j/` and
    `lobyas.com`. Absolute URLs in rows mean the old host must keep
    serving those paths.
  - Tour progress: `user_settings.tour_seen` stores chapter ids. Keep ids
    unchanged when routes change, and verify no id contains a route or the
    word "jargon". Renaming ids replays the tour for every user.
  - Widget tokens: which rows exist and who owns them (see Committed tokens).
- **Telegram links.** Do not truncate `telegram_links` in the same release
  that ships the new bot code.
  1. Create the new bot and ship code that uses it.
  2. Snapshot the table (`pg_dump` of `telegram_links`).
  3. Move the rows aside (rename to `telegram_links_old` and create an empty
     table) so they can be restored, rather than deleting them.
  4. Drop the backup table only after the old bot is retired and a safe period
     has passed.
- **Encryption salt (only if changed).** Hard deploy gate: re-run
  `select count(*) from user_settings where api_key_encrypted is not null`
  immediately before deploying, and abort if it is not 0. The code should fail
  loudly on a row that doesn't decrypt, not silently.
- **Supabase auth URLs.** Add lobyas.com to Site URL and redirect URLs
  alongside the old host. Remove the old entries much later, after in-flight
  emails have expired.
- **Project display-name rename** is harmless. `supabase/config.toml`
  `project_id` only affects the local stack.

## Shipping

1. **PR 1: folder split.** Pure file moves and import rewrites, no behaviour
   change, no DB change. Includes doc, `knip.json` and `.oxlintrc.json` path
   updates.
2. **PR 2: routes and plumbing.** `/app/*`, `/collections`, redirects (temporary
   first), tour routes, the old-host proxy, storage keys, service-worker cache bump. The widget v9 and token cleanup move to PR 2b
   (decided), since they are the part that can break installed clients.
   2b. **PR 2b: widget.** Widget v9, the rename to `lobyas.widget`, installer
   migration and token cleanup.
3. **PR 3: brand.** Name, copy, taglines, icon, email sender, Telegram copy,
   skill names, README, `docs/` and `AGENTS.md`.

**Rollback (review):** if lobyas.com misbehaves after PR 2, remove the
old-host redirect in `proxy.ts` (the routes keep working on both hosts). Redirects
shipped as temporary can be reverted without browser caching. Migrations are
reverted per their documented rollback.

## Manual ops checklist

Before PR 2 ships:

- [ ] Add lobyas.com to Vercel, and keep `lobyas.com` attached
- [ ] Verify lobyas.com in Resend (SPF/DKIM/DMARC) and send test emails
- [ ] Set `APP_BASE_URL=https://lobyas.com` in Vercel and in the Supabase function secrets
- [ ] Add lobyas.com to the Supabase auth Site URL and redirect URLs (keep the old ones)
- [ ] Run the read-only production checks in "Production data safety"
- [ ] Take and test a database backup
- [ ] Rehearse the migrations on a Supabase branch database
- [ ] Check which widget tokens belong to real users

At cutover:

- [ ] Set `LEGACY_HOST_REDIRECT_TO=https://lobyas.com` in Vercel (the old-host redirect in `proxy.ts` stays off while it is unset), after lobyas.com is attached and working
- [ ] Update CI `WIDGET_PRODUCTION_URL` and the narration sync cron URL
- [ ] Create the new Telegram bot in BotFather, update `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`, and set the webhook
- [ ] Move `telegram_links` aside (see the procedure above)
- [ ] Revoke the committed widget tokens

After cutover:

- [ ] Retire the old bot and delete its webhook
- [ ] Rename the GitHub repo and update the local remote
- [ ] Rename the Vercel project and the Supabase project display name
- [ ] Rename the skills in `behnamazimi/skills`
- [ ] Re-seed the local DB after the `project_id` change
- [ ] Message the users: new address, sign in again, reconnect Telegram, reinstall the widget
- [ ] Later: switch redirects to permanent, remove old auth redirect URLs, drop `telegram_links_old`

## Decisions from the review

Settled 2026-10-03, taking the recommended option for each:

1. The encryption salt stays `jargon-gym-llm-settings`. No salt change, so no
   saved API key is affected.
2. `PWA_ID` stays `"/jargon?source=pwa"`. It is only an identifier, and keeping
   it avoids duplicate installs.
3. The `/jargon` redirects ship as temporary (307) first and are made
   permanent in a later release.
4. The widget and token cleanup is its own PR (PR 2b), separate from the
   routes work.
