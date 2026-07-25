-- Run manually in Supabase SQL Editor after deploying Edge Functions.
-- Store secrets in Vault first, then schedule the send-due job every 15 minutes.
--
--   select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
--   select vault.create_secret('YOUR_TELEGRAM_CRON_SECRET', 'telegram_cron_secret');

select cron.schedule(
  'telegram-send-due',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/telegram-send-due',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'telegram_cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
