# Jargon Gym

A private Next.js app for learning industry jargon. Import term lists into
collections, mark what you already know, review with flashcards, and quiz
yourself when you want a check-in. Study surfaces share one smart review queue
— not random shuffle, and not spaced repetition with due dates.

The app is invite-only. See the landing page for how to request access.

## Documentation

- [Smart review queue](docs/smart-queue.md) — how term picking, scoring, and
  outcomes work across web, Telegram, and the desktop widget
- [Telegram bot setup](docs/supabase/telegram-setup.md) — webhook, secrets, and
  Edge Function deployment
- User-facing guide at `/smart-queue` when the app is running (linked from the
  site footer)

## Prerequisites

- Node.js 20+
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

| Command                                   | Purpose                             |
| ----------------------------------------- | ----------------------------------- |
| `pnpm dev`                                | Start Next.js in development        |
| `pnpm build`                              | Build widget zip and production app |
| `pnpm check`                              | Lint, format check, and type-check  |
| `pnpm supabase:start` / `stop` / `status` | Local Supabase lifecycle            |
| `pnpm supabase:reset`                     | Reset local DB and run migrations   |
| `pnpm widget:zip`                         | Package the macOS desktop widget    |
| `pnpm widget:link`                        | Symlink the widget into Übersicht   |

## Tech stack

Next.js 16, React 19, Supabase (Postgres + Auth), Tailwind CSS 4, DaisyUI,
TypeScript.

## Project layout

| Path               | Role                                      |
| ------------------ | ----------------------------------------- |
| `app/`             | Next.js routes (auth, jargon UI, API)     |
| `components/`      | React UI                                  |
| `lib/smart-queue/` | Review queue scoring and pick pipeline    |
| `lib/jargon/`      | Term cards, outcomes, known/unknown state |
| `lib/study/`       | Collection scope and study pool wrapper   |
| `lib/telegram/`    | Telegram bot flows                        |
| `widget/`          | macOS Übersicht desktop widget            |
| `supabase/`        | Migrations and Edge Functions             |
| `docs/`            | Internal documentation                    |
