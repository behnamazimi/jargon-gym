# Telegram bot setup

## Architecture

```
Telegram → Edge (telegram-webhook / telegram-send-due)
         → POST APP_BASE_URL/api/internal/telegram/*
         → lib/telegram/flows + shared domain core (smart-queue, review-outcome, …)
         → Edge executes returned TelegramAction DTOs
```

Edge Functions are **transport proxies** only (verify secrets, dismiss keyboards, call Bot API). All business logic lives in Next.js.

## 1. Create the bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Run `/newbot` and follow the prompts.
3. Save the **bot token** and **username** (without `@`).

## 2. Configure secrets

Generate random values for `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_CRON_SECRET`, and `TELEGRAM_INTERNAL_SECRET`.

### Next.js (`.env.local` / Vercel)

```
TELEGRAM_BOT_USERNAME=YourBotName
TELEGRAM_INTERNAL_SECRET=...
APP_BASE_URL=https://your-jargon-gym-domain.com
SUPABASE_SERVICE_ROLE_KEY=...
```

`APP_BASE_URL` must be the public URL of the Next.js app — Edge Functions call it for every bot update. Locally, use a tunnel (ngrok/cloudflared) pointed at `next dev`.

### Supabase Edge Functions

```bash
supabase secrets set \
  TELEGRAM_BOT_TOKEN=... \
  TELEGRAM_WEBHOOK_SECRET=... \
  TELEGRAM_CRON_SECRET=... \
  TELEGRAM_INTERNAL_SECRET=... \
  APP_BASE_URL=https://your-jargon-gym-domain.com
```

`TELEGRAM_INTERNAL_SECRET` must match Next.js. Edge Functions also receive `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically when deployed (still used for inline-keyboard tracking).

## 3. Deploy Edge Functions

Deploy **Next.js first** (so `/api/internal/telegram/*` exists), then:

```bash
supabase functions deploy telegram-webhook
supabase functions deploy telegram-send-due
```

## 4. Register the webhook

Replace placeholders with your values:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://<your-project-ref>.supabase.co/functions/v1/telegram-webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## 5. Schedule due-term sends

Create the cron job in the Supabase Dashboard — no SQL or Vault required.

1. Open **Integrations → Cron → Jobs** in your project:
   `https://supabase.com/dashboard/project/<your-project-ref>/integrations/cron/jobs`
2. Click **Create job**.
3. Configure:
   - **Name:** `telegram-send-due`
   - **Schedule:** `*/15 * * * *` (every 15 minutes)
   - **Type:** **HTTP Request**
4. Set the HTTP request:
   - **URL:** `https://<your-project-ref>.supabase.co/functions/v1/telegram-send-due`
   - **Method:** `POST`
   - **Header:** `Authorization: Bearer <TELEGRAM_CRON_SECRET>` (same value as in step 2)
   - **Body:** `{}`

Use the **History** tab on the job to confirm runs succeed after saving.

**Optional:** On-demand review works without cron (`/read` in Telegram). Scheduled reminders only run after this job is active.

**Advanced (SQL + Vault):** If you prefer a SQL-defined job with secrets in Vault, see [`supabase/telegram-cron-setup.sql`](../telegram-cron-setup.sql). Vault lives under **Project Settings → Configuration → Vault**.

### Local development

```bash
# Terminal 1 — Next.js (must be reachable as APP_BASE_URL)
pnpm dev

# Terminal 2 — Edge Functions
supabase functions serve telegram-webhook telegram-send-due

# Expose Next + optionally the webhook with tunnels, then setWebhook
```

Point Edge `APP_BASE_URL` at your Next tunnel. To test send-due manually, POST to its local URL with the cron secret header.

### Manual test matrix

After deploy, verify:

1. Settings → Generate Telegram link → `/start` welcomes
2. `/read` delivers a term; Mark known / Read next buttons work
3. `/stat` shows collection stats
4. `/quiz` guided setup + answer flow + summary
5. Cadence cron (`telegram-send-due`) sends or caught-up
6. Web quiz + review still record outcomes correctly

## 6. User flow

1. User opens **Settings** in Jargon Gym → **Generate Telegram link**.
2. User taps the link → Telegram opens the bot → **Start**.
3. User runs `/read` or waits for scheduled reminders based on cadence.

Disconnect clears the link in settings; the bot replies with connect instructions for unlinked chats.
