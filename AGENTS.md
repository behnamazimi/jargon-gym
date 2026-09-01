<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UI components

Use DaisyUI components.

# Validating changes

After finishing a change, run `pnpm check` (lint + format check + type-check + knip) and fix anything it flags before considering the change done.

# Scoring engine (TRACE)

Read, Review, and Quiz are all driven by TRACE, the scoring engine that
picks which term to show next and computes mastery
(`lib/trace/`, `lib/trace-queue/`, `lib/jargon/review-outcome.ts`, and the
Read/Review/Quiz server actions). When a task requires actually understanding
how it works — the memory traces, mastery blend, ranking rules, or which
layer owns what — read [docs/trace.md](docs/trace.md) in detail rather than
guessing from the code alone.

# Telegram bot

The Telegram bot's app-side logic lives in `lib/telegram/`: `flows.ts` is
the update router (dispatches commands/callbacks, does not itself contain
command logic), `commands.ts` parses and handles top-level commands,
`delivery-flow.ts` / `quiz-flow.ts` / `review-flow.ts` hold the Read/Quiz/
Review flows, `presentation.ts` + `copy.ts` format outgoing messages, and
`transport.ts` builds the `TelegramAction` DTOs that get sent. It calls the
same `lib/jargon/review-outcome.ts` and `lib/trace-queue` functions the web
app uses, so scoring behavior stays identical across both surfaces. The
Supabase Edge Functions that actually receive/send Telegram HTTP traffic are
in `supabase/functions/telegram-webhook` and
`supabase/functions/telegram-send-due`; see
[docs/supabase/telegram-setup.md](docs/supabase/telegram-setup.md) for setup
and the manual test matrix.
