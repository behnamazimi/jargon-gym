-- After the phase 5c contract: the old narration and price objects are gone,
-- the balance functions keep their grants and their three columns, and
-- audio_jobs is intact. Read-only checks:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/ai_contract.sql
begin;

do $$
begin
  -- Dropped tables and columns.
  assert to_regclass('public.term_narrations') is null, 'term_narrations is gone';
  assert to_regclass('public.narration_settings') is null, 'narration_settings is gone';
  assert to_regclass('public.narration_allowlist') is null, 'narration_allowlist is gone';
  assert not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stories' and column_name like 'narration\_%'
  ), 'stories has no narration columns';
  assert not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ai_credit_settings'
      and column_name in ('quiz_credits_per_question', 'story_credits_per_term')
  ), 'the old price columns are gone';

  -- Dropped functions.
  assert not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'claim_term_narration', 'has_narration_access', 'backfill_audio_jobs',
        'mirror_term_narration', 'mirror_term_narration_delete',
        'mirror_story_narration', 'mirror_story_narration_delete',
        'mirror_narration_settings', 'mirror_narration_allowlist_insert',
        'mirror_narration_allowlist_delete', 'sync_narration_features_from_old_tables',
        'sync_ai_feature_costs'
      )
  ), 'the old narration and price functions are gone';

  -- What stays.
  assert to_regclass('public.audio_jobs') is not null and to_regclass('public.narration_sync_jobs') is not null;
  assert exists (select 1 from pg_proc where proname = 'claim_audio_job');
  assert exists (select 1 from pg_proc where proname = 'has_feature_access');
  assert exists (select 1 from pg_trigger where tgname = 'terms_audio_job_delete');
  assert exists (select 1 from pg_trigger where tgname = 'stories_audio_job_delete');

  -- The balance functions: three columns, and the same grants as before.
  assert (
    select count(*) from pg_proc p, unnest(p.proargnames) as a(name)
    where p.proname = 'my_ai_credit_state' and a.name in ('enabled', 'total', 'remaining')
  ) = 3, 'my_ai_credit_state returns enabled, total and remaining';
  assert (
    select pg_get_function_result(p.oid) from pg_proc p where p.proname = 'my_ai_credit_state'
  ) = 'TABLE(enabled boolean, total integer, remaining integer)';
  assert has_function_privilege('authenticated', 'public.my_ai_credit_state()', 'execute');
  assert not has_function_privilege('anon', 'public.my_ai_credit_state()', 'execute');
  assert has_function_privilege('service_role', 'public.ai_credit_balance(uuid)', 'execute');
  assert not has_function_privilege('authenticated', 'public.ai_credit_balance(uuid)', 'execute');
  assert not has_function_privilege('anon', 'public.ai_credit_balance(uuid)', 'execute');
  assert not has_function_privilege('anon', 'public.admin_ai_credit_summary()', 'execute');

  -- Admins can write a price, and only the price.
  assert has_column_privilege('authenticated', 'public.ai_feature_settings', 'credit_cost', 'update');
  assert not has_column_privilege('authenticated', 'public.ai_feature_settings', 'billable', 'update');
end;
$$;

rollback;
\echo ai_contract.sql: ok
