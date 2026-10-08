-- Retention for operational rows, and a size read for the admin health page.

-- Only ai_usage_events needs a recent window (daily caps and the admin's last
-- 24 hours), and finished sync jobs only need their counts. The function owns
-- the deletes because service_role has no delete grant on these tables.
create function public.prune_operational_rows()
returns table (what text, affected bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
begin
  delete from public.ai_usage_events
  where created_at < now() - interval '90 days';
  get diagnostics v_count = row_count;
  what := 'ai_usage_events deleted';
  affected := v_count;
  return next;

  delete from public.narration_sync_jobs
  where status in ('completed', 'failed', 'cancelled')
    and coalesce(finished_at, updated_at) < now() - interval '90 days';
  get diagnostics v_count = row_count;
  what := 'narration_sync_jobs deleted';
  affected := v_count;
  return next;

  update public.narration_sync_jobs
  set term_ids = '{}'
  where status in ('completed', 'failed', 'cancelled')
    and cardinality(term_ids) > 0;
  get diagnostics v_count = row_count;
  what := 'narration_sync_jobs term lists cleared';
  affected := v_count;
  return next;
end;
$$;

revoke all on function public.prune_operational_rows() from public, anon, authenticated;
grant execute on function public.prune_operational_rows() to service_role;

-- Row and size figures for the tables that grow with use. Read-only.
create function public.admin_table_sizes()
returns table (table_name text, row_estimate bigint, total_bytes bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can read table sizes';
  end if;

  return query
  select
    c.relname::text,
    coalesce(s.n_live_tup, 0)::bigint,
    pg_total_relation_size(c.oid)
  from pg_class c
  left join pg_stat_user_tables s on s.relid = c.oid
  where c.relnamespace = 'public'::regnamespace
    and c.relkind = 'r'
    and c.relname in (
      'review_events', 'review_state', 'audio_jobs', 'ai_usage_events',
      'narration_sync_jobs', 'stories', 'admin_audit_log', 'terms'
    )
  order by pg_total_relation_size(c.oid) desc;
end;
$$;

revoke all on function public.admin_table_sizes() from public, anon;
grant execute on function public.admin_table_sizes() to authenticated;
