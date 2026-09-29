# Narration sync cron

Start on the admin narration page kicks the first audio-generation wave
immediately. A collection that does not finish in that ~45 second invoke
needs a Supabase Dashboard cron job to start the next wave and to recover
after a deploy. Without that job, use **Resume** on the admin page.

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
`https://jargon-gym.vercel.app`, and at least one of these secrets:

- `AI_INTERNAL_SECRET`: the secret for this route (the app's own kick and the
  cron job below).
- `TELEGRAM_INTERNAL_SECRET`: the older secret this route used to share with
  Telegram. It is still accepted here so the cron job can be switched over
  without a gap.

Only this route accepts `AI_INTERNAL_SECRET`. The Telegram routes and the
Telegram Edge Functions keep using `TELEGRAM_INTERNAL_SECRET`, and nothing
about them changes.

### Switching the cron job to the new secret

1. Add `AI_INTERNAL_SECRET` (a new random value) on Vercel and deploy. The app
   now calls its own route with it, and both secrets are accepted.
2. In the Dashboard cron job, change the header to
   `Authorization: Bearer <AI_INTERNAL_SECRET>`. The cron job header is the
   only value to change; the Edge Functions are not involved.
3. Open the admin Narration page. It shows when the cron job last called and
   which secret it used. Once it says "It uses the AI secret", the old secret
   is no longer needed for narration.
4. A later release removes the old secret from this route. Do not remove
   `TELEGRAM_INTERNAL_SECRET` itself: Telegram still uses it.

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
   - **Header:** `Authorization: Bearer <AI_INTERNAL_SECRET>` (the old
     `TELEGRAM_INTERNAL_SECRET` still works while you switch over)
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

**Advanced (SQL + Vault):** If you prefer a SQL-defined job with secrets in
Vault, see [`supabase/narration-cron-setup.sql`](../../supabase/narration-cron-setup.sql).
Vault lives under **Project Settings → Configuration → Vault**.

## Local development

Start and Resume call the internal route from the Next.js server, so you can
fill a collection without Dashboard cron. To mimic a cron tick:

```bash
curl -X POST http://localhost:3000/api/internal/narration/sync \
  -H "Authorization: Bearer $AI_INTERNAL_SECRET"
```

## Next steps

Open **/admin/narration**, start a collection with missing audio, and confirm
the progress row advances. If a run sits in **running** after a deploy, click
**Resume** or wait for the next cron tick.
