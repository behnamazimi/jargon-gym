# End-to-end tests

Playwright drives a production build of the app (`next build` + `next start`)
against the local Supabase stack. Paid third parties (the model, Resend, Murf,
ElevenLabs) are replaced by a small stub server, so nothing leaves the machine.

## Running

Start Supabase first (`pnpm supabase:start`); the tests read its credentials from
`pnpm supabase status`. They never reset the database: every test creates its own
user, so your local data is left alone.

```bash
pnpm e2e:install          # once: downloads Chromium
pnpm test:e2e:smoke       # hot paths, what every pull request runs
pnpm test:e2e             # everything
pnpm test:e2e:ui          # Playwright's UI mode
```

The first run builds the app into `.next-e2e` (so it never touches a running
`next dev`). Set `E2E_SKIP_BUILD=1` to reuse the last build while writing tests.
In CI set `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`,
`E2E_SUPABASE_SERVICE_ROLE_KEY` and `E2E_DB_URL` to skip the CLI lookup.

## Layout

| Path                   | What it holds                                                                  |
| ---------------------- | ------------------------------------------------------------------------------ |
| `playwright.config.ts` | Projects, web servers, reporters                                               |
| `e2e/tests/*.spec.ts`  | One file per feature area. Tests tagged `{ tag: "@smoke" }` are the hot paths  |
| `e2e/auth.setup.ts`    | Signs an admin in once and saves it to `e2e/.auth/admin.json` (gitignored)     |
| `e2e/fixtures.ts`      | `test` with a signed-in `user`, declined analytics, and a page-error guard     |
| `e2e/support/`         | Env, direct database access (`sql`), users, seeding, credits, stub client      |
| `e2e/stubs/server.mts` | The third-party stub (Gemini, Resend, Murf, ElevenLabs) and its control routes |

Projects: `setup`, `chromium` (everything) and `mobile` (a Pixel 7 profile that
runs only `@smoke`, because phone and desktop navigation differ).

## Writing a test

- Ask for the `user` fixture to get a fresh, invite-verified member already
  signed in. Use `seedCollection(user)` to give them ten finished terms.
- Wait for hydration before typing: open pages with `gotoReady`, otherwise React
  can reset a field that was filled too early.
- Assert on stored state with `expect.poll(() => sql(...))`. Server actions finish
  after the UI updates, so a plain query right after a click can race.
- Locate by role and label. There are no test ids. Options in the quiz are
  visually hidden radios, so click their `label`.
- Never assert on global counts. Workers share one database; scope every query
  by the user or collection the test created.
- Anything that mutates shared state (provider switches, prices) does not belong
  in a parallel test.

## Why the database needs `sql`

`service_role` has no table grants, so seeding goes through a direct Postgres
connection (`e2e/support/db.ts`) and the auth admin API. A member needs an invite
code to exist at all (`handle_new_user`), so `createUser` first inserts a fresh
single-use `referral_codes` row. The seeded `WELCOME1-3` codes work once per
reset and are not used.

## The stub server

The app is pointed at it through optional base-URL variables that are unset in
every real environment: `LLM_BASE_URL`, `RESEND_BASE_URL`, `MURF_BASE_URL`,
`ELEVENLABS_BASE_URL` (see `appEnv` in `e2e/support/env.ts`).

- Quiz and story answers are built from the request itself, so they stay valid
  for whichever terms a test seeded.
- A term whose name contains `E2E_FAIL` (`LLM_FAIL_MARKER`) makes the model call
  fail. Use it to test refunds without affecting parallel tests.
- `stub.outbox()` returns the emails sent; filter by your own user's address.

## Known quirks

- A blocked service worker makes Serwist throw "reading 'waiting'". The fixtures
  ignore exactly that message; `pwa.spec.ts` turns service workers back on.
- A new browser context made with `browser.newContext()` inherits the test's
  `storageState`. Pass `{ cookies: [], origins: [] }` to start signed out.
- Creating a first collection on `/app/capture` leaves the old form on screen
  until a reload; that test is `fixme`.

## CI

`.github/workflows/e2e.yml` runs `@smoke` on pull requests that touch app code,
and the full suite in two shards on pushes to `main` and nightly, merging the
blob reports into one HTML report.
