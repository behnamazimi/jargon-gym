-- One-off. Run in the Supabase SQL Editor BEFORE the cron_from_vault migration.
--
-- The narration-sync and telegram-send-due jobs were created by hand with
-- their bearer token written into cron.job. This copies each token (and the
-- two base URLs) into Vault under new names, without printing any value, so
-- the migration can schedule the jobs from Vault. Safe to run twice.
--
-- It does not delete anything. After the migration has run and both jobs have
-- ticked, the older Vault entries listed at the end can be removed by hand.

do $$
declare
  v_narration text;
  v_telegram text;
  v_ai_secret text;
  v_telegram_secret text;
  v_app_url text;
  v_project_url text;
begin
  select command into v_narration from cron.job where jobname = 'narration-sync';
  select command into v_telegram from cron.job where jobname = 'telegram-send-due';

  if v_narration is null or v_telegram is null then
    raise exception 'Expected both the narration-sync and telegram-send-due jobs in cron.job.';
  end if;

  v_ai_secret := (regexp_match(v_narration, 'Bearer ([^"\s]+)'))[1];
  v_app_url := (regexp_match(v_narration, 'url\s*:=\s*''(https://[^/'']+)'))[1];
  v_telegram_secret := (regexp_match(v_telegram, 'Bearer ([^"\s]+)'))[1];
  v_project_url := (regexp_match(v_telegram, 'url\s*:=\s*''(https://[^/'']+)'))[1];

  if v_ai_secret is null or v_app_url is null or v_telegram_secret is null or v_project_url is null then
    if v_narration like '%vault.decrypted_secrets%' and v_telegram like '%vault.decrypted_secrets%' then
      raise notice 'Both jobs already read from Vault; nothing to copy.';
      return;
    end if;
    raise exception 'Could not read a token or URL from the current cron commands.';
  end if;

  if not exists (select 1 from vault.secrets where name = 'cron_ai_internal_secret') then
    perform vault.create_secret(v_ai_secret, 'cron_ai_internal_secret', 'Bearer token for the narration-sync cron job');
  end if;
  if not exists (select 1 from vault.secrets where name = 'cron_app_url') then
    perform vault.create_secret(v_app_url, 'cron_app_url', 'Base URL of the app, used by the narration-sync cron job');
  end if;
  if not exists (select 1 from vault.secrets where name = 'cron_telegram_secret') then
    perform vault.create_secret(v_telegram_secret, 'cron_telegram_secret', 'Bearer token for the telegram-send-due cron job');
  end if;
  if not exists (select 1 from vault.secrets where name = 'cron_project_url') then
    perform vault.create_secret(v_project_url, 'cron_project_url', 'Supabase project URL, used by the telegram-send-due cron job');
  end if;
end;
$$;

-- Names only. The cron_* entries are the ones the jobs use; the rest are
-- older entries nothing reads any more.
select name, created_at
from vault.secrets
order by (name like 'cron\_%') desc, name;
