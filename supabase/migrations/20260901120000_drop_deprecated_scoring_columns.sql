-- Drop the pre-TRACE scoring columns kept (deprecated, not backfilled) by
-- 20260831230000_trace_engine.sql as a safety margin during that rewrite.
-- TRACE is now verified working end-to-end; nothing reads or writes these.

alter table public.review_state
  drop column review_streak,
  drop column quiz_streak,
  drop column last_fail_at,
  drop column last_fail_source,
  drop column review_fail_count,
  drop column quiz_fail_count;

drop type public.review_fail_source;
