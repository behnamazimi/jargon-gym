# Implementation Summary: Telegram & shared review core

## Architecture (current)

```
Telegram → Edge telegram-webhook / telegram-send-due (thin transport)
         → POST /api/internal/telegram/{handle,send-due}
         → lib/telegram/flows + lib/jargon/* + lib/smart-queue/*
         → TelegramAction DTOs executed by Edge
```

Web quiz/review and Telegram share the same domain modules:

| Concern                                | Module                           |
| -------------------------------------- | -------------------------------- |
| Smart queue pick / score / record      | `lib/smart-queue/`               |
| Quiz/review/mark-known/skip outcomes   | `lib/jargon/review-outcome.ts`   |
| Term delivery (`/next`, cron)          | `lib/jargon/term-delivery.ts`    |
| Collection stats (`/stat`)             | `lib/jargon/collection-stats.ts` |
| Distractors                            | `lib/quiz/distractors.ts`        |
| Telegram session + quiz wizard         | `lib/telegram/session-store.ts`  |
| Telegram presentation (HTML/keyboards) | `lib/telegram/presentation.ts`   |

## Telegram features

- **Commands:** `/start`, `/next`, `/quiz`, `/stat`
- **Quiz:** Guided setup or `/quiz [known|unknown] [all\|uuid] [count\|all]`
- **Session state:** Persisted in `telegram_links.quiz_session` / `quiz_setup` JSONB (30 min timeout)
- **Cadence pushes:** Cron → Edge → Next `send-due` → `deliverNextTerm`

## Web quiz simple mode

- `lib/quiz/generate-simple.ts` + shared `lib/quiz/distractors.ts`
- Same outcome path as Telegram via `applyQuizAnswer`

## Edge survivors (transport only)

- `supabase/functions/telegram-webhook/index.ts`
- `supabase/functions/telegram-send-due/index.ts`
- `supabase/functions/_shared/telegram-api.ts`
- `supabase/functions/_shared/inline-keyboard-tracker.ts`
- `supabase/functions/_shared/env.ts`
- `supabase/functions/_shared/supabase-admin.ts`
