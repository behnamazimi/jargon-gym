# Telegram bot setup

## 1. Create the bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Run `/newbot` and follow the prompts.
3. Save the **bot token** and **username** (without `@`).

## 2. Configure secrets

### Next.js (`.env.local` / Vercel)

```
TELEGRAM_BOT_USERNAME=YourBotName
APP_BASE_URL=https://your-jargon-gym-domain.com
```

`TELEGRAM_BOT_TOKEN` is only required in Supabase Edge Function secrets unless you add server-side Telegram calls in Next.js later.

### Supabase Edge Functions

```bash
supabase secrets set \
  TELEGRAM_BOT_TOKEN=... \
  TELEGRAM_WEBHOOK_SECRET=... \
  TELEGRAM_CRON_SECRET=... \
  APP_BASE_URL=https://your-jargon-gym-domain.com
```

Generate random values for `TELEGRAM_WEBHOOK_SECRET` and `TELEGRAM_CRON_SECRET`.

Edge Functions also receive `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically when deployed.

## 3. Deploy Edge Functions

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

**Optional:** On-demand review works without cron (`/next` in Telegram). Scheduled reminders only run after this job is active.

**Advanced (SQL + Vault):** If you prefer a SQL-defined job with secrets in Vault, see [`supabase/telegram-cron-setup.sql`](../telegram-cron-setup.sql). Vault lives under **Project Settings → Configuration → Vault**.

### Local development

```bash
supabase db reset   # applies migration
supabase functions serve telegram-webhook telegram-send-due
# expose webhook with ngrok/cloudflared, then setWebhook to the tunnel URL
```

To test the send-due function manually, POST to its local URL with the cron secret header (or trigger it from the Dashboard cron job against your deployed project).

## 6. User flow

1. User opens **Settings** in Jargon Gym → **Generate Telegram link**.
2. User taps the link → Telegram opens the bot → **Start**.
3. User runs `/next` or waits for scheduled reminders based on cadence.

Disconnect clears the link in settings; the bot replies with connect instructions for unlinked chats.
