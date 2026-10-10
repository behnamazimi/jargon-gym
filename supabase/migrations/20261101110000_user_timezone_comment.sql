-- The timezone column's comment pointed at lib/smart-queue/weights.ts, which
-- no longer exists, and didn't mention the Mastery page's today counts.

comment on column public.user_settings.timezone is
  'IANA tz, client-detected via Intl.DateTimeFormat and silently saved on login. Sets the day boundary for the streak (bump_streak, get_streak_history) and the Mastery page''s today counts. Null for Telegram-only users or before the first web login; both then fall back to ''Europe/Amsterdam'', STUDY_TIMEZONE in lib/trace/local-day.ts (keep the two in sync by hand).';
