-- Run manually in the Supabase SQL Editor after Next.js is deployed.
-- Store secrets in Vault first, then schedule the narration sync kick
-- every minute.
--
--   select vault.create_secret('https://your-app-host', 'app_base_url');
--   select vault.create_secret('YOUR_TELEGRAM_INTERNAL_SECRET', 'telegram_internal_secret');

select cron.schedule(
  'narration-sync',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_base_url')
      || '/api/internal/narration/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'telegram_internal_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
