-- Schedules the three cron jobs from the repo. Both HTTP jobs read their URL
-- and secret from Vault, so no secret sits in cron.job. Run
-- supabase/ops/cron-secrets-to-vault.sql first: without the four Vault secrets
-- the two HTTP jobs are left as they are.
--
-- cron.schedule() on an existing name turns the job back on, so a job someone
-- switched off by hand (narration-sync, between syncs) keeps its state.
-- Skipped where pg_cron isn't installed (local development, CI).

do $$
declare
  v_active boolean;
  v_job bigint;
  v_vault_ready boolean;
begin
  if to_regnamespace('cron') is null or to_regnamespace('vault') is null then
    raise notice 'pg_cron or Vault is not available; cron jobs not scheduled.';
    return;
  end if;

  perform cron.schedule(
    'prune-operational-rows',
    '15 3 * * *',
    'select public.prune_operational_rows();'
  );

  execute $q$
    select count(*) = 4 from vault.decrypted_secrets
    where name in ('cron_app_url', 'cron_ai_internal_secret', 'cron_project_url', 'cron_telegram_secret')
  $q$ into v_vault_ready;

  if not v_vault_ready then
    raise notice 'Vault secrets for the cron jobs are missing; narration-sync and telegram-send-due left as they are.';
    return;
  end if;

  select active into v_active from cron.job where jobname = 'narration-sync';
  perform cron.schedule(
    'narration-sync',
    '* * * * *',
    $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_app_url')
        || '/api/internal/narration/sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_ai_internal_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 1000
    );
    $job$
  );
  if v_active is not null then
    select jobid into v_job from cron.job where jobname = 'narration-sync';
    perform cron.alter_job(v_job, active := v_active);
  end if;

  select active into v_active from cron.job where jobname = 'telegram-send-due';
  perform cron.schedule(
    'telegram-send-due',
    '0 */3 * * *',
    $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_project_url')
        || '/functions/v1/telegram-send-due',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_telegram_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 5000
    );
    $job$
  );
  if v_active is not null then
    select jobid into v_job from cron.job where jobname = 'telegram-send-due';
    perform cron.alter_job(v_job, active := v_active);
  end if;
end;
$$;
