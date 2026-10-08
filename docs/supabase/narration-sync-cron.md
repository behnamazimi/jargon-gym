# Narration sync cron

Start on the admin narration page kicks the first audio-generation wave
immediately. A collection that does not finish in that ~45 second invoke
needs a Supabase cron job to start the next wave and to recover
after a deploy. Without that job, use **Resume** on the admin page. In this
project the job is scheduled by a migration that reads its URL and secret from
Vault; the Dashboard steps below are for a project without it.

This cron talks to Next.js directly. Telegram due-term sends go through an
Edge Function because they must call the Bot API; narration already runs
ElevenLabs and S3 in the Next.js app.

## Architecture

Start and Resume POST the internal Next.js route. Dashboard cron POSTs the
same route every minute when a job still has terms left.

```
Admin Start / Resume → after() POST /api/internal/narration/sync
Supabase Cron (every minute) → POST APP_BASE_URL/api/internal/narration/sync
                             → processNarrationSyncBatch (parallel waves)
                             → ElevenLabs + S3
```

The route returns HTTP 202 right away. Generation runs after the response so
the Dashboard HTTP client does not wait out the function time limit. If a
lease is still held, the next tick claims nothing and returns.

## 1. Confirm Next.js secrets

`APP_BASE_URL` must be set on Vercel to the public Next.js origin, for example
`https://lobyas.com`, and so must `AI_INTERNAL_SECRET`: the secret
for this route (the app's own kick and the cron job below). Use a random value
that differs from `TELEGRAM_INTERNAL_SECRET`. This route accepts only
`AI_INTERNAL_SECRET`; a call with any other token gets 401. The Telegram routes
and Edge Functions keep using `TELEGRAM_INTERNAL_SECRET`.

To change the secret later, set the new value on Vercel, deploy, and change the
cron job header at the same time. Calls made in between return 401 (the admin
page warns, and **Resume** works). The scheduled job reads the header from the
Vault secret `cron_ai_internal_secret`; change it there with
`select vault.update_secret(id, 'NEW_VALUE') from vault.secrets where name = 'cron_ai_internal_secret';`.

If the cron job stops calling (a wrong header returns 401), the admin page
warns when a sync needs it and none was seen in the last 5 minutes.

## 2. Create the Dashboard job

Create the cron job in the Supabase Dashboard. You do not need SQL or Vault
for this path.

1. Open **Integrations → Cron → Jobs** in your project:
   `https://supabase.com/dashboard/project/<your-project-ref>/integrations/cron/jobs`
2. Click **Create job**.
3. Configure:
   - **Name:** `narration-sync`
   - **Schedule:** `* * * * *` (every minute)
   - **Type:** **HTTP Request**
4. Set the HTTP request:
   - **URL:** `https://<your-app-host>/api/internal/narration/sync`
   - **Method:** `POST`
   - **Header:** `Authorization: Bearer <AI_INTERNAL_SECRET>`
   - **Body:** `{}`

Use the **History** tab on the job to confirm runs return 202 after saving.
Idle ticks are expected when no sync is running.

<!-- prettier-ignore -->
> [!IMPORTANT]
> A job that outlives one invoke stalls until this cron runs, or until you
> click **Resume**. Create the Dashboard job in production; Start alone is\
> not enough for a large collection.

**Optional:** Local Start still kicks the first wave. Cron does not fire
against `localhost` unless you point the job at a tunnel.

**SQL + Vault:** the job this project runs is described in
[`supabase/narration-cron-setup.sql`](../../supabase/narration-cron-setup.sql).
Vault lives under **Project Settings → Configuration → Vault**. To pause
syncing between runs, switch the job off in **Integrations → Cron**; the
scheduling migration keeps that state.

## Local development

Start and Resume call the internal route from the Next.js server, so you can
fill a collection without Dashboard cron. To mimic a cron tick:

```bash
curl -X POST http://localhost:3000/api/internal/narration/sync \
  -H "Authorization: Bearer $AI_INTERNAL_SECRET"
```

## Next steps

Open a collection's page (**/admin/collections/[id]**), start its sync for missing audio, and confirm
the progress row advances. If a run sits in **running** after a deploy, click
**Resume** or wait for the next cron tick.
