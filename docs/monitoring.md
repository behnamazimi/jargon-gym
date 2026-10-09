# DevOps monitoring (Telegram)

A separate Telegram bot posts the things that need a human to a private ops
chat. It is not the Lobyas learner bot (`lib/telegram/`): that bot's token is on
Vercel and in the Supabase Edge secrets, and a monitor must not depend on the
app it watches. The ops bot only sends; it has no webhook.

## What reaches the chat

| Alert                        | Source                            | When                                                                           |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| CI failed on `main`          | `.github/workflows/notify.yml`    | A push to `main` fails. Names the failed jobs.                                 |
| CI green again               | same                              | The first green run after a failed one.                                        |
| Production deployed / failed | same                              | `Deploy production` finishes. Covers the migration push and the Vercel deploy. |
| Many AI requests refunded    | `.github/workflows/ai-health.yml` | Every 3 hours, when `refundsLookHigh` is true. Repeats until it clears.        |
| AI health check couldn't run | same                              | The app was unreachable or the secret is wrong.                                |
| Site or database down        | External uptime probe             | `GET /api/health` stops answering 200.                                         |

Pull request runs are left out on purpose: the author already sees them.

## Setup

1. In [@BotFather](https://t.me/BotFather) run `/newbot` for a new bot, not the learner bot.
2. Add the bot to a private chat or group, send a message, then read the chat id
   from `https://api.telegram.org/bot<token>/getUpdates`.
3. Add these GitHub repository secrets:
   - `TELEGRAM_OPS_BOT_TOKEN` and `TELEGRAM_OPS_CHAT_ID`
   - `APP_URL`: the public origin, e.g. `https://lobyas.com`
   - `AI_INTERNAL_SECRET`: the same value the app uses (see
     [narration-sync-cron.md](supabase/narration-sync-cron.md))
4. Create an uptime monitor (Better Stack, UptimeRobot, …) on
   `https://<app>/api/health`, expecting HTTP 200, and connect its Telegram
   integration to the same chat.

Without the two `TELEGRAM_OPS_*` secrets the scripts skip sending, so forks stay green.

## Pieces

- `scripts/notify-telegram.sh` sends `$MESSAGE`. Both workflows use it.
- `app/api/health/route.ts` is public. It does one small database read and
  returns `{ ok }` with 200 or 503, and nothing else.
- `app/api/internal/ai-health/route.ts` returns the last day's refund counts
  (`lib/ai-credits/refund-snapshot.ts`). It takes `AI_INTERNAL_SECRET` as a
  bearer token. The rule is the one the admin overview uses
  (`lib/ai-credits/health.ts`), so the chat and the admin panel agree.

## Adding an alert

Prefer a signal that already exists and a message with one link to act on. Add
the workflow or route, send through `scripts/notify-telegram.sh`, and add a row
to the table above. Alert on failures and on a few successes (production
deploys); anything noisier trains people to mute the chat.
