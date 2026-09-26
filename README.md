# Jargon Gym

A private, invite-only app for learning industry jargon you can
actually use — not just recognize. Import term lists into collections (or start
with built-in ones), mark what you already know, review a ranked queue when you
feel like it, and quiz when you want a check-in. No due dates — there's an
optional streak badge, but nothing punishes you for breaking it.

Terms go beyond one-line definitions: optional example, mental model,
in-practice notes, anti-example, debated angles, a freeform note, and links
to related terms.
Known/unknown isn't set by hand — it's read off how well you've actually
retained a term, and fades again if you stop practicing it.

The same TRACE ranking powers Read, Review, and Quiz across every
surface — web, Telegram bot, and macOS desktop widget — not random shuffle,
and not spaced repetition with future review dates. Collection browse picks
its own way and doesn't use the ranking.

See the landing page for how to request an invitation.

## Documentation

- [TRACE scoring engine](docs/trace.md) — scoring, outcomes, and how picking
  works across surfaces
- [Telegram bot setup](docs/supabase/telegram-setup.md) — webhook, secrets, and
  Edge Function deployment
- [Narration sync cron](docs/supabase/narration-sync-cron.md) — Dashboard job
  that continues admin audio generation after the first invoke
- User-facing guide at `/how-terms-work` (term structure, how known/unknown
  status is computed) when the app is running — linked from the landing page
  and site footer

## Prerequisites

- Node.js 24
- [pnpm](https://pnpm.io/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) for local database and
  auth

## Local development

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy environment variables:

   ```bash
   cp .env-template .env.local
   ```

3. Start Supabase locally and fill `.env.local` from the CLI output:

   ```bash
   pnpm supabase:start
   pnpm supabase:status
   ```

4. Apply migrations (resets local data):

   ```bash
   pnpm supabase:reset
   ```

5. Run the dev server:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

Regenerate TypeScript types after schema changes:

```bash
pnpm supabase:types
```

## Scripts

| Command                                   | Purpose                                                      |
| ----------------------------------------- | ------------------------------------------------------------ |
| `pnpm dev`                                | Start Next.js in development                                 |
| `pnpm build`                              | Build widget zip and production app                          |
| `pnpm check`                              | Lint, format check, type-check, and unused-code check (knip) |
| `pnpm supabase:start` / `stop` / `status` | Local Supabase lifecycle                                     |
| `pnpm supabase:reset`                     | Reset local DB and run migrations                            |
| `pnpm widget:zip`                         | Package the macOS desktop widget                             |
| `pnpm widget:link`                        | Symlink the widget into Übersicht                            |

## Tech stack

Next.js 16, React 19, Supabase (Postgres + Auth), Tailwind CSS 4, DaisyUI,
TypeScript.

## Project layout

| Path               | Role                                      |
| ------------------ | ----------------------------------------- |
| `app/`             | Next.js routes (auth, jargon UI, API)     |
| `components/`      | React UI                                  |
| `lib/trace/`       | TRACE scoring — decay, recall, mastery    |
| `lib/trace-queue/` | Term-picking pipeline built on TRACE      |
| `lib/jargon/`      | Term cards, outcomes, known/unknown state |
| `lib/study/`       | Collection scope and study pool wrapper   |
| `lib/telegram/`    | Telegram bot flows                        |
| `widget/`          | macOS Übersicht desktop widget            |
| `supabase/`        | Migrations and Edge Functions             |
| `docs/`            | Internal documentation                    |
